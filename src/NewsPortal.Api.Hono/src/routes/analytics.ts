import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { requireAuth, requireRole } from '../lib/auth';
import type { Row } from '../lib/db';

export const analyticsRoutes = new Hono<Env>();

analyticsRoutes.use('*', requireAuth, requireRole('Admin'));

// GET /overview — high-level counters for the analytics dashboard.
// Field names match the legacy .NET AnalyticsController contract the client expects.
analyticsRoutes.get('/overview', async (c) => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [total, comments, users, sources, articlesToday, commentsToday, totalViews] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM comments WHERE is_active = 1 AND is_deleted = 0').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_sources WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1 AND fetched_at >= ?')
      .bind(todayIso).first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM comments WHERE is_active = 1 AND is_deleted = 0 AND created_at >= ?')
      .bind(todayIso).first<{ count: number }>(),
    c.env.DB.prepare('SELECT SUM(view_count) as total FROM news_articles WHERE is_active = 1').first<{ total: number | null }>(),
  ]);

  return c.json({
    totalArticles: total?.count ?? 0,
    totalComments: comments?.count ?? 0,
    totalUsers: users?.count ?? 0,
    totalSources: sources?.count ?? 0,
    articlesToday: articlesToday?.count ?? 0,
    commentsToday: commentsToday?.count ?? 0,
    totalViews: totalViews?.total ?? 0,
  });
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  // Client (legacy contract) expects { date: "MMM dd", count, views }.
  return c.json((rows.results ?? []).map((r) => {
    const d = new Date(`${r.day}T00:00:00Z`);
    const label = `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
    return { date: label, count: r.articles, views: r.views ?? 0 };
  }));
});

// GET /categories/performance
analyticsRoutes.get('/categories/performance', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT c.id, c.name, c.color,
           COUNT(a.id) as articles,
           SUM(a.view_count) as views
    FROM categories c LEFT JOIN news_articles a ON a.category_id = c.id AND a.is_active = 1
    WHERE c.is_active = 1
    GROUP BY c.id ORDER BY articles DESC
  `).all<{ id: number; name: string; color: string | null; articles: number; views: number | null }>();

  // Client (legacy contract) expects { name, articles, views, color }, only non-empty.
  return c.json((rows.results ?? [])
    .filter((r) => r.articles > 0)
    .map((r) => ({ name: r.name, articles: r.articles, views: r.views ?? 0, color: r.color ?? '#6366f1' })));
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

  // Client (legacy contract) expects { name, articles, views }, only non-empty.
  return c.json((rows.results ?? [])
    .filter((r) => r.articles > 0)
    .map((r) => ({ name: r.name, articles: r.articles, views: r.views ?? 0 })));
});

// GET /articles/top?count=10 — most-viewed articles (all-time, view_count > 0)
analyticsRoutes.get('/articles/top', async (c) => {
  const count = Math.min(50, Math.max(1, parseInt(c.req.query('count') ?? '10') || 10));

  const rows = await c.env.DB.prepare(`
    SELECT a.id, a.title, a.slug, a.view_count, a.published_at, a.fetched_at,
           s.name AS source_name, c.name AS category_name
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.is_active = 1 AND a.view_count > 0
    ORDER BY a.view_count DESC LIMIT ?
  `).bind(count).all<Row>();

  // Client (legacy contract) expects { title (<=50 chars), views, slug, source, category }.
  return c.json((rows.results ?? []).map((r) => {
    const title = (r.title as string) ?? '';
    return {
      title: title.length > 50 ? `${title.slice(0, 50)}...` : title,
      views: r.view_count,
      slug: r.slug,
      source: r.source_name ?? 'Unknown',
      category: r.category_name ?? 'General',
    };
  }));
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

// GET /engagement/hourly — comment activity by hour-of-day over the last 7 days.
// Returns a zero-filled 0..23 series: [{ hour: number, comments: number }].
analyticsRoutes.get('/engagement/hourly', async (c) => {
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const rows = await c.env.DB.prepare(`
    SELECT CAST(substr(created_at, 12, 2) AS INTEGER) AS hour, COUNT(*) as comments
    FROM comments
    WHERE is_active = 1 AND is_deleted = 0 AND created_at >= ?
    GROUP BY hour
  `).bind(cutoff).all<{ hour: number; comments: number }>();

  const byHour = new Map((rows.results ?? []).map((r) => [r.hour, r.comments]));
  const series = Array.from({ length: 24 }, (_, h) => ({ hour: h, comments: byHour.get(h) ?? 0 }));
  return c.json(series);
});
