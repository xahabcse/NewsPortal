import { Hono } from 'hono';
import type { Env } from '../lib/env';

export const sseRoutes = new Hono<Env>();

// GET /breaking — Server-Sent Events stream of the latest breaking news.
// Replaces the SignalR Hub the legacy stack used for live ticker updates.
// Client usage: new EventSource('/api/v1/sse/breaking')
sseRoutes.get('/breaking', async (c) => {
  const lastEventId = c.req.header('Last-Event-ID');
  const since = lastEventId ? parseInt(lastEventId) : 0;

  // SSE streaming. Workers supports ReadableStream so we can keep the connection open
  // and push updates every 15s — but we keep this implementation simple and short-lived.
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const write = (event: string, id: number, data: any) => {
        controller.enqueue(enc.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Initial snapshot
      const rows = await c.env.DB.prepare(`
        SELECT id, title, slug, summary, published_at, fetched_at
        FROM news_articles
        WHERE is_active = 1 AND id > ?
        ORDER BY fetched_at DESC LIMIT 10
      `).bind(since).all<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null; fetched_at: string }>();

      let lastId = since;
      for (const r of (rows.results ?? []).reverse()) {
        write('breaking', r.id, {
          id: r.id,
          title: r.title,
          slug: r.slug,
          summary: r.summary,
          publishedAt: r.published_at ?? r.fetched_at,
        });
        lastId = Math.max(lastId, r.id);
      }

      // Keep-alive ping then close. Browser EventSource will reconnect with Last-Event-ID.
      controller.enqueue(enc.encode(`event: ping\ndata: ${lastId}\n\n`));
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
