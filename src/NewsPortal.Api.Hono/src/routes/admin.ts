import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { requireAuth, requireRole } from '../lib/auth';

export const adminRoutes = new Hono<Env>();

adminRoutes.use('*', requireAuth, requireRole('Admin'));

// ----------------------------------------------------------------------------
// GET /stats — top-line dashboard numbers (shape matches legacy .NET API)
// ----------------------------------------------------------------------------
adminRoutes.get('/stats', async (c) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [articles, sources, users, today, healthCounts, failedJobs, failedSources] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_sources WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM news_articles WHERE fetched_at >= ? AND is_active = 1')
      .bind(startOfDay.toISOString()).first<{ count: number }>(),
    c.env.DB.prepare(
      'SELECT health_status, COUNT(*) as count FROM news_sources WHERE is_active = 1 GROUP BY health_status'
    ).all<{ health_status: number; count: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM source_fetch_jobs WHERE status = 3 AND created_at >= ?'
    ).bind(oneDayAgo).first<{ count: number }>(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM news_sources WHERE is_active = 1 AND consecutive_failures >= circuit_breaker_threshold'
    ).first<{ count: number }>(),
  ]);

  // SourceHealthStatus: 0=Active, 1=Degraded, 2=Paused, 3=Disabled
  const health = { active: 0, degraded: 0, paused: 0, disabled: 0 };
  for (const row of healthCounts.results ?? []) {
    if (row.health_status === 0) health.active = row.count;
    else if (row.health_status === 1) health.degraded = row.count;
    else if (row.health_status === 2) health.paused = row.count;
    else if (row.health_status === 3) health.disabled = row.count;
  }

  return c.json({
    totalArticles: articles?.count ?? 0,
    totalSources: sources?.count ?? 0,
    totalUsers: users?.count ?? 0,
    articlesToday: today?.count ?? 0,
    sourceHealth: health,
    failedJobs24h: failedJobs?.count ?? 0,
    failedSources: failedSources?.count ?? 0,
  });
});

// ----------------------------------------------------------------------------
// GET /stats/charts — chart panels (dailyArticles, topArticles)
// ----------------------------------------------------------------------------
adminRoutes.get('/stats/charts', async (c) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [daily, top] = await Promise.all([
    c.env.DB.prepare(`
      SELECT substr(fetched_at, 1, 10) AS date, COUNT(*) as count
      FROM news_articles
      WHERE is_active = 1 AND fetched_at >= ?
      GROUP BY date ORDER BY date ASC
    `).bind(sevenDaysAgo).all<{ date: string; count: number }>(),
    c.env.DB.prepare(`
      SELECT title, view_count, slug
      FROM news_articles
      WHERE is_active = 1
      ORDER BY view_count DESC
      LIMIT 10
    `).all<{ title: string; view_count: number; slug: string }>(),
  ]);

  return c.json({
    dailyArticles: (daily.results ?? []).map((r) => ({ date: r.date, count: r.count })),
    topArticles: (top.results ?? []).map((r) => ({ title: r.title, viewCount: r.view_count, slug: r.slug })),
  });
});

// ----------------------------------------------------------------------------
// GET /chart-stats — kept for backwards compatibility (older clients)
// ----------------------------------------------------------------------------
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
