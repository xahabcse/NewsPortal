import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errorResult, successResult } from '../lib/response';
import { hashPassword, verifyPassword } from '../lib/password';
import { issueToken, requireAuth } from '../lib/auth';
import { nowIso, type Row } from '../lib/db';

export const authRoutes = new Hono<Env>();

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

type UserRow = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  auth_provider: string;
  last_login_at: string | null;
  bio: string | null;
  avatar_id: number;
  created_at: string;
  updated_at: string | null;
  is_active: number;
};

function toUserDto(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    authProvider: row.auth_provider,
    bio: row.bio,
    avatarId: row.avatar_id,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    isActive: row.is_active === 1,
  };
}

async function findUserByUsernameOrEmail(env: Env['Bindings'], usernameOrEmail: string): Promise<UserRow | null> {
  return await env.DB.prepare(
    'SELECT * FROM users WHERE (username = ?1 OR email = ?1) AND is_active = 1 LIMIT 1'
  )
    .bind(usernameOrEmail)
    .first<UserRow>();
}

async function findUserById(env: Env['Bindings'], id: number): Promise<UserRow | null> {
  return await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(id).first<UserRow>();
}

// ----------------------------------------------------------------------------
// POST /login
// ----------------------------------------------------------------------------
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ usernameOrEmail?: string; username?: string; password?: string }>();
  const identifier = (body.usernameOrEmail ?? body.username ?? '').trim();
  const password = body.password ?? '';

  if (!identifier || !password) {
    return c.json(errorResult('Username/email and password are required'), 400);
  }

  const user = await findUserByUsernameOrEmail(c.env, identifier);
  if (!user) return c.json(errorResult('Invalid username or password'), 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return c.json(errorResult('Invalid username or password'), 401);

  await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), user.id).run();

  const token = await issueToken(c, { id: user.id, username: user.username, email: user.email, role: user.role });
  return c.json(successResult({ token, user: toUserDto(user) }));
});

// ----------------------------------------------------------------------------
// POST /register
// ----------------------------------------------------------------------------
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{
    username?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }>();

  const username = (body.username ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const firstName = (body.firstName ?? '').trim();
  const lastName = (body.lastName ?? '').trim();

  if (!username || !email || !password || !firstName || !lastName) {
    return c.json(errorResult('All fields are required'), 400);
  }
  if (password.length < 6) {
    return c.json(errorResult('Password must be at least 6 characters'), 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1 OR email = ?2 LIMIT 1')
    .bind(username, email)
    .first();
  if (existing) {
    return c.json(errorResult('Username or email already exists'), 409);
  }

  const passwordHash = await hashPassword(password);
  const now = nowIso();

  const result = await c.env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, first_name, last_name, role, auth_provider, avatar_id, created_at, is_active)
     VALUES (?, ?, ?, ?, ?, 'Reader', 'Local', 1, ?, 1)`
  )
    .bind(username, email, passwordHash, firstName, lastName, now)
    .run();

  const created = await findUserById(c.env, Number(result.meta.last_row_id));
  if (!created) return c.json(errorResult('Registration failed'), 500);

  const token = await issueToken(c, { id: created.id, username: created.username, email: created.email, role: created.role });
  return c.json(successResult({ token, user: toUserDto(created) }, 'Registered successfully'), 201);
});

// ----------------------------------------------------------------------------
// GET /me
// ----------------------------------------------------------------------------
authRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId') as number | undefined;
  if (!userId) return c.json(errorResult('Unauthorized'), 401);

  const user = await findUserById(c.env, userId);
  if (!user) return c.json(errorResult('User not found'), 404);

  return c.json(successResult(toUserDto(user)));
});

// ----------------------------------------------------------------------------
// GET /validate
// ----------------------------------------------------------------------------
authRoutes.get('/validate', requireAuth, async (c) => {
  const username = (c.get('userId') as number | undefined)?.toString();
  return c.json(successResult({ valid: true, user: username }));
});

// ----------------------------------------------------------------------------
// POST /change-password
// ----------------------------------------------------------------------------
authRoutes.post('/change-password', requireAuth, async (c) => {
  const userId = c.get('userId') as number | undefined;
  if (!userId) return c.json(errorResult('Unauthorized'), 401);

  const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  const currentPassword = body.currentPassword ?? '';
  const newPassword = body.newPassword ?? '';

  if (!currentPassword || !newPassword) {
    return c.json(errorResult('Both currentPassword and newPassword are required'), 400);
  }
  if (newPassword.length < 6) {
    return c.json(errorResult('New password must be at least 6 characters'), 400);
  }

  const user = await findUserById(c.env, userId);
  if (!user) return c.json(errorResult('User not found'), 404);

  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (!ok) return c.json(errorResult('Current password is incorrect'), 400);

  const newHash = await hashPassword(newPassword);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, nowIso(), userId)
    .run();

  return c.json(successResult(true, 'Password changed successfully'));
});

// ----------------------------------------------------------------------------
// POST /google — verify Google ID token, log in or auto-register
// ----------------------------------------------------------------------------
authRoutes.post('/google', async (c) => {
  const body = await c.req.json<{ credential?: string }>();
  const credential = body.credential ?? '';
  if (!credential) return c.json(errorResult('credential is required'), 400);

  // Verify the ID token via Google's tokeninfo endpoint.
  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!resp.ok) return c.json(errorResult('Google authentication failed'), 401);

  const payload = (await resp.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    given_name?: string;
    family_name?: string;
    sub?: string;
  };

  if (!payload.email || !payload.aud) return c.json(errorResult('Google authentication failed'), 401);
  if (payload.aud !== c.env.GOOGLE_CLIENT_ID) {
    return c.json(errorResult('Token audience mismatch'), 401);
  }

  const email = payload.email.toLowerCase();
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  if (!verified) return c.json(errorResult('Google email is not verified'), 401);

  // Find or create user.
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();

  if (!user) {
    const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').slice(0, 30) || `user${Date.now()}`;
    const firstName = payload.given_name ?? 'Google';
    const lastName = payload.family_name ?? 'User';
    const now = nowIso();

    const result = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, auth_provider, avatar_id, created_at, is_active)
       VALUES (?, ?, '', ?, ?, 'Reader', 'Google', 1, ?, 1)`
    )
      .bind(username, email, firstName, lastName, now)
      .run();

    user = await findUserById(c.env, Number(result.meta.last_row_id));
  }

  if (!user) return c.json(errorResult('Failed to create user'), 500);

  await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), user.id).run();

  const token = await issueToken(c, { id: user.id, username: user.username, email: user.email, role: user.role });
  return c.json(successResult({ token, user: toUserDto(user) }));
});

// ----------------------------------------------------------------------------
// PUT /profile — update bio + avatar
// ----------------------------------------------------------------------------
authRoutes.put('/profile', requireAuth, async (c) => {
  const userId = c.get('userId') as number | undefined;
  if (!userId) return c.json(errorResult('Unauthorized'), 401);

  const body = await c.req.json<{ bio?: string | null; avatarId?: number }>();
  const bio = body.bio ?? null;
  const avatarId = body.avatarId ?? 1;

  await c.env.DB.prepare('UPDATE users SET bio = ?, avatar_id = ?, updated_at = ? WHERE id = ?')
    .bind(bio?.toString().trim() ?? null, avatarId, nowIso(), userId)
    .run();

  const updated = await findUserById(c.env, userId);
  if (!updated) return c.json(errorResult('User not found'), 404);

  return c.json(successResult(toUserDto(updated)));
});

// ----------------------------------------------------------------------------
// GET /user/:username — public profile
// ----------------------------------------------------------------------------
authRoutes.get('/user/:username', async (c) => {
  const username = c.req.param('username');
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1'
  )
    .bind(username)
    .first<UserRow>();

  if (!user) return c.json(errorResult('User not found'), 404);

  return c.json(
    successResult({
      username: user.username,
      bio: user.bio,
      avatarId: user.avatar_id,
      role: user.role,
      createdAt: user.created_at,
    })
  );
});
