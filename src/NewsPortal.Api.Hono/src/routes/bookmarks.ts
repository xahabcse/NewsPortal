import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth } from '../lib/auth';
import { nowIso, paginate } from '../lib/db';

export const bookmarksRoutes = new Hono<Env>();

bookmarksRoutes.use('*', requireAuth);

type BookmarkRow = {
  id: number;
  user_id: number;
  article_id: number;
  created_at: string;
  // joined
  article_title: string;
  article_slug: string;
  article_summary: string | null;
  article_thumbnail: string | null;
  article_published_at: string | null;
  source_name: string;
  category_name: string | null;
};

function mapBookmark(r: BookmarkRow) {
  return {
    id: r.id,
    articleId: r.article_id,
    userId: r.user_id,
    createdAt: r.created_at,
    article: {
      id: r.article_id,
      title: r.article_title,
      slug: r.article_slug,
      summary: r.article_summary,
      thumbnailUrl: r.article_thumbnail,
      publishedAt: r.article_published_at ?? r.created_at,
      sourceName: r.source_name,
      categoryName: r.category_name,
    },
  };
}

// GET / — list current user's bookmarks
bookmarksRoutes.get('/', async (c) => {
  const userId = c.get('userId')!;
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'), 12);

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`
      SELECT b.id, b.user_id, b.article_id, b.created_at,
             a.title AS article_title, a.slug AS article_slug, a.summary AS article_summary,
             a.original_image_url AS article_thumbnail, a.published_at AS article_published_at,
             s.name AS source_name, c.name AS category_name
      FROM user_bookmarks b
      INNER JOIN news_articles a ON a.id = b.article_id AND a.is_active = 1
      INNER JOIN news_sources s ON s.id = a.source_id
      LEFT JOIN categories c ON c.id = a.category_id
      WHERE b.user_id = ? AND b.is_active = 1
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, size, offset).all<BookmarkRow>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = ? AND is_active = 1')
      .bind(userId).first<{ count: number }>(),
  ]);

  return c.json(paged((rows.results ?? []).map(mapBookmark), countRow?.count ?? 0, page, size));
});

// POST /:articleId — add bookmark (idempotent)
bookmarksRoutes.post('/:articleId', async (c) => {
  const userId = c.get('userId')!;
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  // Check article exists
  const article = await c.env.DB.prepare('SELECT id FROM news_articles WHERE id = ? AND is_active = 1 LIMIT 1')
    .bind(articleId).first();
  if (!article) return c.json(errMsg('Article not found'), 404);

  const existing = await c.env.DB.prepare(
    'SELECT id, is_active FROM user_bookmarks WHERE user_id = ? AND article_id = ? LIMIT 1'
  ).bind(userId, articleId).first<{ id: number; is_active: number }>();

  if (existing && existing.is_active === 1) {
    return c.json({ message: 'Already bookmarked', bookmarkId: existing.id, articleId });
  }

  const now = nowIso();
  if (existing) {
    await c.env.DB.prepare('UPDATE user_bookmarks SET is_active = 1, updated_at = ? WHERE id = ?')
      .bind(now, existing.id).run();
    return c.json({ message: 'Bookmark restored', bookmarkId: existing.id, articleId });
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO user_bookmarks (user_id, article_id, created_at, is_active) VALUES (?, ?, ?, 1)'
  ).bind(userId, articleId, now).run();

  return c.json({ message: 'Bookmark added', bookmarkId: Number(result.meta.last_row_id), articleId }, 201);
});

// DELETE /:articleId
bookmarksRoutes.delete('/:articleId', async (c) => {
  const userId = c.get('userId')!;
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  await c.env.DB.prepare(
    'UPDATE user_bookmarks SET is_active = 0, updated_at = ? WHERE user_id = ? AND article_id = ?'
  ).bind(nowIso(), userId, articleId).run();

  return c.json({ message: 'Bookmark removed', articleId });
});

// GET /:articleId/check — is the current user bookmarking this article?
bookmarksRoutes.get('/:articleId/check', async (c) => {
  const userId = c.get('userId')!;
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  const row = await c.env.DB.prepare(
    'SELECT id FROM user_bookmarks WHERE user_id = ? AND article_id = ? AND is_active = 1 LIMIT 1'
  ).bind(userId, articleId).first();

  return c.json({ isBookmarked: !!row, articleId });
});
