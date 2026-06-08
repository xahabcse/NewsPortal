import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth } from '../lib/auth';
import { nowIso } from '../lib/db';

export const reactionsRoutes = new Hono<Env>();

const VALID_REACTION_TYPES = ['Like', 'Love', 'Informative', 'Shocking', 'Sad', 'Angry'] as const;
type ReactionType = typeof VALID_REACTION_TYPES[number];

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
  for (const reactionType of VALID_REACTION_TYPES) result[reactionType] = 0;
  for (const countRow of counts.results ?? []) result[countRow.reaction_type] = countRow.count;

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
  if (!VALID_REACTION_TYPES.includes(reactionType as ReactionType)) return c.json(errMsg('Invalid reactionType'), 400);

  // Check article exists before writing — avoids an FK-violation 500 on a bad id.
  const article = await c.env.DB.prepare('SELECT id FROM news_articles WHERE id = ? AND is_active = 1 LIMIT 1')
    .bind(articleId).first();
  if (!article) return c.json(errMsg('Article not found'), 404);

  // Atomic upsert on the (user_id, article_id) unique index — no select-then-write race.
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO article_reactions (user_id, article_id, reaction_type, created_at, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(user_id, article_id)
     DO UPDATE SET reaction_type = excluded.reaction_type, is_active = 1, updated_at = ?`
  ).bind(userId, articleId, reactionType, now, now).run();

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
