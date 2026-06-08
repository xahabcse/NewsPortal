import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { paged, errMsg } from '../lib/response';
import { nowIso, paginate, type Row } from '../lib/db';
import { cacheKeys, cacheOrCompute, cacheInvalidatePrefix } from '../lib/cache';

export const newsRoutes = new Hono<Env>();

// ----------------------------------------------------------------------------
// Article row shape & mapping  — matches the legacy .NET DTO field-for-field.
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
  duplicate_of: number | null;
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
  // Flat shape used by NewsArticle list cards in the React client.
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
    thumbnailUrl: row.original_image_url, // frontend's NewsArticle.thumbnailUrl
    imageUrl: row.original_image_url,
    author: row.author,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    viewCount: row.view_count,
    isFeatured: row.is_featured === 1,
    sourceId: row.source_id,
    categoryId: row.category_id,
    sourceName: row.source_name ?? null,
    sourceSlug: row.source_slug ?? null,
    sourceLogoUrl: row.source_logo_url ?? null,
    categoryName: row.category_name ?? null,
    categoryNameBn: row.category_name_bn ?? null,
    categorySlug: row.category_slug ?? null,
    categoryIcon: row.category_icon ?? null,
    categoryColor: row.category_color ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    alsoOn: [] as string[], // cross-source duplicates' source names; filled by withAlsoOn()
  };
}

/**
 * For a page of PRIMARY articles, attach the source names of their cross-source
 * duplicates (the "also on <source>" hint). One extra D1 read for the whole page.
 */
async function withAlsoOn<T extends { id: number; sourceName: string | null; alsoOn: string[] }>(
  env: Env['Bindings'],
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return items;
  const placeholders = items.map(() => '?').join(',');
  const rows = await env.DB.prepare(
    `SELECT a.duplicate_of AS pid, GROUP_CONCAT(DISTINCT s.name) AS srcs
     FROM news_articles a
     INNER JOIN news_sources s ON s.id = a.source_id
     WHERE a.is_active = 1 AND a.duplicate_of IN (${placeholders})
     GROUP BY a.duplicate_of`
  ).bind(...items.map((i) => i.id)).all<{ pid: number; srcs: string | null }>();

  const byPrimary = new Map<number, string[]>();
  for (const r of rows.results ?? []) {
    byPrimary.set(r.pid, (r.srcs ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  }
  // Exclude the primary's OWN source — "also on" should only name OTHER outlets, so a
  // collapsed same-source duplicate shows no (redundant) hint, only true cross-source ones.
  for (const it of items) it.alsoOn = (byPrimary.get(it.id) ?? []).filter((name) => name !== it.sourceName);
  return items;
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
           WHERE a.is_active = 1 AND a.duplicate_of IS NULL
           ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.id DESC
           LIMIT ? OFFSET ?`
        ).bind(size, offset).all<ArticleRow>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND duplicate_of IS NULL').first<{ count: number }>(),
      ]);
      const items = await withAlsoOn(c.env, (rows.results ?? []).map(mapArticle));
      return paged(items, countRow?.count ?? 0, page, size);
    },
    { ttlSeconds: 120 }
  );

  return c.json(result);
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
  ).bind(count).all<ArticleRow>();
  return c.json((rows.results ?? []).map(mapArticle));
});

// ----------------------------------------------------------------------------
// GET /category/:slug
// ----------------------------------------------------------------------------
newsRoutes.get('/category/:slug', async (c) => {
  const slug = c.req.param('slug');
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'));

  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1')
    .bind(slug).first<{ id: number }>();
  if (!category) return c.json(errMsg('Category not found'), 404);

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `${ARTICLE_SELECT}
       WHERE a.is_active = 1 AND a.duplicate_of IS NULL AND a.category_id = ?
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ? OFFSET ?`
    ).bind(category.id, size, offset).all<ArticleRow>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND duplicate_of IS NULL AND category_id = ?')
      .bind(category.id).first<{ count: number }>(),
  ]);

  return c.json(paged(await withAlsoOn(c.env, (rows.results ?? []).map(mapArticle)), countRow?.count ?? 0, page, size));
});

// ----------------------------------------------------------------------------
// GET /source/:slug
// ----------------------------------------------------------------------------
newsRoutes.get('/source/:slug', async (c) => {
  const slug = c.req.param('slug');
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'));

  const source = await c.env.DB.prepare('SELECT id FROM news_sources WHERE slug = ? AND is_active = 1 LIMIT 1')
    .bind(slug).first<{ id: number }>();
  if (!source) return c.json(errMsg('Source not found'), 404);

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(
      `${ARTICLE_SELECT}
       WHERE a.is_active = 1 AND a.source_id = ?
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ? OFFSET ?`
    ).bind(source.id, size, offset).all<ArticleRow>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND source_id = ?')
      .bind(source.id).first<{ count: number }>(),
  ]);

  return c.json(paged((rows.results ?? []).map(mapArticle), countRow?.count ?? 0, page, size));
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
         WHERE a.is_active = 1 AND a.duplicate_of IS NULL
           AND COALESCE(a.published_at, a.fetched_at) >= ?
         ORDER BY a.view_count DESC, COALESCE(a.published_at, a.fetched_at) DESC
         LIMIT ?`
      ).bind(cutoff, count).all<ArticleRow>();
      return await withAlsoOn(c.env, (rows.results ?? []).map(mapArticle));
    },
    { ttlSeconds: 300 }
  );
  return c.json(result);
});

// ----------------------------------------------------------------------------
// GET /categories
// ----------------------------------------------------------------------------
newsRoutes.get('/categories', async (c) => {
  const result = await cacheOrCompute(
    c.env.CACHE_KV,
    cacheKeys.categories(),
    async () => {
      // Join with news_articles to compute live article counts per category.
      const rows = await c.env.DB.prepare(
        `SELECT c.id, c.name, c.name_bn, c.slug, c.description, c.icon, c.color, c.sort_order,
                COUNT(a.id) AS article_count
         FROM categories c
         LEFT JOIN news_articles a ON a.category_id = c.id AND a.is_active = 1
         WHERE c.is_active = 1
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.id ASC`
      ).all<Row>();
      return (rows.results ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        nameBn: r.name_bn,
        slug: r.slug,
        description: r.description,
        icon: r.icon,
        color: r.color,
        articleCount: r.article_count ?? 0,
        sortOrder: r.sort_order,
      }));
    },
    { ttlSeconds: 600 }
  );
  return c.json(result);
});

// ----------------------------------------------------------------------------
// GET /filter — multi-filter homepage feed
// Query: sourceIds[], categoryIds[], dateFrom, dateTo, sortBy, hasThumbnail, page, pageSize
// ----------------------------------------------------------------------------
newsRoutes.get('/filter', async (c) => {
  const url = new URL(c.req.url);
  const sourceIds = url.searchParams.getAll('sourceIds').map((v) => parseInt(v)).filter((n) => !isNaN(n));
  const categoryIds = url.searchParams.getAll('categoryIds').map((v) => parseInt(v)).filter((n) => !isNaN(n));
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const sortBy = url.searchParams.get('sortBy') ?? 'newest';
  const hasThumbnail = url.searchParams.get('hasThumbnail') === 'true';
  const { page, size, offset } = paginate(url.searchParams.get('page') ?? undefined, url.searchParams.get('pageSize') ?? undefined);

  // Browse feed → show one card per story (primaries only); secondaries surface as "also on".
  const where: string[] = ['a.is_active = 1', 'a.duplicate_of IS NULL'];
  const binds: any[] = [];

  if (sourceIds.length) {
    where.push(`a.source_id IN (${sourceIds.map(() => '?').join(',')})`);
    binds.push(...sourceIds);
  }
  if (categoryIds.length) {
    where.push(`a.category_id IN (${categoryIds.map(() => '?').join(',')})`);
    binds.push(...categoryIds);
  }
  if (dateFrom) {
    where.push('COALESCE(a.published_at, a.fetched_at) >= ?');
    binds.push(dateFrom);
  }
  if (dateTo) {
    where.push('COALESCE(a.published_at, a.fetched_at) <= ?');
    // dateTo is a date-only string (YYYY-MM-DD); make it inclusive of the whole day,
    // otherwise timestamped articles on that day (e.g. "...T08:01Z") are excluded and
    // single-day presets like "Today" return nothing.
    binds.push(dateTo.length === 10 ? `${dateTo}T23:59:59.999Z` : dateTo);
  }
  if (hasThumbnail) {
    where.push('a.original_image_url IS NOT NULL');
  }

  const orderSql =
    sortBy === 'oldest'
      ? 'ORDER BY COALESCE(a.published_at, a.fetched_at) ASC'
      : sortBy === 'mostviewed'
        ? 'ORDER BY a.view_count DESC, COALESCE(a.published_at, a.fetched_at) DESC'
        : 'ORDER BY COALESCE(a.published_at, a.fetched_at) DESC';

  const whereSql = where.join(' AND ');

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`${ARTICLE_SELECT} WHERE ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
      .bind(...binds, size, offset).all<ArticleRow>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM news_articles a WHERE ${whereSql}`)
      .bind(...binds).first<{ count: number }>(),
  ]);

  return c.json(paged(await withAlsoOn(c.env, (rows.results ?? []).map(mapArticle)), countRow?.count ?? 0, page, size));
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
    binds.push(body.dateTo.length === 10 ? `${body.dateTo}T23:59:59.999Z` : body.dateTo);
  }

  const whereSql = where.join(' AND ');
  const orderSql =
    body.sortBy === 'oldest'
      ? 'ORDER BY COALESCE(a.published_at, a.fetched_at) ASC'
      : 'ORDER BY COALESCE(a.published_at, a.fetched_at) DESC';

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`${ARTICLE_SELECT} WHERE ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
      .bind(...binds, size, offset).all<ArticleRow>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM news_articles a WHERE ${whereSql}`)
      .bind(...binds).first<{ count: number }>(),
  ]);

  return c.json(paged((rows.results ?? []).map(mapArticle), countRow?.count ?? 0, page, size));
});

// ----------------------------------------------------------------------------
// GET /daily-highlights?days=7
// ----------------------------------------------------------------------------
newsRoutes.get('/daily-highlights', async (c) => {
  const days = Math.min(30, Math.max(1, parseInt(c.req.query('days') ?? '7') || 7));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Per-category top article per day. Heavy query but capped at 30 days × 10 categories.
  const rows = await c.env.DB.prepare(
    `${ARTICLE_SELECT}
     WHERE a.is_active = 1
       AND COALESCE(a.published_at, a.fetched_at) >= ?
     ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.view_count DESC
     LIMIT 500`
  ).bind(cutoff).all<ArticleRow>();

  // Group into { date, highlights: [{ categoryId, ..., articleId, ... }] }
  const byDay: Record<string, any[]> = {};
  const seenCategoryPerDay: Record<string, Set<number>> = {};
  for (const r of rows.results ?? []) {
    const ts = r.published_at ?? r.fetched_at;
    const date = ts.slice(0, 10);
    if (!byDay[date]) {
      byDay[date] = [];
      seenCategoryPerDay[date] = new Set();
    }
    if (r.category_id == null || seenCategoryPerDay[date].has(r.category_id)) continue;
    seenCategoryPerDay[date].add(r.category_id);
    byDay[date].push({
      categoryId: r.category_id,
      categoryName: r.category_name ?? '',
      categoryNameBn: r.category_name_bn ?? '',
      categorySlug: r.category_slug ?? '',
      categoryIcon: r.category_icon ?? null,
      categoryColor: r.category_color ?? null,
      articleId: r.id,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      sourceId: r.source_id,
      sourceName: r.source_name ?? '',
      publishedAt: r.published_at,
      viewCount: r.view_count,
    });
  }

  const result = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, highlights]) => ({ date, highlights }));

  return c.json(result);
});

// ----------------------------------------------------------------------------
// GET /stats/today
// ----------------------------------------------------------------------------
newsRoutes.get('/stats/today', async (c) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const row = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND fetched_at >= ?'
  ).bind(startOfDay.toISOString()).first<{ count: number }>();
  return c.json({ count: row?.count ?? 0, timestamp: nowIso() });
});

// ----------------------------------------------------------------------------
// GET /:slug — article detail (also bumps view_count async)
// IMPORTANT: keep this AFTER all static prefixes so it doesn't shadow them.
// ----------------------------------------------------------------------------
newsRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  // Reject reserved single-segment paths so we don't accidentally hit them here.
  if (['latest', 'featured', 'trending', 'categories', 'filter', 'search', 'daily-highlights', 'stats'].includes(slug)) {
    return c.json(errMsg('Not found'), 404);
  }

  const row = await c.env.DB.prepare(`${ARTICLE_SELECT} WHERE a.slug = ? AND a.is_active = 1 LIMIT 1`)
    .bind(slug).first<ArticleRow>();

  if (!row) return c.json(errMsg('Article not found'), 404);

  c.executionCtx.waitUntil(
    c.env.DB.prepare('UPDATE news_articles SET view_count = view_count + 1 WHERE id = ?').bind(row.id).run()
  );

  return c.json(mapArticle(row));
});

// ----------------------------------------------------------------------------
// GET /:slug/related?count=4
// ----------------------------------------------------------------------------
newsRoutes.get('/:slug/related', async (c) => {
  const slug = c.req.param('slug');
  const count = Math.min(10, Math.max(1, parseInt(c.req.query('count') ?? '4') || 4));

  const article = await c.env.DB.prepare(
    'SELECT id, category_id, source_id FROM news_articles WHERE slug = ? AND is_active = 1 LIMIT 1'
  ).bind(slug).first<{ id: number; category_id: number | null; source_id: number }>();

  if (!article) return c.json(errMsg('Article not found'), 404);

  const rows = await c.env.DB.prepare(
    `${ARTICLE_SELECT}
     WHERE a.is_active = 1 AND a.id <> ?
       AND (a.category_id = ? OR a.source_id = ?)
     ORDER BY
       CASE WHEN a.category_id = ? THEN 0 ELSE 1 END,
       COALESCE(a.published_at, a.fetched_at) DESC
     LIMIT ?`
  ).bind(article.id, article.category_id, article.source_id, article.category_id, count).all<ArticleRow>();

  return c.json((rows.results ?? []).map(mapArticle));
});

// ----------------------------------------------------------------------------
// POST /invalidate-cache — internal, called after writes
// ----------------------------------------------------------------------------
export async function invalidateNewsCache(env: Env['Bindings']) {
  await Promise.all([
    cacheInvalidatePrefix(env.CACHE_KV, 'news:'),
    cacheInvalidatePrefix(env.CACHE_KV, 'categories:'),
  ]);
}
