import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso, type Row } from '../lib/db';
import { makeSlug } from '../lib/slug';
import { audit } from '../lib/logger';

export const newsSourcesRoutes = new Hono<Env>();

function mapSource(r: Row) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    baseUrl: r.base_url,
    logoUrl: r.logo_url,
    fetchMethod: r.fetch_method,
    rssFeedUrl: r.rss_feed_url,
    apiEndpoint: r.api_endpoint,
    fetchIntervalMinutes: r.fetch_interval_minutes,
    lastFetchedAt: r.last_fetched_at,
    healthStatus: r.health_status,
    consecutiveFailures: r.consecutive_failures,
    lastSuccessAt: r.last_success_at,
    lastFailureAt: r.last_failure_at,
    lastErrorCode: r.last_error_code,
    lastErrorMessage: r.last_error_message,
    nextRetryAt: r.next_retry_at,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET / — public, active sources only
newsSourcesRoutes.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM news_sources WHERE is_active = 1 ORDER BY name ASC'
  ).all<Row>();
  return c.json((rows.results ?? []).map(mapSource));
});

// GET /all — admin, includes disabled
newsSourcesRoutes.get('/all', requireAuth, requireRole('Editor'), async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM news_sources ORDER BY name ASC').all<Row>();
  return c.json((rows.results ?? []).map(mapSource));
});

// GET /:slug — public detail
newsSourcesRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  // Also support numeric ID for admin lookups.
  let row: Row | null = null;
  if (/^\d+$/.test(slug)) {
    row = await c.env.DB.prepare('SELECT * FROM news_sources WHERE id = ? LIMIT 1').bind(parseInt(slug)).first<Row>();
  } else {
    row = await c.env.DB.prepare('SELECT * FROM news_sources WHERE slug = ? LIMIT 1').bind(slug).first<Row>();
  }
  if (!row) return c.json(errMsg('Source not found'), 404);
  return c.json(mapSource(row));
});

// POST / — create. body: { name, baseUrl, fetchMethod, rssFeedUrl?, apiEndpoint?, fetchIntervalMinutes?, logoUrl? }
newsSourcesRoutes.post('/', requireAuth, requireRole('Editor'), async (c) => {
  const body = await c.req.json<any>();
  if (!body.name || !body.baseUrl) return c.json(errMsg('name and baseUrl required'), 400);

  const slug = body.slug ?? makeSlug(body.name);
  const now = nowIso();

  const result = await c.env.DB.prepare(
    `INSERT INTO news_sources (name, slug, base_url, logo_url, fetch_method, rss_feed_url, api_endpoint,
       api_key, fetch_interval_minutes, created_at, is_active, health_status,
       consecutive_failures, request_timeout_seconds, max_retry_attempts, circuit_breaker_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 90, 3, 5)`
  ).bind(
    body.name,
    slug,
    body.baseUrl,
    body.logoUrl ?? null,
    body.fetchMethod ?? 1,
    body.rssFeedUrl ?? null,
    body.apiEndpoint ?? null,
    body.apiKey ?? null,
    body.fetchIntervalMinutes ?? 30,
    now
  ).run();

  const created = await c.env.DB.prepare('SELECT * FROM news_sources WHERE id = ?')
    .bind(Number(result.meta.last_row_id)).first<Row>();
  audit(c, { action: 'source.create', targetType: 'source', targetId: created?.id as number, message: `Created source ${created?.name}` });
  return c.json(mapSource(created!), 201);
});

// PUT /:id — update
newsSourcesRoutes.put('/:id', requireAuth, requireRole('Editor'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<any>();

  await c.env.DB.prepare(
    `UPDATE news_sources SET
       name = ?, base_url = ?, logo_url = ?, fetch_method = ?,
       rss_feed_url = ?, api_endpoint = ?, fetch_interval_minutes = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    body.name,
    body.baseUrl,
    body.logoUrl ?? null,
    body.fetchMethod ?? 1,
    body.rssFeedUrl ?? null,
    body.apiEndpoint ?? null,
    body.fetchIntervalMinutes ?? 30,
    nowIso(),
    id
  ).run();
  audit(c, { action: 'source.update', targetType: 'source', targetId: id, message: `Updated source ${body.name ?? id}` });
  return c.body(null, 204);
});

// DELETE /:id — soft delete
newsSourcesRoutes.delete('/:id', requireAuth, requireRole('Admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare('UPDATE news_sources SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  audit(c, { action: 'source.delete', targetType: 'source', targetId: id, level: 'warn', message: `Deleted (deactivated) source ${id}` });
  return c.body(null, 204);
});

// POST /:id/resume
newsSourcesRoutes.post('/:id/resume', requireAuth, requireRole('Editor'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare(
    'UPDATE news_sources SET is_active = 1, health_status = 0, consecutive_failures = 0, updated_at = ? WHERE id = ?'
  ).bind(nowIso(), id).run();
  audit(c, { action: 'source.resume', targetType: 'source', targetId: id, message: `Resumed source ${id}` });
  return c.body(null, 204);
});

// POST /:id/pause
newsSourcesRoutes.post('/:id/pause', requireAuth, requireRole('Editor'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare('UPDATE news_sources SET health_status = 2, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  audit(c, { action: 'source.pause', targetType: 'source', targetId: id, message: `Paused source ${id}` });
  return c.body(null, 204);
});

// POST /:id/disable
newsSourcesRoutes.post('/:id/disable', requireAuth, requireRole('Admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare('UPDATE news_sources SET is_active = 0, health_status = 3, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  audit(c, { action: 'source.disable', targetType: 'source', targetId: id, level: 'warn', message: `Disabled source ${id}` });
  return c.body(null, 204);
});

// POST /:id/fetch — trigger an immediate fetch (Phase 5 will wire this to the scheduled handler)
newsSourcesRoutes.post('/:id/fetch', requireAuth, requireRole('Editor'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  const source = await c.env.DB.prepare('SELECT id, name FROM news_sources WHERE id = ? LIMIT 1')
    .bind(id).first<{ id: number; name: string }>();
  if (!source) return c.json(errMsg('Source not found'), 404);

  // Create a fetch job record; the cron handler will pick it up.
  const externalId = crypto.randomUUID();
  const now = nowIso();
  const result = await c.env.DB.prepare(
    `INSERT INTO source_fetch_jobs (external_id, source_id, requested_by_user_id, trigger_type, status,
       attempts, articles_fetched, new_articles, updated_articles, created_at, is_active)
     VALUES (?, ?, ?, 'manual', 0, 0, 0, 0, 0, ?, 1)`
  ).bind(externalId, id, c.get('userId') ?? null, now).run();

  // Best-effort: invoke the fetch directly here (so admins see results quickly).
  try {
    const { fetchSourceNow } = await import('../jobs/fetch-news');
    c.executionCtx.waitUntil(fetchSourceNow(c.env, id, Number(result.meta.last_row_id)));
  } catch {}

  return c.json({
    jobId: externalId,
    sourceId: id,
    sourceName: source.name,
    status: 'queued',
    message: 'Fetch job queued',
  });
});

// POST /test — dry-run test a source config without saving
newsSourcesRoutes.post('/test', requireAuth, requireRole('Editor'), async (c) => {
  const body = await c.req.json<{ rssFeedUrl?: string; apiEndpoint?: string; fetchMethod?: number }>();
  const url = body.rssFeedUrl || body.apiEndpoint;
  if (!url) return c.json(errMsg('rssFeedUrl or apiEndpoint required'), 400);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'NewsPortal/1.0' } });
    if (!res.ok) {
      return c.json({
        success: false,
        statusCode: res.status,
        message: `Source returned ${res.status} ${res.statusText}`,
        sampleArticles: [],
      });
    }
    const text = await res.text();
    const titleMatches = Array.from(text.matchAll(/<title[^>]*>([^<]+)<\/title>/gi)).slice(1, 6);
    const sampleTitles = titleMatches.map((m) => m[1].trim());
    return c.json({
      success: true,
      statusCode: res.status,
      message: 'Source reachable',
      sampleArticles: sampleTitles,
    });
  } catch (e: any) {
    return c.json({ success: false, message: e.message ?? 'Fetch failed', sampleArticles: [] });
  }
});

// POST /bulk-action  body: { ids: number[], action: 'pause' | 'resume' | 'delete' }
newsSourcesRoutes.post('/bulk-action', requireAuth, requireRole('Admin'), async (c) => {
  const body = await c.req.json<{ ids?: number[]; action?: string }>();
  if (!Array.isArray(body.ids) || body.ids.length === 0) return c.json(errMsg('ids[] required'), 400);

  let processed = 0;
  let failed = 0;
  const now = nowIso();

  for (const id of body.ids) {
    try {
      if (body.action === 'pause') {
        await c.env.DB.prepare('UPDATE news_sources SET health_status = 2, updated_at = ? WHERE id = ?')
          .bind(now, id).run();
      } else if (body.action === 'resume') {
        await c.env.DB.prepare(
          'UPDATE news_sources SET is_active = 1, health_status = 0, consecutive_failures = 0, updated_at = ? WHERE id = ?'
        ).bind(now, id).run();
      } else if (body.action === 'delete') {
        await c.env.DB.prepare('UPDATE news_sources SET is_active = 0, updated_at = ? WHERE id = ?')
          .bind(now, id).run();
      } else {
        failed++;
        continue;
      }
      processed++;
    } catch {
      failed++;
    }
  }

  return c.json({ processed, failed, total: body.ids.length });
});

// POST /backfill — manually run the body-backfill job now (Admin+). Visits the
// source links of NULL-content articles (today first, then last 3 days) and fills
// their body. The same job also runs automatically every 30 min via cron.
newsSourcesRoutes.post('/backfill', requireAuth, requireRole('Admin'), async (c) => {
  const { runBodyBackfill } = await import('../jobs/fetch-news');
  audit(c, { action: 'backfill.run', message: 'Manually triggered body backfill' });
  const result = await runBodyBackfill(c.env);
  return c.json({ message: 'Body backfill complete', ...result });
});
