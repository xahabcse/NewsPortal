// Scheduled news fetcher — replaces Hangfire's periodic RSS pull.
// Triggered every 15 minutes by the Cron Trigger declared in wrangler.toml,
// or manually via POST /api/v1/newssources/:id/fetch.

import type { Env } from '../lib/env';
import { parseFeed, canonicalize } from '../lib/rss';
import { findDuplicate } from '../lib/dedup';
import { categorize } from '../lib/categorizer';
import { makeSlug, withSuffix } from '../lib/slug';
import { uploadFromUrl } from '../lib/cloudinary';
import { cacheInvalidatePrefix } from '../lib/cache';
import { nowIso } from '../lib/db';
import { extractArticleForSource } from '../lib/article-extractor';

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
};

const MAX_SOURCES_PER_RUN = 10;     // protect Worker CPU budget
const MAX_ARTICLES_PER_SOURCE = 30;

// Cloudflare caps outbound subrequests per Worker invocation (50 on the Workers
// free plan). A single cron run loops several sources, and every RSS fetch, every
// article-body fetch, and every Cloudinary upload is one subrequest — so the total
// must be bounded or a later source throws "Too many subrequests" and ingests nothing.
// We track a shared budget and degrade gracefully: once it's low we stop fetching
// bodies / uploading images and just insert the RSS summary (backfill can fill bodies later).
const SUBREQUEST_BUDGET = 42;       // headroom under the 50 hard cap
type Budget = { remaining: number };

export async function runScheduledFetch(env: Env['Bindings']): Promise<{ sourcesProcessed: number; articlesNew: number }> {
  // Pick sources due for fetch: last_fetched_at NULL or older than interval.
  const sources = await env.DB.prepare(`
    SELECT id, name, slug, base_url, fetch_method, rss_feed_url, api_endpoint, api_key,
           fetch_interval_minutes, last_fetched_at, consecutive_failures
    FROM news_sources
    WHERE is_active = 1 AND health_status IN (0, 1)
    ORDER BY COALESCE(last_fetched_at, '1970-01-01') ASC
    LIMIT ?
  `).bind(MAX_SOURCES_PER_RUN).all<SourceRow>();

  let totalNew = 0;
  let processed = 0;
  const budget: Budget = { remaining: SUBREQUEST_BUDGET };
  for (const s of sources.results ?? []) {
    const dueAt = s.last_fetched_at
      ? new Date(s.last_fetched_at).getTime() + s.fetch_interval_minutes * 60 * 1000
      : 0;
    if (dueAt > Date.now()) continue;

    const result = await fetchOneSource(env, s, budget);
    totalNew += result.newCount;
    processed++;
  }

  // Spend any leftover subrequest budget backfilling bodies for recent articles that
  // were inserted summary-only (content NULL) when an earlier run hit the budget cap.
  // This drains the recent backlog automatically over successive cron runs.
  const backfilled = await backfillRecentBodies(env, budget);

  if (totalNew > 0 || backfilled > 0) await cacheInvalidatePrefix(env.CACHE_KV, 'news:');
  return { sourcesProcessed: processed, articlesNew: totalNew };
}

/**
 * Best-effort backfill: re-fetch + extract bodies for recent NULL-content articles
 * using whatever subrequest budget the main fetch loop left behind. Bounded to recent
 * (last 3 days) articles so we don't burn budget retrying long-dead source URLs.
 */
async function backfillRecentBodies(env: Env['Bindings'], budget: Budget): Promise<number> {
  if (budget.remaining <= 4) return 0;
  const cutoff = new Date(Date.now() - 3 * 86400000).toISOString();
  const limit = Math.min(budget.remaining - 2, 20);

  const rows = await env.DB.prepare(`
    SELECT a.id, a.source_url, s.slug AS source_slug, s.base_url AS source_base_url
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    WHERE a.content IS NULL AND a.is_active = 1
      AND a.source_url IS NOT NULL AND a.source_url <> ''
      AND COALESCE(a.published_at, a.fetched_at) >= ?
    ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
    LIMIT ?
  `).bind(cutoff, limit).all<{ id: number; source_url: string; source_slug: string; source_base_url: string }>();

  let updated = 0;
  for (const a of rows.results ?? []) {
    if (budget.remaining <= 2) break;
    budget.remaining--;
    const body = await fetchArticleBody(a.source_url, a.source_slug, a.source_base_url);
    if (body) {
      await env.DB.prepare('UPDATE news_articles SET content = ?, plain_text = ?, updated_at = ? WHERE id = ?')
        .bind(body.contentHtml, body.plainText, nowIso(), a.id).run();
      updated++;
    }
  }
  return updated;
}

/** Manually fetch a single source (called from POST /newssources/:id/fetch). */
export async function fetchSourceNow(env: Env['Bindings'], sourceId: number, jobId?: number): Promise<void> {
  const s = await env.DB.prepare(
    `SELECT id, name, slug, base_url, fetch_method, rss_feed_url, api_endpoint, api_key,
            fetch_interval_minutes, last_fetched_at, consecutive_failures
     FROM news_sources WHERE id = ? LIMIT 1`
  ).bind(sourceId).first<SourceRow>();
  if (!s) return;

  if (jobId) {
    await env.DB.prepare('UPDATE source_fetch_jobs SET status = 1, started_at = ? WHERE id = ?')
      .bind(nowIso(), jobId).run();
  }

  // Manual single-source fetch runs in its own invocation, so it gets a fresh budget.
  const result = await fetchOneSource(env, s, { remaining: SUBREQUEST_BUDGET });

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

async function fetchOneSource(env: Env['Bindings'], s: SourceRow, budget: Budget): Promise<FetchResult> {
  const startTime = Date.now();
  const url = s.fetch_method === 2 ? s.api_endpoint : s.rss_feed_url;
  if (!url) return { totalCount: 0, newCount: 0, updatedCount: 0, error: 'No URL configured' };

  let res: Response;
  try {
    budget.remaining--; // the feed fetch itself is one subrequest
    res = await fetch(url, { headers: { 'User-Agent': 'NewsPortalBot/1.0 (+https://news.xahabcse.me)' } });
  } catch (e: any) {
    await markFailure(env, s, e.message ?? 'Network error');
    await logFetch(env, s, Date.now() - startTime, 0, 0, 0, false, e.message ?? 'Network error');
    return { totalCount: 0, newCount: 0, updatedCount: 0, error: e.message ?? 'Network error' };
  }

  if (!res.ok) {
    const msg = `HTTP ${res.status}`;
    await markFailure(env, s, msg);
    await logFetch(env, s, Date.now() - startTime, 0, 0, 0, false, msg);
    return { totalCount: 0, newCount: 0, updatedCount: 0, error: msg };
  }

  // Guardian API has a JSON shape; RSS sources are XML.
  let items;
  try {
    if (s.fetch_method === 2 && s.slug === 'the-guardian') {
      items = await parseGuardian(res);
    } else {
      const xml = await res.text();
      items = parseFeed(xml);
    }
  } catch (e: any) {
    await markFailure(env, s, e.message ?? 'Parse error');
    await logFetch(env, s, Date.now() - startTime, 0, 0, 0, false, e.message ?? 'Parse error');
    return { totalCount: 0, newCount: 0, updatedCount: 0, error: e.message ?? 'Parse error' };
  }

  items = items.slice(0, MAX_ARTICLES_PER_SOURCE);
  let newCount = 0;
  let updatedCount = 0;

  // Pre-load category slug → id map once per run.
  const cats = await env.DB.prepare('SELECT id, slug FROM categories WHERE is_active = 1').all<{ id: number; slug: string }>();
  const bySlug = new Map(cats.results?.map((c) => [c.slug, c.id]));

  // First pass: dedup-filter so we only do the expensive body fetch for genuinely new items.
  const newItems: typeof items = [];
  for (const item of items) {
    const canonical = canonicalize(item.link);
    const dup = await findDuplicate(env, canonical, item.title, s.id);
    if (!dup) newItems.push(item);
  }

  // Process new items in small batches so body fetches run with bounded concurrency
  // (protects Worker CPU / wall-clock — never fire all 30 source-page fetches at once).
  const BODY_CONCURRENCY = 5;
  for (let i = 0; i < newItems.length; i += BODY_CONCURRENCY) {
    const batch = newItems.slice(i, i + BODY_CONCURRENCY);
    // Fetch + extract bodies concurrently — but only while we have subrequest budget.
    // Beyond it, body stays null (summary-only insert); the re-extract job backfills later.
    const bodies = await Promise.all(
      batch.map((item) => {
        if (budget.remaining <= 2) return Promise.resolve(null);
        budget.remaining--;
        return fetchArticleBody(item.link, s.slug, s.base_url);
      })
    );

    // Insert sequentially (slug-collision check needs ordered DB reads).
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const body = bodies[j];
      const canonical = canonicalize(item.link);

      const categorySlug = categorize(`${item.title}\n${item.description ?? ''}\n${body?.plainText ?? ''}`);
      const categoryId = bySlug.get(categorySlug) ?? null;

      // Resolve slug collisions.
      const baseSlug = makeSlug(item.title);
      let slug = baseSlug || `article-${Date.now()}`;
      for (let k = 2; k < 50; k++) {
        const exists = await env.DB.prepare('SELECT id FROM news_articles WHERE slug = ? LIMIT 1').bind(slug).first();
        if (!exists) break;
        slug = withSuffix(baseSlug, k);
      }

      // Lead image: prefer RSS image, else first body image. Lazy CDN upload, best-effort,
      // and only while subrequest budget allows — otherwise keep the original source URL.
      let imageUrl = item.imageUrl ?? body?.images[0] ?? null;
      if (imageUrl && budget.remaining > 1) {
        budget.remaining--;
        const cdn = await uploadFromUrl(env, imageUrl, `${s.slug}/${slug}`).catch(() => null);
        if (cdn) imageUrl = cdn;
      }

      const now = nowIso();
      try {
        await env.DB.prepare(
          `INSERT INTO news_articles (title, slug, canonical_url, summary, content, plain_text, source_url,
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
        ).run();
        newCount++;
      } catch {
        // Concurrent insert collision on canonical_url unique index — skip.
      }
    }
  }

  await markSuccess(env, s, items.length, newCount);
  await logFetch(env, s, Date.now() - startTime, items.length, newCount, updatedCount, true, null);
  return { totalCount: items.length, newCount, updatedCount };
}

/**
 * Fetch an article's source page and extract its body. Fully best-effort:
 * any failure (timeout, non-OK, null extraction) returns null so the caller
 * keeps the RSS summary and never throws. Runs inside the cron wall-clock budget.
 */
async function fetchArticleBody(
  link: string,
  slug: string,
  baseUrl: string
): Promise<{ contentHtml: string; plainText: string; images: string[] } | null> {
  try {
    const res = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsPortalBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return await extractArticleForSource(html, slug, baseUrl);
  } catch {
    return null;
  }
}

async function parseGuardian(res: Response): Promise<Array<{ title: string; link: string; description: string | null; publishedAt: Date | null; author: string | null; imageUrl: string | null; guid: string | null }>> {
  const json = (await res.json()) as any;
  const results = json?.response?.results ?? [];
  return results.map((r: any) => ({
    title: r.webTitle ?? '',
    link: r.webUrl ?? '',
    description: r.fields?.trailText ?? null,
    publishedAt: r.webPublicationDate ? new Date(r.webPublicationDate) : null,
    author: r.fields?.byline ?? null,
    imageUrl: r.fields?.thumbnail ?? null,
    guid: r.id ?? null,
  }));
}

async function markSuccess(env: Env['Bindings'], s: SourceRow, fetched: number, newCount: number) {
  const now = nowIso();
  await env.DB.prepare(
    `UPDATE news_sources SET
       last_fetched_at = ?, last_success_at = ?, consecutive_failures = 0,
       health_status = 0, last_error_code = NULL, last_error_message = NULL, updated_at = ?
     WHERE id = ?`
  ).bind(now, now, now, s.id).run();
}

async function markFailure(env: Env['Bindings'], s: SourceRow, error: string) {
  const now = nowIso();
  const failures = (s.consecutive_failures ?? 0) + 1;
  const health = failures >= 5 ? 1 : 0; // mark degraded after 5 failures
  await env.DB.prepare(
    `UPDATE news_sources SET
       last_fetched_at = ?, last_failure_at = ?, consecutive_failures = ?,
       health_status = ?, last_error_code = 'fetch_failed', last_error_message = ?, updated_at = ?
     WHERE id = ?`
  ).bind(now, now, failures, health, error.slice(0, 1000), now, s.id).run();
}

async function logFetch(
  env: Env['Bindings'],
  s: SourceRow,
  durationMs: number,
  fetched: number,
  newCount: number,
  updated: number,
  success: boolean,
  error: string | null
) {
  await env.DB.prepare(
    `INSERT INTO news_fetch_logs (id, source_id, source_name, fetched_at, duration_ms,
       articles_fetched, new_articles, updated_articles, success, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), s.id, s.name, nowIso(), durationMs, fetched, newCount, updated, success ? 1 : 0, error).run();
}
