import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errorResult, pagedResult, successResult } from '../lib/response';
import { paginate, nowIso, type Row } from '../lib/db';
import { cacheKeys, cacheOrCompute } from '../lib/cache';

export const newsRoutes = new Hono<Env>();

// ----------------------------------------------------------------------------
// Article row shape & mapping
// ----------------------------------------------------------------------------
type ArticleRow = {
  id: number;
  title: string;
  slug: string;
  canonical_url: string;
  summary: string | null;
  content: string | null;
  plain_text: string | null;
  source_url: string;
  original_image_url: string | null;
  mongo_image_id: string | null;
  mongo_thumb_id: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  view_count: number;
  is_featured: number;
  source_id: number;
  category_id: number | null;
  created_at: string;
  updated_at: string | null;
  is_active: number;
  // Joined columns
  source_name?: string | null;
  source_slug?: string | null;
  source_logo_url?: string | null;
  category_name?: string | null;
  category_name_bn?: string | null;
  category_slug?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
};

function mapArticle(row: ArticleRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    canonicalUrl: row.canonical_url,
    summary: row.summary,
    content: row.content,
    plainText: row.plain_text,
    sourceUrl: row.source_url,
    originalImageUrl: row.original_image_url,
    imageUrl: row.original_image_url, // alias used by frontend
    mongoImageId: row.mongo_image_id,
    mongoThumbId: row.mongo_thumb_id,
    author: row.author,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    viewCount: row.view_count,
    isFeatured: row.is_featured === 1,
    sourceId: row.source_id,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active === 1,
    source: row.source_name
      ? {
          id: row.source_id,
          name: row.source_name,
          slug: row.source_slug,
          logoUrl: row.source_logo_url,
        }
      : null,
    category: row.category_name
      ? {
          id: row.category_id,
          name: row.category_name,
          nameBn: row.category_name_bn,
          slug: row.category_slug,
          icon: row.category_icon,
          color: row.category_color,
        }
      : null,
  };
}

const ARTICLE_SELECT = `
  SELECT
    a.*,
    s.name AS source_name, s.slug AS source_slug, s.logo_url AS source_logo_url,
    c.name AS category_name, c.name_bn AS category_name_bn, c.slug AS category_slug,
    c.icon AS category_icon, c.color AS category_color
  FROM news_articles a
  INNER JOIN news_sources s ON s.id = a.source_id
  LEFT JOIN categories c ON c.id = a.category_id
`;

// ----------------------------------------------------------------------------
// GET /latest
// ----------------------------------------------------------------------------
newsRoutes.get('/latest', async (c) => {
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'));

  const result = await cacheOrCompute(
    c.env.CACHE_KV,
    cacheKeys.newsLatest(page, size),
    async () => {
      const [rows, countRow] = await Promise.all([
        c.env.DB.prepare(
          `${ARTICLE_SELECT}
           WHERE a.is_active = 1
           ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.id DESC
           LIMIT ? OFFSET ?`
        )
          .bind(size, offset)
          .all<ArticleRow>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1').first<{ count: number }>(),
      ]);

      const items = (rows.results ?? []).map(mapArticle);
      const totalCount = countRow?.count ?? 0;
      return pagedResult(items, totalCount, page, size);
    },
    { ttlSeconds: 120 }
  );

  return c.json(successResult(result));
});

// ----------------------------------------------------------------------------
// GET /featured?count=5
// ----------------------------------------------------------------------------
newsRoutes.get('/featured', async (c) => {
  const count = Math.min(100, Math.max(1, parseInt(c.req.query('count') ?? '5') || 5));

  const rows = await c.env.DB.prepare(
    `${ARTICLE_SELECT}
     WHERE a.is_active = 1 AND a.is_featured = 1
     ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
     LIMIT ?`
  )
    .bind(count)
    .all<ArticleRow>();

  return c.json(successResult((rows.results ?? []).map(mapArticle)));
});

// ----------------------------------------------------------------------------
// GET /category/:slug
// ----------------------------------------------------------------------------
newsRoutes.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug');
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'));

  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1')
    .bind(slug)
    .first<{ id: number }>();
  if (!category) return c.json(errorResult('Category not found'), 404);

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `${ARTICLE_SELECT}
       WHERE a.is_active = 1 AND a.category_id = ?
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ? OFFSET ?`
    )
      .bind(category.id, size, offset)
      .all<ArticleRow>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND category_id = ?')
      .bind(category.id)
      .first<{ count: number }>(),
  ]);

  return c.json(successResult(pagedResult((rows.results ?? []).map(mapArticle), countRow?.count ?? 0, page, size)));
});

// ----------------------------------------------------------------------------
// GET /source/:slug
// ----------------------------------------------------------------------------
newsRoutes.get('/source/:slug', async (c) => {
  const slug = c.req.param('slug');
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'));

  const source = await c.env.DB.prepare('SELECT id FROM news_sources WHERE slug = ? AND is_active = 1 LIMIT 1')
    .bind(slug)
    .first<{ id: number }>();
  if (!source) return c.json(errorResult('Source not found'), 404);

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `${ARTICLE_SELECT}
       WHERE a.is_active = 1 AND a.source_id = ?
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ? OFFSET ?`
    )
      .bind(source.id, size, offset)
      .all<ArticleRow>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND source_id = ?')
      .bind(source.id)
      .first<{ count: number }>(),
  ]);

  return c.json(successResult(pagedResult((rows.results ?? []).map(mapArticle), countRow?.count ?? 0, page, size)));
});

// ----------------------------------------------------------------------------
// GET /trending?count=12&hours=24
// ----------------------------------------------------------------------------
newsRoutes.get('/trending', async (c) => {
  const count = Math.min(100, Math.max(1, parseInt(c.req.query('count') ?? '12') || 12));
  const hours = Math.min(72, Math.max(1, parseInt(c.req.query('hours') ?? '24') || 24));

  const result = await cacheOrCompute(
    c.env.CACHE_KV,
    cacheKeys.newsTrending(count, hours),
    async () => {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const rows = await c.env.DB.prepare(
        `${ARTICLE_SELECT}
         WHERE a.is_active = 1
           AND COALESCE(a.published_at, a.fetched_at) >= ?
         ORDER BY a.view_count DESC, COALESCE(a.published_at, a.fetched_at) DESC
         LIMIT ?`
      )
        .bind(cutoff, count)
        .all<ArticleRow>();
      return (rows.results ?? []).map(mapArticle);
    },
    { ttlSeconds: 300 }
  );

  return c.json(successResult(result));
});

// ----------------------------------------------------------------------------
// GET /categories
// ----------------------------------------------------------------------------
newsRoutes.get('/categories', async (c) => {
  const result = await cacheOrCompute(
    c.env.CACHE_KV,
    cacheKeys.categories(),
    async () => {
      const rows = await c.env.DB.prepare(
        `SELECT id, name, name_bn, slug, description, icon, color, sort_order
         FROM categories
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`
      ).all<Row>();
      return (rows.results ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        nameBn: r.name_bn,
        slug: r.slug,
        description: r.description,
        icon: r.icon,
        color: r.color,
        sortOrder: r.sort_order,
      }));
    },
    { ttlSeconds: 600 }
  );
  return c.json(successResult(result));
});

// ----------------------------------------------------------------------------
// POST /search   body: { query, page, pageSize, sourceId?, categoryId?, dateFrom?, dateTo? }
// ----------------------------------------------------------------------------
newsRoutes.post('/search', async (c) => {
  const body = await c.req.json<{
    query?: string;
    page?: number;
    pageSize?: number;
    sourceId?: number;
    categoryId?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'newest' | 'oldest' | 'relevance';
  }>();

  const query = (body.query ?? '').trim();
  const page = Math.max(1, body.page ?? 1);
  const size = Math.min(100, Math.max(1, body.pageSize ?? 10));
  const offset = (page - 1) * size;

  const where: string[] = ['a.is_active = 1'];
  const binds: any[] = [];

  if (query) {
    where.push('(a.title LIKE ? OR a.summary LIKE ? OR a.plain_text LIKE ?)');
    const like = `%${query}%`;
    binds.push(like, like, like);
  }
  if (body.sourceId) {
    where.push('a.source_id = ?');
    binds.push(body.sourceId);
  }
  if (body.categoryId) {
    where.push('a.category_id = ?');
    binds.push(body.categoryId);
  }
  if (body.dateFrom) {
    where.push('COALESCE(a.published_at, a.fetched_at) >= ?');
    binds.push(body.dateFrom);
  }
  if (body.dateTo) {
    where.push('COALESCE(a.published_at, a.fetched_at) <= ?');
    binds.push(body.dateTo);
  }

  const whereSql = where.join(' AND ');
  const orderSql =
    body.sortBy === 'oldest'
      ? 'ORDER BY COALESCE(a.published_at, a.fetched_at) ASC'
      : 'ORDER BY COALESCE(a.published_at, a.fetched_at) DESC';

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`${ARTICLE_SELECT} WHERE ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
      .bind(...binds, size, offset)
      .all<ArticleRow>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM news_articles a WHERE ${whereSql}`)
      .bind(...binds)
      .first<{ count: number }>(),
  ]);

  return c.json(successResult(pagedResult((rows.results ?? []).map(mapArticle), countRow?.count ?? 0, page, size)));
});

// ----------------------------------------------------------------------------
// GET /:slug — article detail (also bumps view_count async)
// ----------------------------------------------------------------------------
newsRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  const row = await c.env.DB.prepare(`${ARTICLE_SELECT} WHERE a.slug = ? AND a.is_active = 1 LIMIT 1`)
    .bind(slug)
    .first<ArticleRow>();

  if (!row) return c.json(errorResult('Article not found'), 404);

  // Fire-and-forget view-count bump.
  c.executionCtx.waitUntil(
    c.env.DB.prepare('UPDATE news_articles SET view_count = view_count + 1 WHERE id = ?').bind(row.id).run()
  );

  return c.json(successResult(mapArticle(row)));
});

// ----------------------------------------------------------------------------
// GET /:slug/related?count=4
// ----------------------------------------------------------------------------
newsRoutes.get('/:slug/related', async (c) => {
  const slug = c.req.param('slug');
  const count = Math.min(10, Math.max(1, parseInt(c.req.query('count') ?? '4') || 4));

  const article = await c.env.DB.prepare(
    'SELECT id, category_id, source_id FROM news_articles WHERE slug = ? AND is_active = 1 LIMIT 1'
  )
    .bind(slug)
    .first<{ id: number; category_id: number | null; source_id: number }>();

  if (!article) return c.json(errorResult('Article not found'), 404);

  // Prefer same-category articles; fall back to same-source.
  const rows = await c.env.DB.prepare(
    `${ARTICLE_SELECT}
     WHERE a.is_active = 1
       AND a.id <> ?
       AND (a.category_id = ? OR a.source_id = ?)
     ORDER BY
       CASE WHEN a.category_id = ? THEN 0 ELSE 1 END,
       COALESCE(a.published_at, a.fetched_at) DESC
     LIMIT ?`
  )
    .bind(article.id, article.category_id, article.source_id, article.category_id, count)
    .all<ArticleRow>();

  return c.json(successResult((rows.results ?? []).map(mapArticle)));
});

// ----------------------------------------------------------------------------
// GET /stats/today
// ----------------------------------------------------------------------------
newsRoutes.get('/stats/today', async (c) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const row = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND fetched_at >= ?'
  )
    .bind(startOfDay.toISOString())
    .first<{ count: number }>();

  return c.json(successResult({ count: row?.count ?? 0, timestamp: nowIso() }));
});

// ----------------------------------------------------------------------------
// GET /daily-highlights?days=7
// ----------------------------------------------------------------------------
newsRoutes.get('/daily-highlights', async (c) => {
  const days = Math.min(30, Math.max(1, parseInt(c.req.query('days') ?? '7') || 7));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await c.env.DB.prepare(
    `${ARTICLE_SELECT}
     WHERE a.is_active = 1
       AND COALESCE(a.published_at, a.fetched_at) >= ?
     ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.view_count DESC
     LIMIT 200`
  )
    .bind(cutoff)
    .all<ArticleRow>();

  return c.json(successResult((rows.results ?? []).map(mapArticle)));
});
