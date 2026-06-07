// Scheduled news fetcher — replaces Hangfire's periodic RSS pull.
// Triggered by the Cron Trigger declared in wrangler.toml, or manually via
// POST /api/v1/newssources/:id/fetch.

import type { Env } from '../lib/env';
import { parseFeed, canonicalize, type FeedItem } from '../lib/rss';
import { loadDedupContext, isDuplicate } from '../lib/dedup';
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

// Cloudflare free plan caps each Worker invocation at TWO independent budgets:
//
//  - SUBREQUEST_BUDGET: the 50-subrequest/invocation cap. EVERY outbound call counts —
//    feed fetch, article-page fetch, Cloudinary upload, AND every D1 query / KV op. To
//    stay well clear of the cap we (a) batch D1 work hard (dedup = 2 reads/source,
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
  const dueSources = (sources.results ?? []).filter((s) => {
    const dueAt = s.last_fetched_at
      ? new Date(s.last_fetched_at).getTime() + s.fetch_interval_minutes * 60 * 1000
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
async function backfillRecentBodies(env: Env['Bindings'], budget: Budget, maxItems = 10): Promise<number> {
  if (budget.remaining <= MIN_SUBREQUEST_RESERVE || budget.extractions <= 0) return 0;
  const recentCutoffIso = new Date(Date.now() - 3 * 86400000).toISOString();
  const retryCooldownIso = new Date(Date.now() - 6 * 3600000).toISOString();
  const limit = Math.min(budget.remaining - MIN_SUBREQUEST_RESERVE, budget.extractions, maxItems);

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
  for (const a of rows.results ?? []) {
    if (budget.remaining <= MIN_SUBREQUEST_RESERVE - 2 || budget.extractions <= 0) break;
    budget.remaining--;
    budget.extractions--;
    const { body, reason } = await fetchArticleBody(a.source_url, a.source_slug, a.source_base_url);
    const now = nowIso();
    if (body) {
      await env.DB.prepare('UPDATE news_articles SET content = ?, plain_text = ?, updated_at = ? WHERE id = ?')
        .bind(body.contentHtml, body.plainText, now, a.id).run();
      updated++;
    } else {
      // Stamp updated_at so this row enters the retry cooldown instead of being
      // re-attempted (and burning budget) on every single run.
      await env.DB.prepare('UPDATE news_articles SET updated_at = ? WHERE id = ?').bind(now, a.id).run();
      // Surface the failure in the central log (extraction category).
      if (reason) {
        await writeLog(env, {
          category: 'extraction',
          level: 'warn',
          sourceSlug: a.source_slug,
          url: a.source_url,
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
  const s = await env.DB.prepare(`SELECT ${SOURCE_COLUMNS} FROM news_sources WHERE id = ? LIMIT 1`)
    .bind(sourceId).first<SourceRow>();
  if (!s) return;

  if (jobId) {
    await env.DB.prepare('UPDATE source_fetch_jobs SET status = 1, started_at = ? WHERE id = ?')
      .bind(nowIso(), jobId).run();
  }

  // A manual single-source fetch runs in its own invocation with a fresh budget, so
  // it may use the whole extraction budget.
  const budget: Budget = { remaining: SUBREQUEST_BUDGET, extractions: EXTRACTION_BUDGET };
  const result = await fetchOneSource(env, s, budget, EXTRACTION_BUDGET);

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
  s: SourceRow,
  budget: Budget,
  extractionCap: number
): Promise<FetchResult> {
  const startTime = Date.now();
  const feedUrl = s.fetch_method === 2 ? s.api_endpoint : s.rss_feed_url;
  if (!feedUrl) return { totalCount: 0, newCount: 0, updatedCount: 0, error: 'No URL configured' };

  // --- Fetch the feed -------------------------------------------------------
  let res: Response;
  try {
    budget.remaining--; // the feed fetch is one subrequest
    res = await fetch(feedUrl, { headers: { 'User-Agent': 'NewsPortalBot/1.0 (+https://news.xahabcse.me)' } });
  } catch (e: any) {
    return await recordFailure(env, s, budget, startTime, e.message ?? 'Network error');
  }
  if (res.ok === false) {
    return await recordFailure(env, s, budget, startTime, `HTTP ${res.status}`);
  }

  // --- Parse the feed -------------------------------------------------------
  let items: FeedItem[];
  try {
    items = s.fetch_method === 2 && s.slug === 'the-guardian'
      ? await parseGuardian(res)
      : parseFeed(await res.text());
  } catch (e: any) {
    return await recordFailure(env, s, budget, startTime, e.message ?? 'Parse error');
  }

  // A 200 response that yields zero items is a silently-broken feed — treat it as a
  // soft failure so the circuit breaker can eventually trip, rather than reporting
  // green health forever.
  if (items.length === 0) {
    return await recordFailure(env, s, budget, startTime, 'Feed returned no items');
  }

  items = items.slice(0, MAX_ARTICLES_PER_SOURCE);

  // Category slug -> id map (one read per source).
  budget.remaining--;
  const cats = await env.DB.prepare('SELECT id, slug FROM categories WHERE is_active = 1').all<{ id: number; slug: string }>();
  const categoryIdBySlug = new Map(cats.results?.map((c) => [c.slug, c.id]));

  // --- Dedup (two D1 reads for the whole batch) -----------------------------
  const canonicalByItem = new Map<FeedItem, string>();
  for (const item of items) canonicalByItem.set(item, canonicalize(item.link));

  budget.remaining -= 2;
  const dedupContext = await loadDedupContext(env, [...canonicalByItem.values()], s.id);
  const newItems = items.filter((item) => !isDuplicate(dedupContext, canonicalByItem.get(item)!, item.title));

  // --- Resolve bodies (feed body first, then bounded page extraction) -------
  const bodyByItem = new Map<FeedItem, ResolvedBody>();
  let feedBodyCount = 0;
  let extractedBodyCount = 0;
  const extractionFailures: { url: string; reason: string }[] = [];

  // 1) Cheap path: full body shipped in the feed (<content:encoded>). No budget cost.
  const needsPageFetch: FeedItem[] = [];
  for (const item of newItems) {
    const feedBody = item.contentEncoded ? extractFromFeedHtml(item.contentEncoded, s.base_url) : null;
    if (feedBody) {
      bodyByItem.set(item, feedBody);
      feedBodyCount++;
    } else {
      needsPageFetch.push(item);
    }
  }

  // 2) Expensive path: fetch the article page, gated by both budgets + per-source cap.
  const BODY_CONCURRENCY = 5;
  const skipPageFetch = isSpaSource(s.slug);
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
        return fetchArticleBody(item.link, s.slug, s.base_url);
      })
    );
    batch.forEach((item, j) => {
      bodyByItem.set(item, bodies[j].body);
      if (bodies[j].reason) extractionFailures.push({ url: item.link, reason: bodies[j].reason! });
    });
  }

  // --- Build rows (resolve images, slug, category) --------------------------
  const insertStatements: D1PreparedStatement[] = [];
  for (const item of newItems) {
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
      const cdnUrl = await uploadFromUrl(env, imageUrl, `${s.slug}/${slug}`).catch(() => null);
      if (cdnUrl) imageUrl = cdnUrl;
    }

    const now = nowIso();
    insertStatements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO news_articles (title, slug, canonical_url, summary, content, plain_text, source_url,
           original_image_url, author, published_at, fetched_at,
           view_count, is_featured, source_id, category_id, created_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 1)`
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
        s.id,
        categoryId,
        now,
      )
    );
  }

  // --- Persist: one batch for inserts, one batch for bookkeeping ------------
  let newCount = 0;
  if (insertStatements.length > 0) {
    budget.remaining--;
    const results = await env.DB.batch(insertStatements);
    newCount = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
  }

  const durationMs = Date.now() - startTime;
  const details = JSON.stringify({ feedBodies: feedBodyCount, extractedBodies: extractedBodyCount });
  budget.remaining--;
  await env.DB.batch([
    markSuccessStatement(env, s.id),
    logFetchStatement(env, s, durationMs, items.length, newCount, 0, true, null, details),
    // Per-article extraction failures (capped) → central app_logs, same round-trip.
    ...extractionFailures.slice(0, 12).map((f) =>
      logInsert(env, {
        category: 'extraction',
        level: 'warn',
        sourceSlug: s.slug,
        url: f.url,
        message: `Body extraction failed (${f.reason})`,
        error: f.reason,
      })
    ),
  ]);

  return { totalCount: items.length, newCount, updatedCount: 0 };
}

/** Record a feed-level failure (network/HTTP/parse/empty) + its log, in one batch. */
async function recordFailure(
  env: Env['Bindings'],
  s: SourceRow,
  budget: Budget,
  startTime: number,
  error: string
): Promise<FetchResult> {
  budget.remaining--;
  await env.DB.batch([
    markFailureStatement(env, s, error),
    logFetchStatement(env, s, Date.now() - startTime, 0, 0, 0, false, error, null),
  ]);
  return { totalCount: 0, newCount: 0, updatedCount: 0, error };
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
    const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10);
    if (contentLength > 6_000_000) return { body: null, reason: 'too_large' };
    const result = await extractArticleForSource(await res.text(), slug, baseUrl);
    return { body: result, reason: result ? null : 'no_body' };
  } catch (e: any) {
    return { body: null, reason: e?.name === 'TimeoutError' ? 'timeout' : 'fetch_error' };
  }
}

async function parseGuardian(res: Response): Promise<FeedItem[]> {
  const json = (await res.json()) as any;
  const results = json?.response?.results ?? [];
  return results.map((r: any): FeedItem => {
    const published = r.webPublicationDate ? new Date(r.webPublicationDate) : null;
    return {
      title: r.webTitle ?? '',
      link: r.webUrl ?? '',
      description: r.fields?.trailText ?? null,
      contentEncoded: null,
      publishedAt: published && !isNaN(published.getTime()) ? published : null,
      author: r.fields?.byline ?? null,
      imageUrl: r.fields?.thumbnail ?? null,
      guid: r.id ?? null,
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

function markFailureStatement(env: Env['Bindings'], s: SourceRow, error: string) {
  const now = nowIso();
  const threshold = s.circuit_breaker_threshold ?? 5;
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
  ).bind(now, now, threshold, error.slice(0, 1000), now, s.id);
}

function logFetchStatement(
  env: Env['Bindings'],
  s: SourceRow,
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
  ).bind(crypto.randomUUID(), s.id, s.name, nowIso(), durationMs, fetched, newCount, updated, success ? 1 : 0, error, details);
}
