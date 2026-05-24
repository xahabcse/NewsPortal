import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { nowIso, paginate, type Row } from '../lib/db';

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

// GET / — paginated user list
userManagementRoutes.get('/', async (c) => {
  const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'), 20);
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

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, size, offset).all<Row>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM users ${whereSql}`).bind(...binds).first<{ count: number }>(),
  ]);

  return c.json(paged((rows.results ?? []).map(mapUser), countRow?.count ?? 0, page, size));
});

// GET /:id
userManagementRoutes.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json(errMsg('Invalid id'), 400);
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first<Row>();
  if (!row) return c.json(errMsg('User not found'), 404);
  return c.json(mapUser(row));
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
