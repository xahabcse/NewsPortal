// Central application logging — writes to the unified `app_logs` table.
// Every helper is best-effort: a logging failure must never break the request
// or the fetch job, so writes are wrapped in try/catch and (where possible)
// dispatched via ctx.waitUntil so they add no latency to the response.

import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from './env';
import { nowIso } from './db';

export type LogCategory = 'request' | 'audit' | 'extraction' | 'client_error';
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogRow {
    category: LogCategory;
    level?: LogLevel;
    message?: string | null;
    method?: string | null;
    path?: string | null;
    status?: number | null;
    durationMs?: number | null;
    ip?: string | null;
    userAgent?: string | null;
    userId?: number | null;
    userName?: string | null;
    action?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    sourceSlug?: string | null;
    url?: string | null;
    error?: string | null;
    meta?: unknown;
}

const cut = (s: string | null | undefined, n: number): string | null =>
    s == null ? null : s.length > n ? s.slice(0, n) : s;

/** Build a bound INSERT statement (so callers can batch it if they want). */
export function logInsert(env: Env['Bindings'], row: LogRow) {
    return env.DB.prepare(
        `INSERT INTO app_logs (created_at, category, level, message, method, path, status, duration_ms,
            ip, user_agent, user_id, user_name, action, target_type, target_id, source_slug, url, error, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        nowIso(),
        row.category,
        row.level ?? 'info',
        cut(row.message ?? null, 500),
        row.method ?? null,
        cut(row.path ?? null, 300),
        row.status ?? null,
        row.durationMs ?? null,
        cut(row.ip ?? null, 64),
        cut(row.userAgent ?? null, 300),
        row.userId ?? null,
        cut(row.userName ?? null, 120),
        cut(row.action ?? null, 80),
        cut(row.targetType ?? null, 60),
        cut(row.targetId ?? null, 80),
        cut(row.sourceSlug ?? null, 80),
        cut(row.url ?? null, 500),
        cut(row.error ?? null, 2000),
        row.meta != null ? cut(JSON.stringify(row.meta), 2000) : null,
    );
}

/** Fire-and-forget single write. */
export async function writeLog(env: Env['Bindings'], row: LogRow): Promise<void> {
    try {
        await logInsert(env, row).run();
    } catch {
        // logging must never throw
    }
}

/**
 * Record an admin mutation in the audit log. Reads the actor (id + username)
 * from the auth context. Best-effort, async — never blocks the response.
 */
export function audit(
    c: Context<Env>,
    entry: { action: string; targetType?: string; targetId?: string | number; message?: string; meta?: unknown; level?: LogLevel }
): void {
    const payload = c.get('jwtPayload') as { username?: string } | undefined;
    const row: LogRow = {
        category: 'audit',
        level: entry.level ?? 'info',
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId != null ? String(entry.targetId) : null,
        message: entry.message ?? entry.action,
        userId: c.get('userId') ?? null,
        userName: payload?.username ?? null,
        ip: c.req.header('CF-Connecting-IP') ?? null,
        meta: entry.meta,
    };
    try {
        c.executionCtx.waitUntil(writeLog(c.env, row));
    } catch {
        // executionCtx may be unavailable in some contexts — fall back to a detached write
        void writeLog(c.env, row);
    }
}

/**
 * Request/access logging middleware. To stay within the D1 free-tier write
 * budget we only persist requests that are interesting: mutations (POST/PUT/
 * DELETE/PATCH), errors (status >= 400), or slow responses (> SLOW_MS). Routine
 * GET reads of the news feed are not logged.
 */
const SLOW_MS = 800;

export const requestLogger: MiddlewareHandler<Env> = async (c, next) => {
    const start = Date.now();
    try {
        await next();
    } finally {
        const durationMs = Date.now() - start;
        const method = c.req.method;
        const path = c.req.path;
        const status = c.res?.status ?? 500;

        const skip =
            method === 'OPTIONS' ||
            path === '/health' ||
            path.startsWith('/api/v1/logs'); // avoid self-recursion + client-error noise

        const isMutation = method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH';
        const interesting = isMutation || status >= 400 || durationMs > SLOW_MS;

        if (!skip && interesting) {
            const payload = c.get('jwtPayload') as { username?: string } | undefined;
            const row: LogRow = {
                category: 'request',
                level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
                method,
                path,
                status,
                durationMs,
                message: `${method} ${path} → ${status} (${durationMs}ms)`,
                ip: c.req.header('CF-Connecting-IP') ?? null,
                userAgent: c.req.header('User-Agent') ?? null,
                userId: c.get('userId') ?? null,
                userName: payload?.username ?? null,
            };
            try {
                c.executionCtx.waitUntil(writeLog(c.env, row));
            } catch {
                void writeLog(c.env, row);
            }
        }
    }
};

/** Delete log rows older than `days` (called from the scheduled job). Best-effort. */
export async function pruneLogs(env: Env['Bindings'], days = 14): Promise<void> {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        await env.DB.prepare('DELETE FROM app_logs WHERE created_at < ?').bind(cutoff).run();
    } catch {
        // best-effort
    }
}
