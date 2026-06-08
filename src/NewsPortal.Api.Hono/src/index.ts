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
import { logsRoutes } from './routes/logs';

import { runScheduledFetch, runBodyBackfill } from './jobs/fetch-news';
import { requestLogger, pruneLogs } from './lib/logger';

const app = new Hono<Env>();

// ----------------------------------------------------------------------------
// CORS — parse the comma-separated allowlist from CORS_ORIGINS.
// ----------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const allowed = (c.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // When there's no Origin (server-to-server / same-origin) or no allowlist
  // configured, fall back to a wildcard. A present-but-disallowed origin must
  // get NO Access-Control-Allow-Origin so we never reflect a credentialed
  // allow-origin for an origin the request didn't actually come from.
  const noAllowlist = allowed.length === 0;

  return cors({
    // The cors() origin function returns the origin only when it's allowed,
    // otherwise undefined (→ no Access-Control-Allow-Origin header). '*' is
    // returned ONLY when no allowlist is configured (dev) — which is exactly
    // when credentials below is false — so '*' never pairs with credentials:true.
    // A no-Origin request with an allowlist present isn't a CORS request, so it
    // needs no ACAO header (undefined) rather than a credentialed wildcard.
    origin: (origin) => {
      if (noAllowlist) return '*';
      if (!origin) return undefined;
      return allowed.includes(origin) ? origin : undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    // This API authenticates via the Authorization header, not cookies, so
    // pairing the '*' fallback with credentials:true is both unsafe (browsers
    // reject it) and unnecessary. Enable credentials only when we echo a
    // specific allowlisted origin.
    credentials: noAllowlist === false,
  })(c, next);
});

// ----------------------------------------------------------------------------
// Request/access logging — persists mutations, errors, and slow responses to
// app_logs (best-effort, via waitUntil so it adds no latency).
// ----------------------------------------------------------------------------
app.use('*', requestLogger);

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
// Legacy .NET contract is /api/v1/admin/articles (what the React client calls).
// Keep /adminarticles too as a back-compat alias.
app.route('/api/v1/admin/articles', adminArticlesRoutes);
app.route('/api/v1/adminarticles', adminArticlesRoutes);

// Phase 4: images
app.route('/api/v1/images', imagesRoutes);

// Phase 5: AI
app.route('/api/v1/ai', aiRoutes);

// Phase 6: SSE realtime
app.route('/api/v1/sse', sseRoutes);

// Central application logs (SuperAdmin viewer + public client-error reporter)
app.route('/api/v1/logs', logsRoutes);

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
  // A malformed or empty JSON body makes c.req.json() throw a SyntaxError. That's a
  // client error (400), not a server fault (500). One central guard covers every
  // route that parses a JSON body (and any future ones) without per-handler try/catch.
  if (err instanceof SyntaxError) {
    return c.json({ message: 'Invalid or missing JSON body' }, 400);
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
          if (event.cron === '*/30 * * * *') {
            // Independent body-backfill job (its own fresh budget).
            const r = await runBodyBackfill(env);
            console.log('Body backfill complete:', r);
            // Log retention housekeeping — every 30 min is plenty.
            await pruneLogs(env);
          } else if (event.cron === '*/5 * * * *') {
            // */5 ingestion fetch.
            const result = await runScheduledFetch(env);
            console.log('Scheduled fetch complete:', result);
          } else {
            // An unrecognized cron must not silently run the */5 ingest.
            console.warn('Unrecognized cron trigger, no-op:', event.cron);
          }
        } catch (err) {
          console.error('Scheduled job failed:', err);
        }
      })()
    );
  },
};
