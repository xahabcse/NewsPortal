import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './lib/env';

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { newsRoutes } from './routes/news';
import { feedRoutes } from './routes/feed';
import { sitemapRoutes } from './routes/sitemap';
import { robotsRoutes } from './routes/robots';

const app = new Hono<Env>();

// ----------------------------------------------------------------------------
// CORS — same pattern as Portfolio: parse comma-separated allowlist; default
// to '*' when no Origin header is present.
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
// Routes — `/api/v1/...` namespace mirrors the legacy ASP.NET Core API so the
// React client can switch backends by changing VITE_API_BASE_URL.
// ----------------------------------------------------------------------------
app.route('/', healthRoutes);                 // GET /  and  GET /health
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/news', newsRoutes);
app.route('/api/v1/feed', feedRoutes);
app.route('/sitemap', sitemapRoutes);
app.route('/robots.txt', robotsRoutes);

// ----------------------------------------------------------------------------
// Global error handler — returns the standard `{ success, message }` envelope.
// ----------------------------------------------------------------------------
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, message: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ success: false, message: 'Not Found' }, 404));

export default app;
