import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { Env } from './lib/env';

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { newsRoutes } from './routes/news';
import { feedRoutes } from './routes/feed';
import { sitemapRoutes } from './routes/sitemap';
import { robotsRoutes } from './routes/robots';

import { bookmarksRoutes } from './routes/bookmarks';
import { readHistoryRoutes } from './routes/read-history';
import { reactionsRoutes } from './routes/reactions';
import { reportsRoutes } from './routes/reports';
import { commentsRoutes } from './routes/comments';

import { newsSourcesRoutes } from './routes/news-sources';
import { fetchJobsRoutes } from './routes/fetch-jobs';

import { adminRoutes } from './routes/admin';
import { analyticsRoutes } from './routes/analytics';
import { userManagementRoutes } from './routes/user-management';
import { adminArticlesRoutes } from './routes/admin-articles';

import { imagesRoutes } from './routes/images';
import { aiRoutes } from './routes/ai';
import { sseRoutes } from './routes/sse';

import { runScheduledFetch } from './jobs/fetch-news';

const app = new Hono<Env>();

// ----------------------------------------------------------------------------
// CORS — parse the comma-separated allowlist from CORS_ORIGINS.
// ----------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const allowed = (c.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = c.req.header('Origin');
  const resolvedOrigin =
    !origin || allowed.length === 0
      ? '*'
      : allowed.includes(origin)
        ? origin
        : allowed[0];

  return cors({
    origin: resolvedOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })(c, next);
});

// ----------------------------------------------------------------------------
// Routes — `/api/v1/...` namespace mirrors the legacy ASP.NET Core API.
// ----------------------------------------------------------------------------
app.route('/', healthRoutes);

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/news', newsRoutes);
app.route('/api/v1/feed', feedRoutes);

// Engagement
app.route('/api/v1/bookmarks', bookmarksRoutes);
app.route('/api/v1/readhistory', readHistoryRoutes);
app.route('/api/v1/reactions', reactionsRoutes);
app.route('/api/v1/reports', reportsRoutes);
app.route('/api/v1/comments', commentsRoutes);

// News sources & fetch jobs (frontend uses /newssources, not /news-sources)
app.route('/api/v1/newssources', newsSourcesRoutes);
app.route('/api/v1/fetchjobs', fetchJobsRoutes);

// Admin & analytics
app.route('/api/v1/admin', adminRoutes);
app.route('/api/v1/analytics', analyticsRoutes);
app.route('/api/v1/usermanagement', userManagementRoutes);
app.route('/api/v1/adminarticles', adminArticlesRoutes);

// Phase 4: images
app.route('/api/v1/images', imagesRoutes);

// Phase 5: AI
app.route('/api/v1/ai', aiRoutes);

// Phase 6: SSE realtime
app.route('/api/v1/sse', sseRoutes);

// Public, non-API routes
app.route('/sitemap', sitemapRoutes);
app.route('/robots.txt', robotsRoutes);

// ----------------------------------------------------------------------------
// Global error handling
// ----------------------------------------------------------------------------
app.onError((err, c) => {
  // hono/jwt throws an HTTPException (401) when the token is missing/invalid;
  // preserve its intended status/response instead of masking it as a 500.
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error('Unhandled error:', err);
  return c.json({ message: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ message: 'Not Found' }, 404));

// ----------------------------------------------------------------------------
// Worker default export — combines the HTTP handler with the scheduled handler
// so the Cron Trigger declared in wrangler.toml can call into our news fetcher.
// ----------------------------------------------------------------------------
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await runScheduledFetch(env);
          console.log('Scheduled fetch complete:', result);
        } catch (err) {
          console.error('Scheduled fetch failed:', err);
        }
      })()
    );
  },
};
