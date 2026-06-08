import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, requireRole, decodeToken } from '../lib/auth';
import { nowIso } from '../lib/db';

export const commentsRoutes = new Hono<Env>();

type CommentRow = {
  id: number;
  article_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  is_approved: number;
  is_deleted: number;
  created_at: string;
  updated_at: string | null;
  username: string;
  avatar_id: number;
  upvotes: number;
  downvotes: number;
  my_vote: number | null;
};

function mapComment(r: CommentRow) {
  return {
    id: r.id,
    articleId: r.article_id,
    userId: r.user_id,
    parentId: r.parent_id,
    content: r.is_deleted ? '[deleted]' : r.content,
    isApproved: r.is_approved === 1,
    isDeleted: r.is_deleted === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    username: r.username,
    avatarId: r.avatar_id,
    upvotes: r.upvotes ?? 0,
    downvotes: r.downvotes ?? 0,
    userVote: r.my_vote === null ? null : r.my_vote === 1 ? 'up' : 'down',
  };
}

async function loadCurrentUserId(c: Context<Env>): Promise<number | null> {
  const authHeader = c.req.header('Authorization') as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = await decodeToken(authHeader.slice(7), c.env.JWT_SECRET);
    return payload ? parseInt(payload.sub, 10) : null;
  } catch {
    return null;
  }
}

// GET /article/:articleId — threaded comments (parent_id IS NULL first, then replies)
commentsRoutes.get('/article/:articleId', async (c) => {
  const articleId = parseInt(c.req.param('articleId'));
  if (isNaN(articleId)) return c.json(errMsg('Invalid article id'), 400);

  const currentUserId = await loadCurrentUserId(c);

  const rows = await c.env.DB.prepare(`
    SELECT
      cm.id, cm.article_id, cm.user_id, cm.parent_id, cm.content,
      cm.is_approved, cm.is_deleted, cm.created_at, cm.updated_at,
      u.username, u.avatar_id,
      COALESCE(uv.upvotes, 0) AS upvotes,
      COALESCE(uv.downvotes, 0) AS downvotes,
      mv.is_upvote AS my_vote
    FROM comments cm
    INNER JOIN users u ON u.id = cm.user_id
    LEFT JOIN (
      SELECT comment_id,
             SUM(CASE WHEN is_upvote = 1 THEN 1 ELSE 0 END) AS upvotes,
             SUM(CASE WHEN is_upvote = 0 THEN 1 ELSE 0 END) AS downvotes
      FROM comment_votes
      WHERE is_active = 1
      GROUP BY comment_id
    ) uv ON uv.comment_id = cm.id
    LEFT JOIN comment_votes mv ON mv.comment_id = cm.id AND mv.user_id = ? AND mv.is_active = 1
    WHERE cm.article_id = ? AND cm.is_active = 1
    ORDER BY cm.parent_id IS NULL DESC, cm.created_at ASC
  `).bind(currentUserId ?? -1, articleId).all<CommentRow>();

  return c.json((rows.results ?? []).map(mapComment));
});

// POST /  body: { articleId, content, parentId? }
commentsRoutes.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json<{ articleId?: number; content?: string; parentId?: number | null }>();
  if (!body.articleId || !body.content?.trim()) return c.json(errMsg('articleId and content required'), 400);
  if (body.content.length > 2000) return c.json(errMsg('Comment too long (max 2000 chars)'), 400);

  const article = await c.env.DB.prepare('SELECT id, is_active FROM news_articles WHERE id = ? LIMIT 1')
    .bind(body.articleId).first<{ id: number; is_active: number }>();
  if (!article || article.is_active !== 1) return c.json(errMsg('Article not found'), 404);

  if (body.parentId != null) {
    const parent = await c.env.DB.prepare('SELECT article_id FROM comments WHERE id = ? AND is_active = 1 LIMIT 1')
      .bind(body.parentId).first<{ article_id: number }>();
    if (!parent || parent.article_id !== body.articleId) {
      return c.json(errMsg('parentId does not belong to this article'), 400);
    }
  }

  const now = nowIso();
  const result = await c.env.DB.prepare(
    `INSERT INTO comments (article_id, user_id, parent_id, content, is_approved, is_deleted, created_at, is_active)
     VALUES (?, ?, ?, ?, 1, 0, ?, 1)`
  ).bind(body.articleId, userId, body.parentId ?? null, body.content.trim(), now).run();

  return c.json({ message: 'Comment posted', id: Number(result.meta.last_row_id) }, 201);
});

// DELETE /:id — soft-delete (owner or admin)
commentsRoutes.delete('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const role = c.get('role')!;
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  const owner = await c.env.DB.prepare('SELECT user_id FROM comments WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1')
    .bind(id).first<{ user_id: number }>();
  if (!owner) return c.json(errMsg('Comment not found'), 404);

  const isAdmin = ['Admin', 'SuperAdmin'].includes(role);
  if (owner.user_id !== userId && !isAdmin) return c.json(errMsg('Forbidden'), 403);

  await c.env.DB.prepare('UPDATE comments SET is_deleted = 1, updated_at = ? WHERE id = ?')
    .bind(nowIso(), id).run();
  return c.json({ message: 'Comment deleted' });
});

// POST /:id/vote  body: { upvote: boolean }   (toggle: same vote clears)
commentsRoutes.post('/:id/vote', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  const body = await c.req.json<{ upvote?: boolean }>();
  if (typeof body.upvote !== 'boolean') return c.json(errMsg('upvote boolean required'), 400);

  const comment = await c.env.DB.prepare(
    'SELECT id FROM comments WHERE id = ? AND is_active = 1 AND is_deleted = 0 LIMIT 1'
  ).bind(id).first<{ id: number }>();
  if (!comment) return c.json(errMsg('Comment not found'), 404);

  const now = nowIso();
  const wantUpvote = body.upvote ? 1 : 0;

  // Same vote → toggle off; otherwise (new or switched) → activate with the chosen direction.
  // ON CONFLICT(user_id, comment_id) keeps the toggle atomic against the unique index (no TOCTOU race).
  const existing = await c.env.DB.prepare(
    'SELECT is_upvote, is_active FROM comment_votes WHERE user_id = ? AND comment_id = ? LIMIT 1'
  ).bind(userId, id).first<{ is_upvote: number; is_active: number }>();

  if (existing && existing.is_active === 1 && existing.is_upvote === wantUpvote) {
    await c.env.DB.prepare(
      `INSERT INTO comment_votes (user_id, comment_id, is_upvote, created_at, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(user_id, comment_id) DO UPDATE SET is_active = 0, updated_at = ?`
    ).bind(userId, id, wantUpvote, now, now).run();
    return c.json({ message: 'Vote cleared' });
  }

  await c.env.DB.prepare(
    `INSERT INTO comment_votes (user_id, comment_id, is_upvote, created_at, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(user_id, comment_id) DO UPDATE SET is_upvote = ?, is_active = 1, updated_at = ?`
  ).bind(userId, id, wantUpvote, now, wantUpvote, now).run();
  return c.json({ message: 'Vote saved' });
});
