import { Hono } from 'hono';
import type { Env } from '../lib/env';

export const sitemapRoutes = new Hono<Env>();

// GET / — XML sitemap of all active articles + key pages
sitemapRoutes.get('/', async (c) => {
  const base = c.env.PUBLIC_BASE_URL.replace(/\/+$/, '');

  const rows = await c.env.DB.prepare(
    `SELECT slug, COALESCE(published_at, fetched_at) AS lastmod
     FROM news_articles
     WHERE is_active = 1
     ORDER BY COALESCE(published_at, fetched_at) DESC
     LIMIT 5000`
  ).all<{ slug: string; lastmod: string }>();

  const articleEntries = (rows.results ?? [])
    .map(
      (r) => `  <url>
    <loc>${base}/news/${encodeURIComponent(r.slug)}</loc>
    <lastmod>${new Date(r.lastmod).toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>${base}/trending</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/timeline</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/sources</loc><changefreq>daily</changefreq><priority>0.6</priority></url>
${articleEntries}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
});
