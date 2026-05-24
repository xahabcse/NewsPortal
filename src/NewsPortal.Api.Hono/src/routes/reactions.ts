import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth } from '../lib/auth';
import { nowIso } from '../lib/db';

export const reactionsRoutes = new Hono<Env>();

const VALID_TYPES = ['Like', 'Love', 'Informative', 'Shocking', 'Sad', 'Angry'];

// GET /article/:articleId — counts per reactionType + the current user's reaction (if any)
reactionsRoutes.get('/article/:articleId', async (c) => {
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  const counts = await c.env.DB.prepare(`
    SELECT reaction_type, COUNT(*) as count
    FROM article_reactions
    WHERE article_id = ? AND is_active = 1
    GROUP BY reaction_type
  `).bind(articleId).all<{ reaction_type: string; count: number }>();

  const result: Record<string, number> = {};
  for (const t of VALID_TYPES) result[t] = 0;
  for (const r of counts.results ?? []) result[r.reaction_type] = r.count;

  // Try to read the current user's reaction if a token is present.
  const authHeader = c.req.header('Authorization');
  let userReaction: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { decodeToken } = await import('../lib/auth');
      const payload = await decodeToken(authHeader.slice(7), c.env.JWT_SECRET);
      if (payload) {
        const row = await c.env.DB.prepare(
          'SELECT reaction_type FROM article_reactions WHERE user_id = ? AND article_id = ? AND is_active = 1 LIMIT 1'
        ).bind(parseInt(payload.sub), articleId).first<{ reaction_type: string }>();
        userReaction = row?.reaction_type ?? null;
      }
    } catch {}
  }

  return c.json({ articleId, counts: result, userReaction });
});

// POST / body: { articleId, reactionType }
reactionsRoutes.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json<{ articleId?: number; reactionType?: string }>();
  const articleId = body.articleId;
  const reactionType = body.reactionType;
  if (!articleId || !reactionType) return c.json(errMsg('articleId and reactionType required'), 400);
  if (!VALID_TYPES.includes(reactionType)) return c.json(errMsg('Invalid reactionType'), 400);

  const now = nowIso();
  const existing = await c.env.DB.prepare(
    'SELECT id FROM article_reactions WHERE user_id = ? AND article_id = ? LIMIT 1'
  ).bind(userId, articleId).first<{ id: number }>();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE article_reactions SET reaction_type = ?, is_active = 1, updated_at = ? WHERE id = ?'
    ).bind(reactionType, now, existing.id).run();
  } else {
    await c.env.DB.prepare(
      'INSERT INTO article_reactions (user_id, article_id, reaction_type, created_at, is_active) VALUES (?, ?, ?, ?, 1)'
    ).bind(userId, articleId, reactionType, now).run();
  }

  return c.json({ message: 'Reaction saved', articleId, reactionType });
});

// DELETE /article/:articleId — remove current user's reaction
reactionsRoutes.delete('/article/:articleId', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  await c.env.DB.prepare(
    'UPDATE article_reactions SET is_active = 0, updated_at = ? WHERE user_id = ? AND article_id = ?'
  ).bind(nowIso(), userId, articleId).run();

  return c.json({ message: 'Reaction removed', articleId });
});
