import { Hono } from 'hono';
import type { Env } from '../lib/env';

export const feedRoutes = new Hono<Env>();

function escapeXml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// GET /rss?category=slug
feedRoutes.get('/rss', async (c) => {
  const categorySlug = c.req.query('category');
  const base = c.env.PUBLIC_BASE_URL.replace(/\/+$/, '');

  let sql = `
    SELECT a.id, a.title, a.slug, a.summary, a.canonical_url, a.published_at, a.fetched_at,
           s.name as source_name
    FROM news_articles a
    INNER JOIN news_sources s ON s.id = a.source_id
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.is_active = 1
  `;
  const binds: any[] = [];
  if (categorySlug) {
    sql += ' AND c.slug = ?';
    binds.push(categorySlug);
  }
  sql += ' ORDER BY COALESCE(a.published_at, a.fetched_at) DESC LIMIT 50';

  const rows = await c.env.DB.prepare(sql)
    .bind(...binds)
    .all<{
      id: number;
      title: string;
      slug: string;
      summary: string | null;
      canonical_url: string;
      published_at: string | null;
      fetched_at: string;
      source_name: string;
    }>();

  const items = (rows.results ?? [])
    .map((item) => {
      let pubDate = new Date(item.published_at ?? item.fetched_at);
      if (Number.isNaN(pubDate.getTime())) {
        pubDate = new Date(item.fetched_at);
      }
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(`${base}/news/${item.slug}`)}</link>
      <guid isPermaLink="false">${escapeXml(`newsportal-${item.id}`)}</guid>
      <description>${escapeXml(item.summary ?? '')}</description>
      <source>${escapeXml(item.source_name)}</source>
      <pubDate>${pubDate.toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const title = categorySlug ? `NewsPortal — ${categorySlug}` : 'NewsPortal — Latest News';
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(base)}</link>
    <description>Latest news from NewsPortal</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
});
