import { jwt, sign, verify } from 'hono/jwt';
import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from './env';
import { errMsg } from './response';

export type JwtPayload = {
  sub: string;          // user id (string)
  username: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
};

/** Mounts hono/jwt + populates c.var.userId/role on success. */
export const requireAuth: MiddlewareHandler<Env> = async (c, next) => {
  const mw = jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' });
  return mw(c, async () => {
    const payload = c.get('jwtPayload') as JwtPayload | undefined;
    if (payload) {
      c.set('userId', parseInt(payload.sub));
      c.set('role', payload.role);
    }
    await next();
  });
};

const ROLE_RANK: Record<string, number> = {
  Reader: 1,
  Viewer: 1,        // legacy alias
  Editor: 2,
  Admin: 3,
  SuperAdmin: 4,
};

/** Reject unless the JWT's role is >= the required role. */
export function requireRole(minRole: 'Reader' | 'Editor' | 'Admin' | 'SuperAdmin'): MiddlewareHandler<Env> {
  return async (c, next) => {
    const role = c.get('role');
    if (!role || (ROLE_RANK[role] ?? 0) < ROLE_RANK[minRole]) {
      return c.json(errMsg('Insufficient permissions'), 403);
    }
    await next();
  };
}

const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function issueToken(c: Context<Env>, user: { id: number; username: string; email: string; role: string }, expiresInDays = 7) {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: String(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + ONE_DAY_SECONDS * expiresInDays,
  };
  return sign(payload, c.env.JWT_SECRET, 'HS256');
}

export async function decodeToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const payload = (await verify(token, secret, 'HS256')) as unknown as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}
