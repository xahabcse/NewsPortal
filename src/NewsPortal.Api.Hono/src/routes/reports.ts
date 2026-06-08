import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso, paginate } from '../lib/db';

export const reportsRoutes = new Hono<Env>();

const VALID_REASONS = [
  'spam',
  'misleading',
  'offensive',
  'hate-speech',
  'wrong-category',
  'broken-link',
  'duplicate',
  'other',
];

// POST / — submit a report. body: { articleId, reason, details? }
reportsRoutes.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json<{ articleId?: number; reason?: string; details?: string }>();

  if (!body.articleId || !body.reason) return c.json(errMsg('articleId and reason are required'), 400);
  if (!VALID_REASONS.includes(body.reason)) return c.json(errMsg('Invalid reason'), 400);

  const article = await c.env.DB.prepare(
    'SELECT id FROM news_articles WHERE id = ? AND is_active = 1 LIMIT 1'
  ).bind(body.articleId).first<{ id: number }>();
  if (!article) return c.json(errMsg('Article not found'), 404);

  // Upsert: one report per (user, article).
  const now = nowIso();
  const existing = await c.env.DB.prepare(
    'SELECT id FROM article_reports WHERE user_id = ? AND article_id = ? LIMIT 1'
  ).bind(userId, body.articleId).first<{ id: number }>();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE article_reports SET reason = ?, details = ?, updated_at = ?, is_active = 1, status = ? WHERE id = ?'
    ).bind(body.reason, body.details?.trim() ?? null, now, 'pending', existing.id).run();
    return c.json({ message: 'Report updated', reportId: existing.id });
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO article_reports (user_id, article_id, reason, details, status, created_at, is_active)
     VALUES (?, ?, ?, ?, 'pending', ?, 1)`
  ).bind(userId, body.articleId, body.reason, body.details?.trim() ?? null, now).run();

  return c.json({ message: 'Report submitted', reportId: Number(result.meta.last_row_id) }, 201);
});

// GET / — admin list, paged. Query: status=pending|reviewed|dismissed
reportsRoutes.get('/', requireAuth, requireRole('Admin'), async (c) => {
  const status = c.req.query('status');
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'), 20);

  const where: string[] = ['r.is_active = 1'];
  const binds: any[] = [];
  if (status) {
    where.push('r.status = ?');
    binds.push(status);
  }
  const whereSql = where.join(' AND ');

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`
      SELECT r.id, r.article_id, r.user_id, r.reason, r.details, r.status, r.created_at,
             a.title AS article_title, a.slug AS article_slug,
             u.username AS reporter_username
      FROM article_reports r
      INNER JOIN news_articles a ON a.id = r.article_id
      INNER JOIN users u ON u.id = r.user_id
      WHERE ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...binds, size, offset).all<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM article_reports r WHERE ${whereSql}`)
      .bind(...binds).first<{ count: number }>(),
  ]);

  const items = (rows.results ?? []).map((row: any) => ({
    id: row.id,
    articleId: row.article_id,
    userId: row.user_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    articleTitle: row.article_title,
    articleSlug: row.article_slug,
    reporterUsername: row.reporter_username,
  }));

  return c.json(paged(items, countRow?.count ?? 0, page, size));
});

// PUT /:id/status   body: { status }
reportsRoutes.put('/:id/status', requireAuth, requireRole('Admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ status?: string }>();
  if (!['pending', 'reviewed', 'dismissed'].includes(body.status ?? '')) {
    return c.json(errMsg('Invalid status'), 400);
  }
  const result = await c.env.DB.prepare(
    'UPDATE article_reports SET status = ?, updated_at = ? WHERE id = ? AND is_active = 1'
  ).bind(body.status, nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('Report not found'), 404);
  return c.json({ message: 'Status updated', id });
});
