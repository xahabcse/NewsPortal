import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { paginate, type Row } from '../lib/db';

export const fetchJobsRoutes = new Hono<Env>();

const STATUS_NAMES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'];

function mapJob(r: Row) {
  return {
    id: r.id,
    externalId: r.external_id,
    sourceId: r.source_id,
    sourceName: r.source_name ?? null,
    requestedByUserId: r.requested_by_user_id,
    triggerType: r.trigger_type,
    status: STATUS_NAMES[r.status as number] ?? 'unknown',
    statusCode: r.status,
    attempts: r.attempts,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    articlesFetched: r.articles_fetched,
    newArticles: r.new_articles,
    updatedArticles: r.updated_articles,
    errorCode: r.error_code,
    errorSummary: r.error_summary,
    createdAt: r.created_at,
  };
}

// GET / — list jobs (admin)
fetchJobsRoutes.get('/', requireAuth, requireRole('Editor'), async (c) => {
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'), 20);
  const sourceId = c.req.query('sourceId');

  const where: string[] = ['j.is_active = 1'];
  const binds: any[] = [];
  if (sourceId) {
    where.push('j.source_id = ?');
    binds.push(parseInt(sourceId));
  }

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`
      SELECT j.*, s.name AS source_name
      FROM source_fetch_jobs j
      INNER JOIN news_sources s ON s.id = j.source_id
      WHERE ${where.join(' AND ')}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...binds, size, offset).all<Row>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM source_fetch_jobs j WHERE ${where.join(' AND ')}`)
      .bind(...binds).first<{ count: number }>(),
  ]);

  return c.json(paged((rows.results ?? []).map(mapJob), countRow?.count ?? 0, page, size));
});

// GET /:externalId — single job by external id
fetchJobsRoutes.get('/:externalId', requireAuth, async (c) => {
  const externalId = c.req.param('externalId');
  const row = await c.env.DB.prepare(`
    SELECT j.*, s.name AS source_name
    FROM source_fetch_jobs j
    INNER JOIN news_sources s ON s.id = j.source_id
    WHERE j.external_id = ?
    LIMIT 1
  `).bind(externalId).first<Row>();

  if (!row) return c.json(errMsg('Job not found'), 404);
  return c.json(mapJob(row));
});

// GET /logs — fetch logs (audit view)
fetchJobsRoutes.get('/logs/recent', requireAuth, requireRole('Editor'), async (c) => {
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') ?? '50') || 50));
  const rows = await c.env.DB.prepare(
    'SELECT * FROM news_fetch_logs ORDER BY fetched_at DESC LIMIT ?'
  ).bind(limit).all<Row>();

  const items = (rows.results ?? []).map((r) => ({
    id: r.id,
    sourceId: r.source_id,
    sourceName: r.source_name,
    fetchedAt: r.fetched_at,
    durationMs: r.duration_ms,
    articlesFetched: r.articles_fetched,
    newArticles: r.new_articles,
    updatedArticles: r.updated_articles,
    success: r.success === 1,
    errorMessage: r.error_message,
  }));
  return c.json(items);
});
