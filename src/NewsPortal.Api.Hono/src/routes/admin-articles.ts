import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso, paginate, type Row } from '../lib/db';
import { invalidateNewsCache } from './news';
import { makeSlug, withSuffix } from '../lib/slug';

export const adminArticlesRoutes = new Hono<Env>();

adminArticlesRoutes.use('*', requireAuth, requireRole('Editor'));

function mapAdminArticle(r: Row) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    canonicalUrl: r.canonical_url,
    sourceUrl: r.source_url,
    thumbnailUrl: r.original_image_url,
    publishedAt: r.published_at,
    fetchedAt: r.fetched_at,
    viewCount: r.view_count,
    isFeatured: r.is_featured === 1,
    isActive: r.is_active === 1,
    sourceId: r.source_id,
    sourceName: r.source_name,
    categoryId: r.category_id,
    categoryName: r.category_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET / — full list (includes inactive)
adminArticlesRoutes.get('/', async (c) => {
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'), 20);
  const search = (c.req.query('search') ?? '').trim();
  const status = c.req.query('status');

  const where: string[] = [];
  const binds: any[] = [];
  if (search) {
    where.push('(a.title LIKE ? OR a.slug LIKE ?)');
    binds.push(`%${search}%`, `%${search}%`);
  }
  if (status === 'active') where.push('a.is_active = 1');
  if (status === 'hidden') where.push('a.is_active = 0');
  if (status === 'featured') where.push('a.is_active = 1 AND a.is_featured = 1');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`
      SELECT a.*, s.name AS source_name, c.name AS category_name
      FROM news_articles a
      INNER JOIN news_sources s ON s.id = a.source_id
      LEFT JOIN categories c ON c.id = a.category_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...binds, size, offset).all<Row>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM news_articles a ${whereSql}`)
      .bind(...binds).first<{ count: number }>(),
  ]);

  return c.json(paged((rows.results ?? []).map(mapAdminArticle), countRow?.count ?? 0, page, size));
});

// POST / — create a manual article
adminArticlesRoutes.post('/', async (c) => {
  const body = await c.req.json<any>();
  if (!body.title || !body.sourceId) return c.json(errMsg('title and sourceId required'), 400);

  const baseSlug = body.slug?.trim() || makeSlug(body.title);
  let slug = baseSlug;
  // Resolve slug collisions.
  for (let i = 2; i < 100; i++) {
    const exists = await c.env.DB.prepare('SELECT id FROM news_articles WHERE slug = ? LIMIT 1').bind(slug).first();
    if (!exists) break;
    slug = withSuffix(baseSlug, i);
  }

  const now = nowIso();
  const canonicalUrl = body.canonicalUrl ?? body.sourceUrl ?? `${slug}-${Date.now()}`;

  const result = await c.env.DB.prepare(
    `INSERT INTO news_articles (title, slug, canonical_url, summary, content, plain_text, source_url,
       original_image_url, author, published_at, fetched_at, view_count, is_featured,
       source_id, category_id, created_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1)`
  ).bind(
    body.title,
    slug,
    canonicalUrl,
    body.summary ?? null,
    body.content ?? null,
    body.plainText ?? body.summary ?? null,
    body.sourceUrl ?? '',
    body.imageUrl ?? body.thumbnailUrl ?? null,
    body.author ?? null,
    body.publishedAt ?? now,
    now,
    body.isFeatured ? 1 : 0,
    body.sourceId,
    body.categoryId ?? null,
    now,
  ).run();

  await invalidateNewsCache(c.env);
  return c.json({ id: Number(result.meta.last_row_id), slug }, 201);
});

// PUT /:id — update
adminArticlesRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<any>();

  await c.env.DB.prepare(
    `UPDATE news_articles SET
       title = COALESCE(?, title),
       summary = COALESCE(?, summary),
       content = COALESCE(?, content),
       category_id = ?,
       is_featured = COALESCE(?, is_featured),
       updated_at = ?
     WHERE id = ?`
  ).bind(
    body.title ?? null,
    body.summary ?? null,
    body.content ?? null,
    body.categoryId ?? null,
    body.isFeatured == null ? null : body.isFeatured ? 1 : 0,
    nowIso(),
    id
  ).run();

  await invalidateNewsCache(c.env);
  return c.body(null, 204);
});

// POST /:id/feature  body: { isFeatured }
adminArticlesRoutes.post('/:id/feature', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ isFeatured?: boolean }>();
  await c.env.DB.prepare('UPDATE news_articles SET is_featured = ?, updated_at = ? WHERE id = ?')
    .bind(body.isFeatured ? 1 : 0, nowIso(), id).run();
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Updated' });
});

// POST /:id/hide
adminArticlesRoutes.post('/:id/hide', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare('UPDATE news_articles SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Hidden' });
});

// POST /:id/show
adminArticlesRoutes.post('/:id/show', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare('UPDATE news_articles SET is_active = 1, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Restored' });
});

// DELETE /:id
adminArticlesRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  await c.env.DB.prepare('UPDATE news_articles SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  await invalidateNewsCache(c.env);
  return c.body(null, 204);
});

// POST /auto-categorize — bulk re-categorize using the keyword classifier
adminArticlesRoutes.post('/auto-categorize', async (c) => {
  const { categorize } = await import('../lib/categorizer');
  const articles = await c.env.DB.prepare(
    'SELECT id, title, summary, plain_text FROM news_articles WHERE is_active = 1 AND category_id IS NULL LIMIT 500'
  ).all<{ id: number; title: string; summary: string | null; plain_text: string | null }>();

  const categories = await c.env.DB.prepare('SELECT id, slug FROM categories WHERE is_active = 1').all<{ id: number; slug: string }>();
  const bySlug = new Map(categories.results?.map((c) => [c.slug, c.id]));

  let updated = 0;
  for (const a of articles.results ?? []) {
    const slug = categorize(`${a.title}\n${a.summary ?? ''}\n${a.plain_text ?? ''}`);
    const catId = bySlug.get(slug);
    if (!catId) continue;
    await c.env.DB.prepare('UPDATE news_articles SET category_id = ?, updated_at = ? WHERE id = ?')
      .bind(catId, nowIso(), a.id).run();
    updated++;
  }
  await invalidateNewsCache(c.env);
  return c.json({ processed: articles.results?.length ?? 0, updated });
});
