import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { requireAuth, requireRole } from '../lib/auth';

export const adminRoutes = new Hono<Env>();

adminRoutes.use('*', requireAuth, requireRole('Admin'));

// GET /stats — top-line dashboard numbers
adminRoutes.get('/stats', async (c) => {
  const [articles, sources, categories, users, today] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_sources WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM categories WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first<{ count: number }>(),
    (async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      return c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE fetched_at >= ? AND is_active = 1')
        .bind(start.toISOString()).first<{ count: number }>();
    })(),
  ]);

  return c.json({
    totalArticles: articles?.count ?? 0,
    totalSources: sources?.count ?? 0,
    totalCategories: categories?.count ?? 0,
    totalUsers: users?.count ?? 0,
    articlesToday: today?.count ?? 0,
  });
});

// GET /chart-stats — for dashboard chart panels
adminRoutes.get('/chart-stats', async (c) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [byDay, byCategory, bySource] = await Promise.all([
    c.env.DB.prepare(`
      SELECT substr(fetched_at, 1, 10) AS day, COUNT(*) as count
      FROM news_articles
      WHERE is_active = 1 AND fetched_at >= ?
      GROUP BY day ORDER BY day ASC
    `).bind(sevenDaysAgo).all<{ day: string; count: number }>(),
    c.env.DB.prepare(`
      SELECT c.name AS category_name, c.color, COUNT(a.id) as count
      FROM categories c LEFT JOIN news_articles a ON a.category_id = c.id AND a.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id ORDER BY count DESC
    `).all<{ category_name: string; color: string | null; count: number }>(),
    c.env.DB.prepare(`
      SELECT s.name AS source_name, s.health_status, COUNT(a.id) as count
      FROM news_sources s LEFT JOIN news_articles a ON a.source_id = s.id AND a.is_active = 1
      WHERE s.is_active = 1
      GROUP BY s.id ORDER BY count DESC LIMIT 10
    `).all<{ source_name: string; health_status: number; count: number }>(),
  ]);

  return c.json({
    articlesByDay: (byDay.results ?? []).map((r) => ({ day: r.day, count: r.count })),
    articlesByCategory: (byCategory.results ?? []).map((r) => ({ name: r.category_name, color: r.color, count: r.count })),
    sourceHealth: (bySource.results ?? []).map((r) => ({ name: r.source_name, healthStatus: r.health_status, count: r.count })),
  });
});
