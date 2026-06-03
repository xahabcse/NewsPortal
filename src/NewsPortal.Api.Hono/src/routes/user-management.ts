import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso, type Row } from '../lib/db';
import { hashPassword } from '../lib/password';

export const userManagementRoutes = new Hono<Env>();

userManagementRoutes.use('*', requireAuth, requireRole('Admin'));

function mapUser(r: Row) {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    role: r.role,
    authProvider: r.auth_provider,
    avatarId: r.avatar_id,
    isActive: r.is_active === 1,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  };
}

// ----------------------------------------------------------------------------
// GET / — full user list (frontend's UserManagementService.getAll expects User[])
// Optional query params: page, pageSize, search, role
// ----------------------------------------------------------------------------
userManagementRoutes.get('/', async (c) => {
  const search = (c.req.query('search') ?? '').trim();
  const role = c.req.query('role');

  const where: string[] = [];
  const binds: any[] = [];
  if (search) {
    where.push('(username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
    const like = `%${search}%`;
    binds.push(like, like, like, like);
  }
  if (role) {
    where.push('role = ?');
    binds.push(role);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await c.env.DB.prepare(`SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT 500`)
    .bind(...binds).all<Row>();

  return c.json((rows.results ?? []).map(mapUser));
});

// GET /:id
userManagementRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first<Row>();
  if (!row) return c.json(errMsg('User not found'), 404);
  return c.json(mapUser(row));
});

// ----------------------------------------------------------------------------
// POST / — create a new user. body: { username, email, password, role, isActive }
// ----------------------------------------------------------------------------
userManagementRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    username?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
  }>();

  const username = (body.username ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const role = body.role ?? 'Reader';

  if (!username || !email || !password) {
    return c.json(errMsg('username, email and password are required'), 400);
  }
  if (password.length < 6) return c.json(errMsg('Password must be at least 6 characters'), 400);
  if (!['Reader', 'Viewer', 'Editor', 'Admin', 'SuperAdmin'].includes(role)) {
    return c.json(errMsg('Invalid role'), 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1 OR email = ?2 LIMIT 1')
    .bind(username, email).first();
  if (existing) return c.json(errMsg('Username or email already exists'), 409);

  const normalizedRole = role === 'Viewer' ? 'Reader' : role;
  const passwordHash = await hashPassword(password);
  const now = nowIso();

  const result = await c.env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, first_name, last_name, role, auth_provider, avatar_id, created_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 'Local', 1, ?, ?)`
  ).bind(
    username,
    email,
    passwordHash,
    (body.firstName ?? username).trim(),
    (body.lastName ?? '').trim() || ' ',
    normalizedRole,
    now,
    body.isActive === false ? 0 : 1
  ).run();

  const created = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(Number(result.meta.last_row_id)).first<Row>();
  return c.json(mapUser(created!), 201);
});

// ----------------------------------------------------------------------------
// PUT /:id — update username, email, role, isActive
// ----------------------------------------------------------------------------
userManagementRoutes.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  const body = await c.req.json<{
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
  }>();

  const username = (body.username ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role ?? null;
  if (role && !['Reader', 'Viewer', 'Editor', 'Admin', 'SuperAdmin'].includes(role)) {
    return c.json(errMsg('Invalid role'), 400);
  }
  const normalizedRole = role === 'Viewer' ? 'Reader' : role;

  await c.env.DB.prepare(
    `UPDATE users SET
       username = COALESCE(NULLIF(?, ''), username),
       email = COALESCE(NULLIF(?, ''), email),
       first_name = COALESCE(NULLIF(?, ''), first_name),
       last_name = COALESCE(NULLIF(?, ''), last_name),
       role = COALESCE(?, role),
       is_active = COALESCE(?, is_active),
       updated_at = ?
     WHERE id = ?`
  ).bind(
    username,
    email,
    (body.firstName ?? '').trim(),
    (body.lastName ?? '').trim(),
    normalizedRole,
    body.isActive === undefined ? null : body.isActive ? 1 : 0,
    nowIso(),
    id
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<Row>();
  if (!updated) return c.json(errMsg('User not found'), 404);
  return c.json(mapUser(updated));
});

// ----------------------------------------------------------------------------
// DELETE /:id — HARD delete. Permanently removes the user and all data they own.
// Replies by OTHER users to this user's comments are re-parented to top-level so
// their threads survive. Dependents are cleaned in FK-safe order inside one atomic
// batch (transaction) — required because comments.user_id is ON DELETE RESTRICT.
// ----------------------------------------------------------------------------
userManagementRoutes.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);

  // Admins can't delete their own account out from under themselves.
  const currentUserId = c.get('userId');
  if (currentUserId && Number(currentUserId) === id) {
    return c.json(errMsg('You cannot delete your own account'), 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? LIMIT 1').bind(id).first();
  if (!existing) return c.json(errMsg('User not found'), 404);

  await c.env.DB.batch([
    // Votes this user cast, and votes on this user's comments.
    c.env.DB.prepare('DELETE FROM comment_votes WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM comment_votes WHERE comment_id IN (SELECT id FROM comments WHERE user_id = ?)').bind(id),
    // Re-parent any replies to this user's comments to top-level, then delete the
    // user's own comments (avoids the comments.parent_id RESTRICT constraint).
    c.env.DB.prepare('UPDATE comments SET parent_id = NULL WHERE parent_id IN (SELECT id FROM comments WHERE user_id = ?)').bind(id),
    c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(id),
    // Other user-owned rows.
    c.env.DB.prepare('DELETE FROM article_reactions WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM article_reports WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM user_bookmarks WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM user_read_history WHERE user_id = ?').bind(id),
    // source_fetch_jobs keeps an audit reference (no FK) — null it so it doesn't dangle.
    c.env.DB.prepare('UPDATE source_fetch_jobs SET requested_by_user_id = NULL WHERE requested_by_user_id = ?').bind(id),
    // Finally the user.
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);

  return c.body(null, 204);
});

// ----------------------------------------------------------------------------
// POST /:id/reset-password   body: { newPassword }
// ----------------------------------------------------------------------------
userManagementRoutes.post('/:id/reset-password', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ newPassword?: string }>();
  if (!body.newPassword || body.newPassword.length < 6) {
    return c.json(errMsg('newPassword must be at least 6 characters'), 400);
  }
  const hash = await hashPassword(body.newPassword);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(hash, nowIso(), id).run();
  return c.json({ message: 'Password reset' });
});

// PUT /:id/role  body: { role }
userManagementRoutes.put('/:id/role', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ role?: string }>();
  if (!['Reader', 'Editor', 'Admin', 'SuperAdmin'].includes(body.role ?? '')) {
    return c.json(errMsg('Invalid role'), 400);
  }
  await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
    .bind(body.role, nowIso(), id).run();
  return c.json({ message: 'Role updated' });
});

// PUT /:id/active  body: { isActive }
userManagementRoutes.put('/:id/active', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ isActive?: boolean }>();
  await c.env.DB.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
    .bind(body.isActive ? 1 : 0, nowIso(), id).run();
  return c.json({ message: 'Status updated' });
});
