import { Hono } from 'hono';
import type { Env } from '../lib/env';

export const robotsRoutes = new Hono<Env>();

robotsRoutes.get('/', async (c) => {
  const base = c.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
});
