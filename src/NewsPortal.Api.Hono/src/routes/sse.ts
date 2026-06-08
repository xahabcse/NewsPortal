import { Hono } from 'hono';
import type { Env } from '../lib/env';

export const sseRoutes = new Hono<Env>();

// GET /breaking — Server-Sent Events stream of the latest breaking news.
// Replaces the SignalR Hub the legacy stack used for live ticker updates.
// Client usage: new EventSource('/api/v1/sse/breaking')
sseRoutes.get('/breaking', async (c) => {
  const lastEventId = c.req.header('Last-Event-ID');
  // A non-numeric Last-Event-ID must not yield NaN (which would make the snapshot query return nothing).
  const parsed = parseInt(lastEventId ?? '', 10);
  const sinceArticleId = Number.isFinite(parsed) ? parsed : 0;

  // SSE streaming. Workers supports ReadableStream so we can keep the connection open
  // and push updates every 15s — but we keep this implementation simple and short-lived.
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: string, id: number, data: any) => {
        controller.enqueue(encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Initial snapshot
      const rows = await c.env.DB.prepare(`
        SELECT id, title, slug, summary, published_at, fetched_at
        FROM news_articles
        WHERE is_active = 1 AND id > ?
        ORDER BY fetched_at DESC LIMIT 10
      `).bind(sinceArticleId).all<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null; fetched_at: string }>();

      let lastSentId = sinceArticleId;
      for (const article of (rows.results ?? []).reverse()) {
        write('breaking', article.id, {
          id: article.id,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          publishedAt: article.published_at ?? article.fetched_at,
        });
        lastSentId = Math.max(lastSentId, article.id);
      }

      // Keep-alive ping then close. Browser EventSource will reconnect with Last-Event-ID.
      controller.enqueue(encoder.encode(`event: ping\ndata: ${lastSentId}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
