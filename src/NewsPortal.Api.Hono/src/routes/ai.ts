import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso } from '../lib/db';
import { summarize, translate, sentimentBatch } from '../lib/gemini';

export const aiRoutes = new Hono<Env>();

// POST /summarize/:id?mode=paragraph|bullets
aiRoutes.post('/summarize/:id', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const mode = (c.req.query('mode') === 'bullets' ? 'bullets' : 'paragraph') as 'bullets' | 'paragraph';

  const article = await c.env.DB.prepare(
    'SELECT id, content, plain_text, summary, title FROM news_articles WHERE id = ? LIMIT 1'
  ).bind(id).first<{ id: number; content: string | null; plain_text: string | null; summary: string | null; title: string }>();
  if (!article) return c.json(errMsg('Article not found'), 404);

  const source = article.plain_text || article.content || article.summary || article.title;
  const result = await summarize(c.env.GEMINI_API_KEY, source, mode);
  if (!result) {
    // Fallback — return the first 2 sentences if Gemini isn't configured.
    const sentences = source.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    return c.json({ summary: sentences, mode, source: 'fallback' });
  }
  return c.json({ summary: result, mode, source: 'gemini' });
});

// POST /translate/:id?target=bn|en|hi|es|fr|ar
aiRoutes.post('/translate/:id', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const target = c.req.query('target') ?? 'en';

  const article = await c.env.DB.prepare(
    'SELECT id, title, summary, plain_text FROM news_articles WHERE id = ? LIMIT 1'
  ).bind(id).first<{ title: string; summary: string | null; plain_text: string | null }>();
  if (!article) return c.json(errMsg('Article not found'), 404);

  const text = `${article.title}\n\n${article.summary ?? ''}\n\n${(article.plain_text ?? '').slice(0, 4000)}`;
  const translation = await translate(c.env.GEMINI_API_KEY, text, target);
  if (!translation) return c.json(errMsg('Translation unavailable'), 503);
  return c.json({ target, translation });
});

// POST /categorize/:id — rerun the keyword classifier
aiRoutes.post('/categorize/:id', requireAuth, requireRole('Editor'), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  const { categorize } = await import('../lib/categorizer');
  const article = await c.env.DB.prepare(
    'SELECT title, summary, plain_text FROM news_articles WHERE id = ? LIMIT 1'
  ).bind(id).first<{ title: string; summary: string | null; plain_text: string | null }>();
  if (!article) return c.json(errMsg('Article not found'), 404);

  const slug = categorize(`${article.title}\n${article.summary ?? ''}\n${article.plain_text ?? ''}`);
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE slug = ? LIMIT 1').bind(slug).first<{ id: number }>();
  if (!category) return c.json({ slug, applied: false });

  await c.env.DB.prepare('UPDATE news_articles SET category_id = ?, updated_at = ? WHERE id = ?')
    .bind(category.id, nowIso(), id).run();
  return c.json({ slug, applied: true });
});

// GET /sentiment/article/:id — aggregate sentiment of comments
aiRoutes.get('/sentiment/article/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  const rows = await c.env.DB.prepare(
    'SELECT content FROM comments WHERE article_id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 50'
  ).bind(id).all<{ content: string }>();

  const comments = (rows.results ?? []).map((r) => r.content);
  if (!comments.length) return c.json({ positive: 0, negative: 0, neutral: 0, total: 0, source: 'empty' });

  const result = await sentimentBatch(c.env.GEMINI_API_KEY, comments);
  if (!result) {
    // Lightweight keyword fallback.
    const posWords = ['good', 'great', 'love', 'excellent', 'amazing', 'wonderful'];
    const negWords = ['bad', 'terrible', 'awful', 'hate', 'wrong', 'worst'];
    let positiveCount = 0, negativeCount = 0;
    for (const comment of comments) {
      const lower = comment.toLowerCase();
      if (posWords.some((w) => lower.includes(w))) positiveCount++;
      else if (negWords.some((w) => lower.includes(w))) negativeCount++;
    }
    return c.json({ positive: positiveCount, negative: negativeCount, neutral: comments.length - positiveCount - negativeCount, total: comments.length, source: 'fallback' });
  }
  return c.json({ ...result, total: comments.length, source: 'gemini' });
});
