import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso, paginate, type Row } from '../lib/db';
import { invalidateNewsCache } from './news';
import { makeSlug, uniqueSlug } from '../lib/slug';

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

// POST /set-duplicates — bulk-tag cross-source duplicates: point each secondary article
// at its primary (the original story). Used by the one-time dedup backfill; clustering is
// computed client-side (Workers have a tight CPU budget), so this endpoint only APPLIES
// the result. Only tags rows that are currently primaries, so it can't create chains.
adminArticlesRoutes.post('/set-duplicates', requireRole('Admin'), async (c) => {
  const body = await c.req.json<{ pairs?: { secondaryId?: number; primaryId?: number }[] }>();
  const pairs = (body.pairs ?? []).filter(
    (p) => Number.isInteger(p.secondaryId) && Number.isInteger(p.primaryId) && p.secondaryId !== p.primaryId
  );
  if (pairs.length === 0) return c.json(errMsg('pairs[] required'), 400);
  if (pairs.length > 1000) return c.json(errMsg('too many pairs (max 1000 per call)'), 400);

  const stmts = pairs.map((p) =>
    c.env.DB.prepare('UPDATE news_articles SET duplicate_of = ? WHERE id = ? AND duplicate_of IS NULL')
      .bind(p.primaryId, p.secondaryId)
  );
  const results = await c.env.DB.batch(stmts);
  const updated = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Duplicates tagged', updated, requested: pairs.length });
});

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

  const now = nowIso();
  const canonicalUrl = body.canonicalUrl ?? body.sourceUrl ?? `${makeSlug(body.title) || 'article'}-${Date.now()}`;

  // uniqueSlug is collision-free by construction (title + a short hash of the
  // canonical URL), so we avoid the ~98 sequential SELECTs of the old probe loop.
  // An explicit slug in the body still wins.
  const slug = body.slug?.trim() || uniqueSlug(body.title, canonicalUrl);

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

  const result = await c.env.DB.prepare(
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
  if (result.meta.changes === 0) return c.json(errMsg('Article not found'), 404);

  await invalidateNewsCache(c.env);
  return c.body(null, 204);
});

// PUT /:id/feature — toggle featured (matches legacy .NET; client sends no body)
adminArticlesRoutes.put('/:id/feature', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const current = await c.env.DB.prepare('SELECT is_featured FROM news_articles WHERE id = ? LIMIT 1')
    .bind(id).first<{ is_featured: number }>();
  if (!current) return c.json(errMsg('Article not found'), 404);
  const next = current.is_featured === 1 ? 0 : 1;
  await c.env.DB.prepare('UPDATE news_articles SET is_featured = ?, updated_at = ? WHERE id = ?')
    .bind(next, nowIso(), id).run();
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Updated', isFeatured: next === 1 });
});

// POST /:id/hide
adminArticlesRoutes.post('/:id/hide', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const result = await c.env.DB.prepare('UPDATE news_articles SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('Article not found'), 404);
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Hidden' });
});

// POST /:id/show
adminArticlesRoutes.post('/:id/show', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const result = await c.env.DB.prepare('UPDATE news_articles SET is_active = 1, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('Article not found'), 404);
  await invalidateNewsCache(c.env);
  return c.json({ message: 'Restored' });
});

// DELETE /:id
adminArticlesRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const result = await c.env.DB.prepare('UPDATE news_articles SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('Article not found'), 404);
  await invalidateNewsCache(c.env);
  return c.body(null, 204);
});

// POST /re-extract — backfill body content for articles with NULL content.
// Admin-only. Processes a small batch so a single call stays within Worker
// limits; call repeatedly to drain the backlog. Returns { processed, updated, failed }.
adminArticlesRoutes.post('/re-extract', requireRole('Admin'), async (c) => {
  const { extractArticleForSource } = await import('../lib/article-extractor');
  const { SPA_SOURCE_SLUGS, normalizeArticleUrl, BODY_FETCH_UA } = await import('../lib/source-selectors');
  const limitParam = parseInt(c.req.query('limit') ?? '5');
  // Each item is a full HTMLRewriter parse (~CPU). On the free plan (10ms CPU/invocation)
  // keep the batch tiny; call repeatedly to drain. SPA sources are excluded (unextractable).
  const limit = isNaN(limitParam) ? 5 : Math.min(Math.max(limitParam, 1), 6);

  const spaFilter = SPA_SOURCE_SLUGS.length ? `AND s.slug NOT IN (${SPA_SOURCE_SLUGS.map(() => '?').join(',')})` : '';
  const rows = await c.env.DB.prepare(`
    SELECT a.id, a.source_url, s.slug AS source_slug, s.base_url AS source_base_url
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    WHERE a.content IS NULL AND a.source_url IS NOT NULL AND a.source_url <> ''
      ${spaFilter}
    ORDER BY a.published_at DESC
    LIMIT ?
  `).bind(...SPA_SOURCE_SLUGS, limit).all<{ id: number; source_url: string; source_slug: string; source_base_url: string }>();

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
          const res = await fetch(normalizeArticleUrl(a.source_slug, a.source_url), {
            headers: { 'User-Agent': BODY_FETCH_UA },
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok === false) return null;
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
adminArticlesRoutes.post('/auto-categorize', requireRole('Admin'), async (c) => {
  const { categorize } = await import('../lib/categorizer');
  const articles = await c.env.DB.prepare(
    'SELECT id, title, summary, plain_text FROM news_articles WHERE is_active = 1 AND category_id IS NULL LIMIT 100'
  ).all<{ id: number; title: string; summary: string | null; plain_text: string | null }>();

  const categories = await c.env.DB.prepare('SELECT id, slug FROM categories WHERE is_active = 1').all<{ id: number; slug: string }>();
  const bySlug = new Map(categories.results?.map((c) => [c.slug, c.id]));

  // categorize() is pure/in-memory; collect the matching UPDATEs and apply them
  // in a single DB.batch() (one subrequest) instead of one .run() per row.
  const now = nowIso();
  const stmts: D1PreparedStatement[] = [];
  for (const a of articles.results ?? []) {
    const slug = categorize(`${a.title}\n${a.summary ?? ''}\n${a.plain_text ?? ''}`);
    const catId = bySlug.get(slug);
    if (!catId) continue;
    stmts.push(
      c.env.DB.prepare('UPDATE news_articles SET category_id = ?, updated_at = ? WHERE id = ?')
        .bind(catId, now, a.id)
    );
  }

  let updated = 0;
  if (stmts.length > 0) {
    const results = await c.env.DB.batch(stmts);
    updated = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
    await invalidateNewsCache(c.env);
  }
  return c.json({ processed: articles.results?.length ?? 0, updated });
});
