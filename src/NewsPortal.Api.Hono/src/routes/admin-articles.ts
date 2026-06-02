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

// GET /:id — single article with full body (used by the edit form)
adminArticlesRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const r = await c.env.DB.prepare(`
    SELECT a.*, s.name AS source_name, c.name AS category_name
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.id = ? LIMIT 1
  `).bind(id).first<Row>();
  if (!r) return c.json(errMsg('Article not found'), 404);
  return c.json({
    ...mapAdminArticle(r),
    content: r.content,
    plainText: r.plain_text,
    author: r.author,
    originalImageUrl: r.original_image_url,
    imageUrl: r.original_image_url,
  });
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

// PUT /:id/feature — toggle featured (matches legacy .NET; client sends no body)
adminArticlesRoutes.put('/:id/feature', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const cur = await c.env.DB.prepare('SELECT is_featured FROM news_articles WHERE id = ? LIMIT 1')
    .bind(id).first<{ is_featured: number }>();
  if (!cur) return c.json(errMsg('Article not found'), 404);
  const next = cur.is_featured === 1 ? 0 : 1;
  await c.env.DB.prepare('UPDATE news_articles SET is_featured = ?, updated_at = ? WHERE id = ?')
    .bind(next, nowIso(), id).run();
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Updated', isFeatured: next === 1 });
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

// POST /re-extract — backfill body content for articles with NULL content.
// Admin-only. Processes a small batch so a single call stays within Worker
// limits; call repeatedly to drain the backlog. Returns { processed, updated, failed }.
adminArticlesRoutes.post('/re-extract', requireRole('Admin'), async (c) => {
  const { extractArticleForSource } = await import('../lib/article-extractor');
  const limitParam = parseInt(c.req.query('limit') ?? '20');
  const limit = isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 30);

  const rows = await c.env.DB.prepare(`
    SELECT a.id, a.source_url, s.slug AS source_slug, s.base_url AS source_base_url
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    WHERE a.content IS NULL AND a.source_url IS NOT NULL AND a.source_url <> ''
    ORDER BY a.published_at DESC
    LIMIT ?
  `).bind(limit).all<{ id: number; source_url: string; source_slug: string; source_base_url: string }>();

  const articles = rows.results ?? [];
  let updated = 0;
  let failed = 0;

  // Bounded concurrency to keep CPU/wall-clock in check.
  const CONCURRENCY = 5;
  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (a) => {
        try {
          const res = await fetch(a.source_url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsPortalBot/1.0)' },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return null;
          const html = await res.text();
          return await extractArticleForSource(html, a.source_slug, a.source_base_url);
        } catch {
          return null;
        }
      })
    );
    for (let j = 0; j < batch.length; j++) {
      const body = results[j];
      if (!body) { failed++; continue; }
      await c.env.DB.prepare('UPDATE news_articles SET content = ?, plain_text = ?, updated_at = ? WHERE id = ?')
        .bind(body.contentHtml, body.plainText, nowIso(), batch[j].id).run();
      updated++;
    }
  }

  if (updated > 0) await invalidateNewsCache(c.env);
  return c.json({ processed: articles.length, updated, failed });
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
