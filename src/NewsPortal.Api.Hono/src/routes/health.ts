import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { successResult } from '../lib/response';

export const healthRoutes = new Hono<Env>();

healthRoutes.get('/health', async (c) => {
  // Quick D1 ping — returns 200 even if the DB is empty.
  try {
    await c.env.DB.prepare('SELECT 1 as ok').first();
  } catch (err) {
    return c.json({ status: 'unhealthy', error: String(err) }, 503);
  }
  return c.json(
    successResult({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'newsportal-api-hono',
    })
  );
});

healthRoutes.get('/', async (c) => {
  return c.json(
    successResult({
      name: 'NewsPortal API (Hono on Cloudflare Workers)',
      version: 'v1',
      docs: 'See README.md and /api/v1/* endpoints',
    })
  );
});
