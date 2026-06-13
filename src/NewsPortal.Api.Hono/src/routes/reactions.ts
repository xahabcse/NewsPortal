import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, decodeToken } from '../lib/auth';
import { nowIso } from '../lib/db';

export const reactionsRoutes = new Hono<Env>();

// Lowercase reaction types — MUST match the client's ArticleReactions button set
// (it indexes counts by, and compares userReaction against, these exact strings).
const VALID_REACTION_TYPES = ['like', 'love', 'informative', 'shocking'] as const;
type ReactionType = typeof VALID_REACTION_TYPES[number];

/**
 * Build the full reaction state the client renders: per-type counts (lowercase keys,
 * every type seeded to 0), the grand total, and the current user's active reaction.
 * Returned by GET, POST and DELETE so the client can setData() from any of them.
 */
async function buildReactionState(c: Context<Env>, articleId: number, userId: number | null) {
  const rows = await c.env.DB.prepare(
    `SELECT LOWER(reaction_type) AS reaction_type, COUNT(*) AS count
     FROM article_reactions WHERE article_id = ? AND is_active = 1
     GROUP BY LOWER(reaction_type)`
  ).bind(articleId).all<{ reaction_type: string; count: number }>();

  const counts: Record<string, number> = {};
  for (const type of VALID_REACTION_TYPES) counts[type] = 0;
  let total = 0;
  for (const row of rows.results ?? []) {
    total += row.count;
    if (row.reaction_type in counts) counts[row.reaction_type] = row.count;
  }

  let userReaction: string | null = null;
  if (userId) {
    const row = await c.env.DB.prepare(
      'SELECT LOWER(reaction_type) AS reaction_type FROM article_reactions WHERE user_id = ? AND article_id = ? AND is_active = 1 LIMIT 1'
    ).bind(userId, articleId).first<{ reaction_type: string }>();
    userReaction = row?.reaction_type ?? null;
  }

  return { articleId, counts, total, userReaction };
}

/** Resolve the optional Bearer user id for anonymous GET reads (so the badge can
 *  highlight the viewer's own reaction when a token is present). */
async function optionalUserId(c: Context<Env>): Promise<number | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = await decodeToken(authHeader.slice(7), c.env.JWT_SECRET);
    return payload ? parseInt(payload.sub, 10) : null;
  } catch {
    return null;
  }
}

// GET /article/:articleId — counts + total + this user's reaction (auth optional)
reactionsRoutes.get('/article/:articleId', async (c) => {
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);
  const userId = await optionalUserId(c);
  return c.json(await buildReactionState(c, articleId, userId));
});

// POST /article/:articleId  body: { type }
// Sets/switches the reaction, or toggles it OFF if the same type is sent again.
reactionsRoutes.post('/article/:articleId', requireAuth, async (c) => {
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);
  const userId = c.get('userId')!;
  const body = await c.req.json<{ type?: string }>();
  const type = (body.type ?? '').toLowerCase();
  if (!VALID_REACTION_TYPES.includes(type as ReactionType)) return c.json(errMsg('Invalid reaction type'), 400);

  // Check the article exists before writing — avoids an FK-violation 500 on a bad id.
  const article = await c.env.DB.prepare('SELECT id FROM news_articles WHERE id = ? AND is_active = 1 LIMIT 1')
    .bind(articleId).first();
  if (!article) return c.json(errMsg('Article not found'), 404);

  const now = nowIso();
  const existing = await c.env.DB.prepare(
    'SELECT LOWER(reaction_type) AS reaction_type, is_active FROM article_reactions WHERE user_id = ? AND article_id = ? LIMIT 1'
  ).bind(userId, articleId).first<{ reaction_type: string; is_active: number }>();

  if (existing && existing.is_active === 1 && existing.reaction_type === type) {
    // Same reaction clicked again → toggle it off.
    await c.env.DB.prepare(
      'UPDATE article_reactions SET is_active = 0, updated_at = ? WHERE user_id = ? AND article_id = ?'
    ).bind(now, userId, articleId).run();
  } else {
    // New or switched reaction → upsert as active. Atomic on the unique
    // (user_id, article_id) index, so concurrent clicks can't violate it.
    await c.env.DB.prepare(
      `INSERT INTO article_reactions (user_id, article_id, reaction_type, created_at, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(user_id, article_id)
       DO UPDATE SET reaction_type = excluded.reaction_type, is_active = 1, updated_at = ?`
    ).bind(userId, articleId, type, now, now).run();
  }

  return c.json(await buildReactionState(c, articleId, userId));
});

// DELETE /article/:articleId — remove current user's reaction
reactionsRoutes.delete('/article/:articleId', requireAuth, async (c) => {
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);
  const userId = c.get('userId')!;
  await c.env.DB.prepare(
    'UPDATE article_reactions SET is_active = 0, updated_at = ? WHERE user_id = ? AND article_id = ?'
  ).bind(nowIso(), userId, articleId).run();
  return c.json(await buildReactionState(c, articleId, userId));
});
