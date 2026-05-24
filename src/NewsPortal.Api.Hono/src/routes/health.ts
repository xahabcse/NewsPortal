import { Hono } from 'hono';
import type { Env } from '../lib/env';

export const healthRoutes = new Hono<Env>();

healthRoutes.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1 as ok').first();
  } catch (err) {
    return c.json({ status: 'unhealthy', error: String(err) }, 503);
  }
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'newsportal-api-hono',
  });
});

healthRoutes.get('/', async (c) => {
  return c.json({
    name: 'NewsPortal API (Hono on Cloudflare Workers)',
    version: 'v1',
    docs: 'See /api/v1/* endpoints — same surface as the legacy ASP.NET Core API.',
  });
});
