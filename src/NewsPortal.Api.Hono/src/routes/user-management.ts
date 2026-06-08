import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, requireRole, ROLE_RANK } from '../lib/auth';
import { nowIso, type Row } from '../lib/db';
import { hashPassword } from '../lib/password';
import { audit } from '../lib/logger';

export const userManagementRoutes = new Hono<Env>();

userManagementRoutes.use('*', requireAuth, requireRole('Admin'));

// Accepted role inputs (Viewer is a legacy alias for Reader). Single source of
// truth shared by POST /, PUT /:id and PUT /:id/role so they validate identically.
const VALID_ROLES = ['Reader', 'Viewer', 'Editor', 'Admin', 'SuperAdmin'];
function normalizeRole(role: string): string {
  return role === 'Viewer' ? 'Reader' : role;
}

/** Rank of the actor's role (0 if somehow unknown). */
function rankOf(role: string | undefined | null): number {
  return ROLE_RANK[role ?? ''] ?? 0;
}

function mapUser(row: Row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    authProvider: row.auth_provider,
    avatarId: row.avatar_id,
    isActive: row.is_active === 1,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
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
  if (!VALID_ROLES.includes(role)) {
    return c.json(errMsg('Invalid role'), 400);
  }

  const normalizedRole = normalizeRole(role);
  // Privilege escalation guard: an actor can never grant a role whose rank is
  // >= their own (e.g. an Admin can't create another Admin or a SuperAdmin).
  if (rankOf(normalizedRole) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1 OR email = ?2 LIMIT 1')
    .bind(username, email).first();
  if (existing) return c.json(errMsg('Username or email already exists'), 409);

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
  if (!created) return c.json(errMsg('User created but could not be loaded'), 500);
  audit(c, { action: 'user.create', targetType: 'user', targetId: created.id as number, message: `Created user ${created.username}`, meta: { role: created.role } });
  return c.json(mapUser(created), 201);
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
  if (role && !VALID_ROLES.includes(role)) {
    return c.json(errMsg('Invalid role'), 400);
  }
  const normalizedRole = role ? normalizeRole(role) : null;
  // Privilege escalation guard: when a role is being assigned it must rank below
  // the actor's own role.
  if (normalizedRole && rankOf(normalizedRole) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

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
  audit(c, { action: 'user.update', targetType: 'user', targetId: id, message: `Updated user ${updated.username}`, meta: { role: updated.role, isActive: updated.is_active === 1 } });
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

  const existing = await c.env.DB.prepare('SELECT id, username, role FROM users WHERE id = ? LIMIT 1').bind(id).first<{ id: number; username: string; role: string }>();
  if (!existing) return c.json(errMsg('User not found'), 404);

  // Privilege guard: never delete a user whose current role ranks >= the actor's.
  if (rankOf(existing.role) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

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

  audit(c, { action: 'user.delete', targetType: 'user', targetId: id, level: 'warn', message: `Hard-deleted user ${existing.username}` });
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

  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ? LIMIT 1').bind(id).first<{ id: number; role: string }>();
  if (!target) return c.json(errMsg('User not found'), 404);
  // Privilege guard: can't reset the password of a user who ranks >= the actor.
  if (rankOf(target.role) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

  const hash = await hashPassword(body.newPassword);
  const result = await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(hash, nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('User not found'), 404);
  audit(c, { action: 'user.reset_password', targetType: 'user', targetId: id, level: 'warn', message: 'Reset user password' });
  return c.json({ message: 'Password reset' });
});

// PUT /:id/role  body: { role }
userManagementRoutes.put('/:id/role', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ role?: string }>();
  if (!VALID_ROLES.includes(body.role ?? '')) {
    return c.json(errMsg('Invalid role'), 400);
  }
  const normalizedRole = normalizeRole(body.role as string);
  // Privilege guard: can't grant a role that ranks >= the actor's own role.
  if (rankOf(normalizedRole) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ? LIMIT 1').bind(id).first<{ id: number; role: string }>();
  if (!target) return c.json(errMsg('User not found'), 404);
  // Privilege guard: can't change the role of a user who ranks >= the actor.
  if (rankOf(target.role) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

  const result = await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
    .bind(normalizedRole, nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('User not found'), 404);
  audit(c, { action: 'user.role_change', targetType: 'user', targetId: id, level: 'warn', message: `Role → ${normalizedRole}`, meta: { role: normalizedRole } });
  return c.json({ message: 'Role updated' });
});

// PUT /:id/active  body: { isActive }
userManagementRoutes.put('/:id/active', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const body = await c.req.json<{ isActive?: boolean }>();
  if (typeof body.isActive !== 'boolean') {
    return c.json(errMsg('isActive (boolean) is required'), 400);
  }

  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ? LIMIT 1').bind(id).first<{ id: number; role: string }>();
  if (!target) return c.json(errMsg('User not found'), 404);
  // Privilege guard: can't (de)activate a user who ranks >= the actor.
  if (rankOf(target.role) >= rankOf(c.get('role'))) {
    return c.json(errMsg('Forbidden'), 403);
  }

  const result = await c.env.DB.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
    .bind(body.isActive ? 1 : 0, nowIso(), id).run();
  if (result.meta.changes === 0) return c.json(errMsg('User not found'), 404);
  audit(c, { action: 'user.active_toggle', targetType: 'user', targetId: id, message: body.isActive ? 'Activated user' : 'Deactivated user', meta: { isActive: body.isActive } });
  return c.json({ message: 'Status updated' });
});
