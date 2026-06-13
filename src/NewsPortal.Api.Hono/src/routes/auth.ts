import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { hashPassword, verifyPassword } from '../lib/password';
import { issueToken, requireAuth } from '../lib/auth';
import { nowIso } from '../lib/db';

export const authRoutes = new Hono<Env>();

// A real-shaped bcrypt hash (cost 10) of a throwaway value. When login can't
// find the user we still run a bcrypt.compare against this so the response time
// matches the "user exists, wrong password" path and doesn't leak account
// existence via timing. Must be a valid, non-empty hash so verifyPassword does
// the work instead of short-circuiting on an empty string.
const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Dhb3jBh3kQ3wnq3FmK1qBQ4Z6QY2e';

// ----------------------------------------------------------------------------
// DB shapes & helpers
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

/** AuthSession shape used by the React client's AuthService. */
function toAuthSession(row: UserRow, token: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    token,
    username: row.username,
    email: row.email,
    role: row.role,
    authProvider: row.auth_provider,
    avatarId: row.avatar_id,
    expiresAt,
    // Extra fields the frontend may use:
    userId: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    bio: row.bio,
  };
}

async function findUser(env: Env['Bindings'], idOrName: string | number): Promise<UserRow | null> {
  if (typeof idOrName === 'number') {
    return env.DB.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1').bind(idOrName).first<UserRow>();
  }
  return env.DB.prepare(
    'SELECT * FROM users WHERE (username = ?1 OR email = ?1) AND is_active = 1 LIMIT 1'
  ).bind(idOrName).first<UserRow>();
}

// ----------------------------------------------------------------------------
// POST /login   body: { username, password }
// ----------------------------------------------------------------------------
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ username?: string; usernameOrEmail?: string; password?: string }>();
  const identifier = (body.username ?? body.usernameOrEmail ?? '').trim();
  const password = body.password ?? '';

  if (!identifier || !password) {
    return c.json(errMsg('Username/email and password are required'), 400);
  }

  const user = await findUser(c.env, identifier);
  if (!user) {
    // Constant-work compare so a missing account takes the same time as a
    // wrong password — don't reveal account existence via response timing.
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return c.json(errMsg('Invalid username or password'), 401);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (ok === false) return c.json(errMsg('Invalid username or password'), 401);

  await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), user.id).run();

  const token = await issueToken(c, { id: user.id, username: user.username, email: user.email, role: user.role });
  return c.json(toAuthSession(user, token));
});

// ----------------------------------------------------------------------------
// POST /register  body: { username, email, password, firstName?, lastName? }
// firstName/lastName are OPTIONAL — the registration UI only collects
// username/email/password. New accounts always get the 'Reader' role.
// ----------------------------------------------------------------------------
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{
    username?: string; email?: string; password?: string; firstName?: string; lastName?: string;
  }>();

  const username = (body.username ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  // Default the display name to the username when the client doesn't send one.
  const firstName = (body.firstName ?? '').trim() || username;
  const lastName = (body.lastName ?? '').trim();

  if (!username || !email || !password) {
    return c.json(errMsg('Username, email and password are required'), 400);
  }
  if (username.length < 3) {
    return c.json(errMsg('Username must be at least 3 characters'), 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(errMsg('Invalid email format'), 400);
  }
  if (password.length < 6) {
    return c.json(errMsg('Password must be at least 6 characters'), 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?1 OR email = ?2 LIMIT 1')
    .bind(username, email).first();
  if (existing) return c.json(errMsg('Username or email already exists'), 409);

  const passwordHash = await hashPassword(password);
  const now = nowIso();

  const result = await c.env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, first_name, last_name, role, auth_provider, avatar_id, created_at, is_active)
     VALUES (?, ?, ?, ?, ?, 'Reader', 'Local', 0, ?, 1)`
  ).bind(username, email, passwordHash, firstName, lastName, now).run();

  const created = await findUser(c.env, Number(result.meta.last_row_id));
  if (!created) return c.json(errMsg('Registration failed'), 500);

  const token = await issueToken(c, { id: created.id, username: created.username, email: created.email, role: created.role });
  return c.json(toAuthSession(created, token), 201);
});

// ----------------------------------------------------------------------------
// GET /me — current user profile (full UserDto)
// ----------------------------------------------------------------------------
authRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json(errMsg('Unauthorized'), 401);
  const user = await findUser(c.env, userId);
  if (!user) return c.json(errMsg('User not found'), 404);
  return c.json(toUserDto(user));
});

// ----------------------------------------------------------------------------
// GET /validate
// ----------------------------------------------------------------------------
authRoutes.get('/validate', requireAuth, async (c) => {
  return c.json({ valid: true, user: c.get('userId') });
});

// ----------------------------------------------------------------------------
// POST /change-password
// ----------------------------------------------------------------------------
authRoutes.post('/change-password', requireAuth, async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json(errMsg('Unauthorized'), 401);

  const body = await c.req.json<{ currentPassword?: string; newPassword?: string }>();
  const currentPassword = body.currentPassword ?? '';
  const newPassword = body.newPassword ?? '';

  if (!currentPassword || !newPassword) {
    return c.json(errMsg('Both currentPassword and newPassword are required'), 400);
  }
  if (newPassword.length < 6) {
    return c.json(errMsg('New password must be at least 6 characters'), 400);
  }

  const user = await findUser(c.env, userId);
  if (!user) return c.json(errMsg('User not found'), 404);

  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (ok === false) return c.json(errMsg('Current password is incorrect'), 400);

  const newHash = await hashPassword(newPassword);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, nowIso(), userId).run();

  return c.json({ message: 'Password changed successfully' });
});

// ----------------------------------------------------------------------------
// POST /google — verify Google ID token, log in or auto-register
// ----------------------------------------------------------------------------
authRoutes.post('/google', async (c) => {
  const body = await c.req.json<{ credential?: string }>();
  const credential = body.credential ?? '';
  if (!credential) return c.json(errMsg('credential is required'), 400);

  const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (resp.ok === false) return c.json(errMsg('Google authentication failed'), 401);

  const payload = (await resp.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    given_name?: string;
    family_name?: string;
  };

  if (!payload.email || !payload.aud) return c.json(errMsg('Google authentication failed'), 401);
  if (payload.aud !== c.env.GOOGLE_CLIENT_ID) {
    return c.json(errMsg('Token audience mismatch'), 401);
  }

  const verified = payload.email_verified === true || payload.email_verified === 'true';
  if (verified === false) return c.json(errMsg('Google email is not verified'), 401);

  const email = payload.email.toLowerCase();
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first<UserRow>();

  if (!user) {
    const baseUsername = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').slice(0, 30) || `user${Date.now()}`;
    // The local-part of two different Google emails can collide (or clash with
    // an existing local account), and username is UNIQUE — a raw INSERT would
    // 500. Probe for a free username, appending a short UUID-derived suffix
    // until it's unique so a legit Google sign-in never fails on collision.
    let username = baseUsername;
    while (
      await c.env.DB.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').bind(username).first()
    ) {
      const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
      username = `${baseUsername.slice(0, 30 - suffix.length - 1)}_${suffix}`;
    }
    const firstName = payload.given_name ?? 'Google';
    const lastName = payload.family_name ?? 'User';
    const now = nowIso();
    const result = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, auth_provider, avatar_id, created_at, is_active)
       VALUES (?, ?, '', ?, ?, 'Reader', 'Google', 0, ?, 1)`
    ).bind(username, email, firstName, lastName, now).run();
    user = await findUser(c.env, Number(result.meta.last_row_id));
  }

  if (!user) return c.json(errMsg('Failed to create user'), 500);

  await c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), user.id).run();

  const token = await issueToken(c, { id: user.id, username: user.username, email: user.email, role: user.role });
  return c.json(toAuthSession(user, token));
});

// ----------------------------------------------------------------------------
// PUT /profile  body: { bio, avatarId }
// ----------------------------------------------------------------------------
authRoutes.put('/profile', requireAuth, async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json(errMsg('Unauthorized'), 401);

  const body = await c.req.json<{ bio?: string | null; avatarId?: number }>();
  const bio = body.bio?.toString().trim() ?? null;
  const avatarId = body.avatarId ?? 0;

  await c.env.DB.prepare('UPDATE users SET bio = ?, avatar_id = ?, updated_at = ? WHERE id = ?')
    .bind(bio, avatarId, nowIso(), userId).run();

  const updated = await findUser(c.env, userId);
  if (!updated) return c.json(errMsg('User not found'), 404);
  return c.json(toUserDto(updated));
});

// ----------------------------------------------------------------------------
// GET /user/:username — public profile
// ----------------------------------------------------------------------------
authRoutes.get('/user/:username', async (c) => {
  const username = c.req.param('username');
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1'
  ).bind(username).first<UserRow>();

  if (!user) return c.json(errMsg('User not found'), 404);

  return c.json({
    username: user.username,
    bio: user.bio,
    avatarId: user.avatar_id,
    role: user.role,
    createdAt: user.created_at,
  });
});
