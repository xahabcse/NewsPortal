import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { requireAuth, requireRole } from '../lib/auth';
import type { Row } from '../lib/db';

export const analyticsRoutes = new Hono<Env>();

analyticsRoutes.use('*', requireAuth, requireRole('Admin'));

// GET /overview — high-level counters for the analytics dashboard
analyticsRoutes.get('/overview', async (c) => {
  const [total, today, week, month, totalViews] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1').first<{ count: number }>(),
    (async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      return c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND fetched_at >= ?')
        .bind(start.toISOString()).first<{ count: number }>();
    })(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND fetched_at >= ?')
      .bind(new Date(Date.now() - 7 * 86400000).toISOString()).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND fetched_at >= ?')
      .bind(new Date(Date.now() - 30 * 86400000).toISOString()).first<{ count: number }>(),
    c.env.DB.prepare('SELECT SUM(view_count) as total FROM news_articles WHERE is_active = 1').first<{ total: number | null }>(),
  ]);

  return c.json({
    totalArticles: total?.count ?? 0,
    articlesToday: today?.count ?? 0,
    articlesThisWeek: week?.count ?? 0,
    articlesThisMonth: month?.count ?? 0,
    totalViews: totalViews?.total ?? 0,
  });
});

// GET /articles/daily?days=30
analyticsRoutes.get('/articles/daily', async (c) => {
  const days = Math.min(90, Math.max(1, parseInt(c.req.query('days') ?? '30') || 30));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const rows = await c.env.DB.prepare(`
    SELECT substr(fetched_at, 1, 10) AS day,
           COUNT(*) as articles,
           SUM(view_count) as views
    FROM news_articles
    WHERE is_active = 1 AND fetched_at >= ?
    GROUP BY day ORDER BY day ASC
  `).bind(cutoff).all<{ day: string; articles: number; views: number | null }>();

  return c.json((rows.results ?? []).map((r) => ({ day: r.day, articles: r.articles, views: r.views ?? 0 })));
});

// GET /categories/performance
analyticsRoutes.get('/categories/performance', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT c.id, c.name, c.color,
           COUNT(a.id) as articles,
           SUM(a.view_count) as views
    FROM categories c LEFT JOIN news_articles a ON a.category_id = c.id AND a.is_active = 1
    WHERE c.is_active = 1
    GROUP BY c.id ORDER BY views DESC NULLS LAST
  `).all<{ id: number; name: string; color: string | null; articles: number; views: number | null }>();

  return c.json((rows.results ?? []).map((r) => ({
    categoryId: r.id, name: r.name, color: r.color,
    articleCount: r.articles, totalViews: r.views ?? 0,
  })));
});

// GET /sources/performance
analyticsRoutes.get('/sources/performance', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT s.id, s.name, s.health_status,
           COUNT(a.id) as articles,
           SUM(a.view_count) as views
    FROM news_sources s LEFT JOIN news_articles a ON a.source_id = s.id AND a.is_active = 1
    WHERE s.is_active = 1
    GROUP BY s.id ORDER BY articles DESC
  `).all<{ id: number; name: string; health_status: number; articles: number; views: number | null }>();

  return c.json((rows.results ?? []).map((r) => ({
    sourceId: r.id, name: r.name, healthStatus: r.health_status,
    articleCount: r.articles, totalViews: r.views ?? 0,
  })));
});

// GET /articles/top?count=10&days=7
analyticsRoutes.get('/articles/top', async (c) => {
  const count = Math.min(50, Math.max(1, parseInt(c.req.query('count') ?? '10') || 10));
  const days = Math.min(90, Math.max(1, parseInt(c.req.query('days') ?? '7') || 7));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const rows = await c.env.DB.prepare(`
    SELECT a.id, a.title, a.slug, a.view_count, a.published_at, a.fetched_at,
           s.name AS source_name, c.name AS category_name
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.is_active = 1 AND a.fetched_at >= ?
    ORDER BY a.view_count DESC LIMIT ?
  `).bind(cutoff, count).all<Row>();

  return c.json((rows.results ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    viewCount: r.view_count,
    publishedAt: r.published_at,
    sourceName: r.source_name,
    categoryName: r.category_name,
  })));
});

// GET /articles/hourly — last-24-hour breakdown
analyticsRoutes.get('/articles/hourly', async (c) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await c.env.DB.prepare(`
    SELECT substr(fetched_at, 1, 13) AS hour, COUNT(*) as count
    FROM news_articles
    WHERE is_active = 1 AND fetched_at >= ?
    GROUP BY hour ORDER BY hour ASC
  `).bind(cutoff).all<{ hour: string; count: number }>();
  return c.json((rows.results ?? []).map((r) => ({ hour: r.hour, count: r.count })));
});
