// Scheduled news fetcher — replaces Hangfire's periodic RSS pull.
// Triggered by the Cron Trigger declared in wrangler.toml, or manually via
// POST /api/v1/newssources/:id/fetch.

import type { Env } from '../lib/env';
import { parseFeed, canonicalize, type FeedItem } from '../lib/rss';
import { loadDedupContext, isDuplicate, findClusterPrimary, tokenizeTitle, clusterTokensFromTitle } from '../lib/dedup';
import { categorize } from '../lib/categorizer';
import { uniqueSlug } from '../lib/slug';
import { uploadFromUrl } from '../lib/cloudinary';
import { cacheInvalidatePrefix } from '../lib/cache';
import { nowIso } from '../lib/db';
import { extractArticleForSource, extractFromFeedHtml } from '../lib/article-extractor';
import { isSpaSource, SPA_SOURCE_SLUGS, normalizeArticleUrl, BODY_FETCH_HEADERS } from '../lib/source-selectors';
import { logInsert, writeLog } from '../lib/logger';

type SourceRow = {
  id: number;
  name: string;
  slug: string;
  base_url: string;
  fetch_method: number;
  rss_feed_url: string | null;
  api_endpoint: string | null;
  api_key: string | null;
  fetch_interval_minutes: number;
  last_fetched_at: string | null;
  consecutive_failures: number;
  circuit_breaker_threshold: number;
};

const SOURCE_COLUMNS = `id, name, slug, base_url, fetch_method, rss_feed_url, api_endpoint, api_key,
  fetch_interval_minutes, last_fetched_at, consecutive_failures, circuit_breaker_threshold`;

const MAX_SOURCES_PER_RUN = 5;      // process the few stalest sources each run; */5 cron covers the rest
const MAX_ARTICLES_PER_SOURCE = 15;

// A 200-but-zero-items response is treated as a soft (non-failure) signal until it
// recurs this many runs in a row — only THEN does it count as a real failure that can
// trip the circuit breaker. This keeps a transient empty cycle or one-off parser drift
// from degrading an otherwise-healthy source.
const ZERO_ITEM_FAILURE_AFTER = 4;

// Cloudflare free plan caps each Worker invocation at TWO independent budgets:
//
//  - SUBREQUEST_BUDGET: the 50-subrequest/invocation cap. EVERY outbound call counts —
//    feed fetch, article-page fetch, Cloudinary upload, AND every D1 query / KV op. To
//    stay well clear of the cap we (a) batch D1 work hard (dedup = 3 reads/source,
//    inserts + bookkeeping = 1 batch each) and (b) decrement this budget on each call.
//  - EXTRACTION_BUDGET: a proxy for the 10ms ACTIVE-CPU cap. A full article-page
//    HTMLRewriter/JSON-LD parse is the dominant CPU cost, so we cap how many page
//    extractions one invocation performs. Bodies that already arrive in the feed
//    (<content:encoded>) are parsed with a cheap regex and do NOT spend this budget.
const SUBREQUEST_BUDGET = 45;
const EXTRACTION_BUDGET = 6;
const MIN_SUBREQUEST_RESERVE = 4;   // never spend optional subrequests (bodies/images) below this floor

// Dedicated body-backfill job (its own cron + invocation = its own fresh budget).
// Kept at a CPU-safe extraction count: a scheduled invocation still has the 10ms
// active-CPU cap, and each extraction is an HTMLRewriter/JSON-LD parse. 8 is a bit
// above the */5 fetch's 6 (this invocation does nothing else), but well clear of
// the count that previously tripped exceededResources.
const BACKFILL_SUBREQUEST_BUDGET = 45;
const BACKFILL_EXTRACTION_BUDGET = 8;

// Hard ceiling for a fetched article page. Applied to the Content-Length hint when
// present AND to the materialized response text (chunked responses omit Content-Length),
// so an oversized streamed page can't blow past the budget before extraction.
const MAX_BODY_FETCH_BYTES = 6_000_000;

type Budget = { remaining: number; extractions: number };

export async function runScheduledFetch(env: Env['Bindings']): Promise<{ sourcesProcessed: number; articlesNew: number }> {
  // Stalest-fetched active sources first (round-robin coverage).
  const sources = await env.DB.prepare(`
    SELECT ${SOURCE_COLUMNS}
    FROM news_sources
    WHERE is_active = 1 AND health_status IN (0, 1)
    ORDER BY COALESCE(last_fetched_at, '1970-01-01') ASC
    LIMIT ?
  `).bind(MAX_SOURCES_PER_RUN).all<SourceRow>();

  // Keep only sources whose fetch interval has elapsed.
  const dueSources = (sources.results ?? []).filter((source) => {
    const dueAt = source.last_fetched_at
      ? new Date(source.last_fetched_at).getTime() + source.fetch_interval_minutes * 60 * 1000
      : 0;
    return dueAt <= Date.now();
  });

  let totalNew = 0;
  let processed = 0;
  const budget: Budget = { remaining: SUBREQUEST_BUDGET, extractions: EXTRACTION_BUDGET };

  for (let i = 0; i < dueSources.length; i++) {
    // Fair-share the extraction budget: reserve at least one extraction for each
    // source still to come, so the first busy source can't starve the rest.
    const laterSources = dueSources.length - 1 - i;
    const extractionCap = Math.max(1, budget.extractions - laterSources);

    const result = await fetchOneSource(env, dueSources[i], budget, extractionCap);
    totalNew += result.newCount;
    processed++;
  }

  // NOTE: NULL-body backfill is no longer done here — it runs as an independent
  // cron (runBodyBackfill) with its own dedicated budget, so a busy fetch run
  // can't starve it. This loop is pure ingestion + inline body for NEW items.
  if (totalNew > 0) await cacheInvalidatePrefix(env.CACHE_KV, 'news:');
  return { sourcesProcessed: processed, articlesNew: totalNew };
}

/**
 * Independent body-backfill job — runs on its own cron (every 30 min) in a
 * separate invocation, so it gets a FULL fresh subrequest + CPU budget dedicated
 * to filling articles that were inserted summary-only (content IS NULL). Visits
 * each article's source_url, extracts the body, and fills it. Processes today's
 * articles first, then the rest of the last 3 days while budget remains.
 */
export async function runBodyBackfill(env: Env['Bindings']): Promise<{ filled: number }> {
  const budget: Budget = { remaining: BACKFILL_SUBREQUEST_BUDGET, extractions: BACKFILL_EXTRACTION_BUDGET };
  const filled = await backfillRecentBodies(env, budget, BACKFILL_EXTRACTION_BUDGET);
  if (filled > 0) await cacheInvalidatePrefix(env.CACHE_KV, 'news:');
  return { filled };
}

/**
 * Best-effort backfill: re-fetch + extract bodies for recent NULL-content articles
 * using whatever budget the main loop left behind. A 6-hour per-row cooldown (via
 * updated_at) stops a permanently-unextractable URL from being retried every run.
 */
async function backfillRecentBodies(env: Env['Bindings'], budget: Budget, maxRowsToScan = 10): Promise<number> {
  if (budget.remaining <= MIN_SUBREQUEST_RESERVE || budget.extractions <= 0) return 0;
  const recentCutoffIso = new Date(Date.now() - 3 * 86400000).toISOString();
  const retryCooldownIso = new Date(Date.now() - 6 * 3600000).toISOString();
  const limit = Math.min(budget.remaining - MIN_SUBREQUEST_RESERVE, budget.extractions, maxRowsToScan);

  // Exclude SPA sources (can't be extracted); skip the clause entirely when the list
  // is empty since `NOT IN ()` is a SQL syntax error.
  const spaFilter = SPA_SOURCE_SLUGS.length
    ? `AND s.slug NOT IN (${SPA_SOURCE_SLUGS.map(() => '?').join(',')})`
    : '';
  const rows = await env.DB.prepare(`
    SELECT a.id, a.source_url, s.slug AS source_slug, s.base_url AS source_base_url
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    WHERE a.content IS NULL AND a.is_active = 1
      AND a.source_url IS NOT NULL AND a.source_url <> ''
      ${spaFilter}
      AND COALESCE(a.published_at, a.fetched_at) >= ?
      AND (a.updated_at IS NULL OR a.updated_at < ?)
    ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
    LIMIT ?
  `).bind(...SPA_SOURCE_SLUGS, recentCutoffIso, retryCooldownIso, limit)
    .all<{ id: number; source_url: string; source_slug: string; source_base_url: string }>();

  let updated = 0;
  for (const article of rows.results ?? []) {
    if (budget.remaining <= MIN_SUBREQUEST_RESERVE - 2 || budget.extractions <= 0) break;
    budget.remaining--;
    budget.extractions--;
    const { body, reason } = await fetchArticleBody(article.source_url, article.source_slug, article.source_base_url);
    const now = nowIso();
    if (body) {
      await env.DB.prepare('UPDATE news_articles SET content = ?, plain_text = ?, updated_at = ? WHERE id = ?')
        .bind(body.contentHtml, body.plainText, now, article.id).run();
      updated++;
    } else {
      // Stamp updated_at so this row enters the retry cooldown instead of being
      // re-attempted (and burning budget) on every single run.
      await env.DB.prepare('UPDATE news_articles SET updated_at = ? WHERE id = ?').bind(now, article.id).run();
      // Surface the failure in the central log (extraction category).
      if (reason) {
        await writeLog(env, {
          category: 'extraction',
          level: 'warn',
          sourceSlug: article.source_slug,
          url: article.source_url,
          message: `Backfill extraction failed (${reason})`,
          error: reason,
        });
      }
    }
  }
  return updated;
}

/** Manually fetch a single source (called from POST /newssources/:id/fetch). */
export async function fetchSourceNow(env: Env['Bindings'], sourceId: number, jobId?: number): Promise<void> {
  const source = await env.DB.prepare(`SELECT ${SOURCE_COLUMNS} FROM news_sources WHERE id = ? LIMIT 1`)
    .bind(sourceId).first<SourceRow>();
  if (!source) return;

  if (jobId) {
    await env.DB.prepare('UPDATE source_fetch_jobs SET status = 1, started_at = ? WHERE id = ?')
      .bind(nowIso(), jobId).run();
  }

  // A manual single-source fetch runs in its own invocation with a fresh budget, so
  // it may use the whole extraction budget.
  const budget: Budget = { remaining: SUBREQUEST_BUDGET, extractions: EXTRACTION_BUDGET };
  const result = await fetchOneSource(env, source, budget, EXTRACTION_BUDGET);

  if (jobId) {
    await env.DB.prepare(
      `UPDATE source_fetch_jobs SET status = ?, finished_at = ?,
        articles_fetched = ?, new_articles = ?, updated_articles = ?,
        error_code = ?, error_summary = ?
       WHERE id = ?`
    ).bind(
      result.error ? 3 : 2,                  // 2=succeeded 3=failed
      nowIso(),
      result.totalCount,
      result.newCount,
      result.updatedCount,
      result.error ? 'fetch_failed' : null,
      result.error ?? null,
      jobId,
    ).run();
  }

  if (result.newCount > 0) await cacheInvalidatePrefix(env.CACHE_KV, 'news:');
}

type FetchResult = { totalCount: number; newCount: number; updatedCount: number; error?: string };
type ResolvedBody = { contentHtml: string; plainText: string; images: string[] } | null;

async function fetchOneSource(
  env: Env['Bindings'],
  source: SourceRow,
  budget: Budget,
  extractionCap: number
): Promise<FetchResult> {
  const startTime = Date.now();
  const feedUrl = source.fetch_method === 2 ? source.api_endpoint : source.rss_feed_url;
  if (!feedUrl) return { totalCount: 0, newCount: 0, updatedCount: 0, error: 'No URL configured' };

  // --- Fetch the feed -------------------------------------------------------
  let res: Response;
  try {
    budget.remaining--; // the feed fetch is one subrequest
    res = await fetch(feedUrl, { headers: { 'User-Agent': 'NewsPortalBot/1.0 (+https://news.xahabcse.me)' } });
  } catch (err: any) {
    return await recordFailure(env, source, budget, startTime, err.message ?? 'Network error');
  }
  if (res.ok === false) {
    return await recordFailure(env, source, budget, startTime, `HTTP ${res.status}`);
  }

  // --- Parse the feed -------------------------------------------------------
  let items: FeedItem[];
  try {
    items = source.fetch_method === 2 && source.slug === 'the-guardian'
      ? await parseGuardian(res)
      : parseFeed(await res.text());
  } catch (err: any) {
    return await recordFailure(env, source, budget, startTime, err.message ?? 'Parse error');
  }

  // A 200 response that yields zero items is usually transient (an empty cycle) or
  // parser drift, NOT a dead source. Don't bump the failure counter the way a real
  // network/HTTP/parse error does — that would let a single empty cycle, or a feed-
  // format tweak, drag a healthy source toward the circuit breaker. Only after
  // ZERO_ITEM_FAILURE_AFTER consecutive zero-item runs do we treat it as a failure.
  if (items.length === 0) {
    return await recordZeroItems(env, source, budget, startTime);
  }

  items = items.slice(0, MAX_ARTICLES_PER_SOURCE);

  // Category slug -> id map (one read per source).
  budget.remaining--;
  const cats = await env.DB.prepare('SELECT id, slug FROM categories WHERE is_active = 1').all<{ id: number; slug: string }>();
  const categoryIdBySlug = new Map(cats.results?.map((c) => [c.slug, c.id]));

  // --- Dedup (three D1 reads for the whole batch) ---------------------------
  const canonicalByItem = new Map<FeedItem, string>();
  for (const item of items) canonicalByItem.set(item, canonicalize(item.link));

  budget.remaining -= 3; // loadDedupContext does 3 reads (canonicals + source titles + global primaries)
  const dedupContext = await loadDedupContext(env, [...canonicalByItem.values()], source.id);
  // Accept items one at a time, folding each accepted item back into the context so
  // later items in THIS SAME batch dedup against it too. Without this, a feed that
  // lists the same story twice (different URLs, ~identical titles — common with
  // "UPDATED" reposts) would slip both past the DB-snapshot check and insert dupes.
  const newItems: FeedItem[] = [];
  for (const item of items) {
    const canonical = canonicalByItem.get(item)!;
    if (isDuplicate(dedupContext, canonical, item.title)) continue;
    newItems.push(item);
    dedupContext.existingCanonicalUrls.add(canonical);
    // recentSourceTitles holds precomputed token sets (tokenized once); push the same shape.
    dedupContext.recentSourceTitles.push(tokenizeTitle(item.title));
  }

  // --- Resolve bodies (feed body first, then bounded page extraction) -------
  const bodyByItem = new Map<FeedItem, ResolvedBody>();
  let feedBodyCount = 0;
  let extractedBodyCount = 0;
  const extractionFailures: { url: string; reason: string }[] = [];

  // 1) Cheap path: full body shipped in the feed (<content:encoded>). No budget cost.
  const needsPageFetch: FeedItem[] = [];
  for (const item of newItems) {
    const feedBody = item.contentEncoded ? extractFromFeedHtml(item.contentEncoded, source.base_url) : null;
    if (feedBody) {
      bodyByItem.set(item, feedBody);
      feedBodyCount++;
    } else {
      needsPageFetch.push(item);
    }
  }

  // 2) Expensive path: fetch the article page, gated by both budgets + per-source cap.
  const BODY_CONCURRENCY = 5;
  const skipPageFetch = isSpaSource(source.slug);
  for (let i = 0; i < needsPageFetch.length && !skipPageFetch; i += BODY_CONCURRENCY) {
    const batch = needsPageFetch.slice(i, i + BODY_CONCURRENCY);
    const bodies = await Promise.all(
      batch.map((item): Promise<{ body: ResolvedBody; reason: string | null }> => {
        if (
          budget.remaining <= MIN_SUBREQUEST_RESERVE ||
          budget.extractions <= 0 ||
          extractedBodyCount >= extractionCap
        ) {
          return Promise.resolve({ body: null, reason: null }); // not attempted, not a failure
        }
        budget.remaining--;
        budget.extractions--;
        extractedBodyCount++;
        return fetchArticleBody(item.link, source.slug, source.base_url);
      })
    );
    batch.forEach((item, batchIndex) => {
      bodyByItem.set(item, bodies[batchIndex].body);
      if (bodies[batchIndex].reason) extractionFailures.push({ url: item.link, reason: bodies[batchIndex].reason! });
    });
  }

  // --- Build rows (resolve images, slug, category) --------------------------
  const insertStatements: D1PreparedStatement[] = [];
  // In-batch cross-source clustering: findClusterPrimary only sees the DB snapshot, so two
  // same-story items arriving in THIS batch (from sources processed earlier in the same
  // cycle, or the same wire copy republished) would both pass as primaries. Fold each
  // accepted NEW primary into the dedup context under a sentinel id = -(insertIndex + 1)
  // so later same-batch items cluster onto it. The sentinel lands in `duplicate_of`; we
  // resolve it to the real inserted id after the batch (its row id isn't known until then).
  const sentinelDupByIndex = new Map<number, number>(); // insertIndex -> sentinel primary index
  for (let insertIndex = 0; insertIndex < newItems.length; insertIndex++) {
    const item = newItems[insertIndex];
    const canonical = canonicalByItem.get(item)!;
    const body = bodyByItem.get(item) ?? null;

    const categorySlug = categorize(`${item.title}\n${item.description ?? ''}\n${body?.plainText ?? ''}`);
    const categoryId = categoryIdBySlug.get(categorySlug) ?? null;

    // Deterministic slug — no per-insert DB probing; the UNIQUE index + INSERT OR
    // IGNORE handle the (astronomically rare) collision.
    const slug = uniqueSlug(item.title, canonical);

    // Lead image: prefer the RSS image, else the first body image. Lazy CDN upload,
    // best-effort, only while subrequest budget allows.
    let imageUrl = item.imageUrl ?? body?.images[0] ?? null;
    if (imageUrl && budget.remaining > MIN_SUBREQUEST_RESERVE) {
      budget.remaining--;
      const cdnUrl = await uploadFromUrl(env, imageUrl, `${source.slug}/${slug}`).catch(() => null);
      if (cdnUrl) imageUrl = cdnUrl;
    }

    // Cross-source dedup: if this is the same story as a recent primary (DB snapshot OR a
    // primary already accepted earlier in THIS batch), store it but point it at that
    // primary so browse feeds show one card.
    const matchedPrimaryId = findClusterPrimary(dedupContext, item.title);
    let dupOf: number | null = matchedPrimaryId;
    if (matchedPrimaryId !== null && matchedPrimaryId < 0) {
      // Matched an in-batch primary (sentinel) — defer to post-insert id resolution.
      sentinelDupByIndex.set(insertIndex, -matchedPrimaryId - 1);
      dupOf = null;
    } else if (matchedPrimaryId === null) {
      // New primary this batch — register it so later same-batch items can cluster onto it.
      const tokens = clusterTokensFromTitle(item.title);
      if (tokens.size >= 3) dedupContext.recentPrimaries.push({ id: -(insertIndex + 1), tokens });
    }

    const now = nowIso();
    insertStatements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO news_articles (title, slug, canonical_url, summary, content, plain_text, source_url,
           original_image_url, author, published_at, fetched_at,
           view_count, is_featured, source_id, category_id, duplicate_of, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 1)`
      ).bind(
        item.title.slice(0, 500),
        slug,
        canonical,
        item.description?.slice(0, 1000) ?? null,
        body?.contentHtml ?? null,
        body?.plainText ?? null,
        item.link,
        imageUrl ?? null,
        item.author,
        item.publishedAt?.toISOString() ?? null,
        now,
        source.id,
        categoryId,
        dupOf,
        now,
      )
    );
  }

  // --- Persist: one batch for inserts, one batch for bookkeeping ------------
  let newCount = 0;
  // Resolve in-batch sentinel duplicates to the real inserted primary ids; fold the
  // UPDATEs into the bookkeeping batch below so they cost no extra subrequest.
  const dupResolveStatements: D1PreparedStatement[] = [];
  if (insertStatements.length > 0) {
    budget.remaining--;
    const results = await env.DB.batch(insertStatements);
    newCount = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
    for (const [insertIndex, primaryInsertIndex] of sentinelDupByIndex) {
      const primaryId = results[primaryInsertIndex]?.meta?.last_row_id;
      const secondaryId = results[insertIndex]?.meta?.last_row_id;
      // Only resolve when BOTH rows actually inserted (changes === 1); an IGNORE'd row
      // has no fresh id, so leaving its duplicate_of NULL is the safe outcome.
      if (
        primaryId && results[primaryInsertIndex]?.meta?.changes === 1 &&
        secondaryId && results[insertIndex]?.meta?.changes === 1
      ) {
        dupResolveStatements.push(
          env.DB.prepare('UPDATE news_articles SET duplicate_of = ? WHERE id = ?').bind(primaryId, secondaryId)
        );
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const details = JSON.stringify({ feedBodies: feedBodyCount, extractedBodies: extractedBodyCount });
  budget.remaining--;
  await env.DB.batch([
    markSuccessStatement(env, source.id),
    logFetchStatement(env, source, durationMs, items.length, newCount, 0, true, null, details),
    ...dupResolveStatements,
    // Per-article extraction failures (capped) → central app_logs, same round-trip.
    ...extractionFailures.slice(0, 12).map((failure) =>
      logInsert(env, {
        category: 'extraction',
        level: 'warn',
        sourceSlug: source.slug,
        url: failure.url,
        message: `Body extraction failed (${failure.reason})`,
        error: failure.reason,
      })
    ),
  ]);

  return { totalCount: items.length, newCount, updatedCount: 0 };
}

/** Record a feed-level failure (network/HTTP/parse) + its log, in one batch. */
async function recordFailure(
  env: Env['Bindings'],
  source: SourceRow,
  budget: Budget,
  startTime: number,
  error: string
): Promise<FetchResult> {
  budget.remaining--;
  await env.DB.batch([
    markFailureStatement(env, source, error),
    logFetchStatement(env, source, Date.now() - startTime, 0, 0, 0, false, error, null),
  ]);
  return { totalCount: 0, newCount: 0, updatedCount: 0, error };
}

/**
 * Record a 200-but-zero-items response. Unlike recordFailure this does NOT immediately
 * bump consecutive_failures: a single empty cycle or transient parser drift should not
 * degrade a healthy source. We only escalate to a real failure once the source has
 * returned zero items ZERO_ITEM_FAILURE_AFTER runs in a row (counted from the recent
 * fetch logs). Otherwise we log it as a soft, non-failing zero-item run and leave the
 * source's health/breaker state untouched.
 */
async function recordZeroItems(
  env: Env['Bindings'],
  source: SourceRow,
  budget: Budget,
  startTime: number
): Promise<FetchResult> {
  // Look at the most recent prior runs: if the last (ZERO_ITEM_FAILURE_AFTER - 1) were
  // ALL zero-item runs too, this one makes the streak long enough to count as a failure.
  budget.remaining--;
  const recent = await env.DB.prepare(
    `SELECT articles_fetched FROM news_fetch_logs
     WHERE source_id = ? ORDER BY fetched_at DESC LIMIT ?`
  ).bind(source.id, ZERO_ITEM_FAILURE_AFTER - 1).all<{ articles_fetched: number }>();

  const priorRuns = recent.results ?? [];
  const streakTripsBreaker =
    priorRuns.length >= ZERO_ITEM_FAILURE_AFTER - 1 &&
    priorRuns.every((run) => (run.articles_fetched ?? 0) === 0);

  if (streakTripsBreaker) {
    return await recordFailure(env, source, budget, startTime, 'Feed returned no items');
  }

  // Soft signal: a non-failing zero-item run. Leave consecutive_failures/health as-is
  // (don't mark success either — there were no articles), but log it so the streak is
  // visible to the next run and to the log viewer.
  budget.remaining--;
  await env.DB.batch([
    env.DB.prepare('UPDATE news_sources SET last_fetched_at = ?, updated_at = ? WHERE id = ?')
      .bind(nowIso(), nowIso(), source.id),
    logFetchStatement(env, source, Date.now() - startTime, 0, 0, 0, true, 'Feed returned no items', null),
  ]);
  return { totalCount: 0, newCount: 0, updatedCount: 0 };
}

/**
 * Fetch an article's source page and extract its body. Fully best-effort: any
 * failure returns null so the caller keeps the RSS summary and never throws.
 */
async function fetchArticleBody(
  link: string,
  slug: string,
  baseUrl: string
): Promise<{ body: ResolvedBody; reason: string | null }> {
  if (isSpaSource(slug)) return { body: null, reason: null }; // intentionally skipped, not a failure
  link = normalizeArticleUrl(slug, link);
  try {
    // Full browser header set (+ same-origin Referer) so Cloudflare-fronted sites that
    // bot-block a bare-UA request (e.g. Bangla Tribune → 403) serve the real article HTML.
    let referer = baseUrl;
    try { referer = new URL(link).origin + '/'; } catch { /* keep baseUrl */ }
    const res = await fetch(link, {
      headers: { ...BODY_FETCH_HEADERS, Referer: referer },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok === false) return { body: null, reason: `http_${res.status}` };
    // Hard ceiling on download size. The extractor gates the HTMLRewriter path to
    // <=1.5MB; the cheap JSON-LD path tolerates larger pages (CNN ~4MB).
    //
    // Content-Length is only a pre-download hint and is ABSENT on chunked/streamed
    // responses, so don't rely on it to bound size: a missing header is treated as
    // "unknown" (we still download), and the real protection is the post-download
    // length cap on the materialized text below.
    const declaredLength = res.headers.get('content-length');
    if (declaredLength && parseInt(declaredLength, 10) > MAX_BODY_FETCH_BYTES) {
      return { body: null, reason: 'too_large' };
    }
    const html = await res.text();
    if (html.length > MAX_BODY_FETCH_BYTES) return { body: null, reason: 'too_large' };
    const result = await extractArticleForSource(html, slug, baseUrl);
    return { body: result, reason: result ? null : 'no_body' };
  } catch (err: any) {
    return { body: null, reason: err?.name === 'TimeoutError' ? 'timeout' : 'fetch_error' };
  }
}

async function parseGuardian(res: Response): Promise<FeedItem[]> {
  const json = (await res.json()) as any;
  const results = json?.response?.results ?? [];
  return results.map((result: any): FeedItem => {
    const published = result.webPublicationDate ? new Date(result.webPublicationDate) : null;
    return {
      title: result.webTitle ?? '',
      link: result.webUrl ?? '',
      description: result.fields?.trailText ?? null,
      contentEncoded: null,
      publishedAt: published && !isNaN(published.getTime()) ? published : null,
      author: result.fields?.byline ?? null,
      imageUrl: result.fields?.thumbnail ?? null,
      guid: result.id ?? null,
    };
  });
}

// --- D1 statement builders (so success/failure paths can batch their writes) ---

function markSuccessStatement(env: Env['Bindings'], sourceId: number) {
  const now = nowIso();
  return env.DB.prepare(
    `UPDATE news_sources SET
       last_fetched_at = ?, last_success_at = ?, consecutive_failures = 0,
       health_status = 0, last_error_code = NULL, last_error_message = NULL, updated_at = ?
     WHERE id = ?`
  ).bind(now, now, now, sourceId);
}

function markFailureStatement(env: Env['Bindings'], source: SourceRow, error: string) {
  const now = nowIso();
  const threshold = source.circuit_breaker_threshold ?? 5;
  // Increment via a SQL expression (not a stale in-memory snapshot) so a concurrent
  // manual fetch can't clobber the counter, and trip the breaker at the per-source
  // configured threshold.
  return env.DB.prepare(
    `UPDATE news_sources SET
       last_fetched_at = ?, last_failure_at = ?,
       consecutive_failures = consecutive_failures + 1,
       health_status = CASE WHEN consecutive_failures + 1 >= ? THEN 1 ELSE 0 END,
       last_error_code = 'fetch_failed', last_error_message = ?, updated_at = ?
     WHERE id = ?`
  ).bind(now, now, threshold, error.slice(0, 1000), now, source.id);
}

function logFetchStatement(
  env: Env['Bindings'],
  source: SourceRow,
  durationMs: number,
  fetched: number,
  newCount: number,
  updated: number,
  success: boolean,
  error: string | null,
  details: string | null
) {
  return env.DB.prepare(
    `INSERT INTO news_fetch_logs (id, source_id, source_name, fetched_at, duration_ms,
       articles_fetched, new_articles, updated_articles, success, error_message, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), source.id, source.name, nowIso(), durationMs, fetched, newCount, updated, success ? 1 : 0, error, details);
}
