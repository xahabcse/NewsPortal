import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth } from '../lib/auth';
import { nowIso } from '../lib/db';

export const readHistoryRoutes = new Hono<Env>();

readHistoryRoutes.use('*', requireAuth);

// GET / — recent reading history (limit, default 50)
readHistoryRoutes.get('/', async (c) => {
  const userId = c.get('userId')!;
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') ?? '50') || 50));

  const rows = await c.env.DB.prepare(`
    SELECT h.id, h.user_id, h.article_id, h.read_at, h.created_at,
           a.title, a.slug, a.summary, a.original_image_url AS thumbnail_url,
           a.published_at,
           s.name AS source_name, c.name AS category_name
    FROM user_read_history h
    INNER JOIN news_articles a ON a.id = h.article_id AND a.is_active = 1
    INNER JOIN news_sources s ON s.id = a.source_id
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE h.user_id = ? AND h.is_active = 1
    ORDER BY h.read_at DESC
    LIMIT ?
  `).bind(userId, limit).all<any>();

  const items = (rows.results ?? []).map((row: any) => ({
    id: row.id,
    articleId: row.article_id,
    userId: row.user_id,
    createdAt: row.created_at,
    article: {
      id: row.article_id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      thumbnailUrl: row.thumbnail_url,
      publishedAt: row.published_at,
      sourceName: row.source_name,
      categoryName: row.category_name,
    },
  }));

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM user_read_history WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first<{ count: number }>();

  return c.json({ items, totalCount: countRow?.count ?? 0 });
});

// POST /:articleId — record that the user read this article (idempotent: bumps read_at)
readHistoryRoutes.post('/:articleId', async (c) => {
  const userId = c.get('userId')!;
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  const article = await c.env.DB.prepare(
    'SELECT id FROM news_articles WHERE id = ? AND is_active = 1 LIMIT 1'
  ).bind(articleId).first<{ id: number }>();
  if (!article) return c.json(errMsg('Article not found'), 404);

  const now = nowIso();
  const existing = await c.env.DB.prepare(
    'SELECT id FROM user_read_history WHERE user_id = ? AND article_id = ? LIMIT 1'
  ).bind(userId, articleId).first<{ id: number }>();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE user_read_history SET read_at = ?, is_active = 1, updated_at = ? WHERE id = ?'
    ).bind(now, now, existing.id).run();
    return c.json({ message: 'Read history updated', articleId });
  }

  await c.env.DB.prepare(
    'INSERT INTO user_read_history (user_id, article_id, read_at, created_at, is_active) VALUES (?, ?, ?, ?, 1)'
  ).bind(userId, articleId, now, now).run();

  return c.json({ message: 'Read history recorded', articleId }, 201);
});

// GET /:articleId/check
readHistoryRoutes.get('/:articleId/check', async (c) => {
  const userId = c.get('userId')!;
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  const row = await c.env.DB.prepare(
    'SELECT id FROM user_read_history WHERE user_id = ? AND article_id = ? AND is_active = 1 LIMIT 1'
  ).bind(userId, articleId).first();

  return c.json({ hasRead: !!row, articleId });
});
