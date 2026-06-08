import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg, paged } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { paginate, type Row } from '../lib/db';
import { writeLog } from '../lib/logger';

export const logsRoutes = new Hono<Env>();

function mapLog(r: Row) {
    return {
        id: r.id,
        createdAt: r.created_at,
        category: r.category,
        level: r.level,
        message: r.message,
        method: r.method,
        path: r.path,
        status: r.status,
        durationMs: r.duration_ms,
        ip: r.ip,
        userAgent: r.user_agent,
        userId: r.user_id,
        userName: r.user_name,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        sourceSlug: r.source_slug,
        url: r.url,
        error: r.error,
        meta: r.meta,
    };
}

// ----------------------------------------------------------------------------
// POST /client — public client-error reporting (called by the browser).
// Capped + best-effort; deliberately unauthenticated since errors also happen
// for logged-out users. Excluded from request-logging (see requestLogger).
// ----------------------------------------------------------------------------
logsRoutes.post('/client', async (c) => {
    let body: { message?: string; stack?: string; url?: string; userAgent?: string; level?: string } = {};
    try {
        body = await c.req.json();
    } catch {
        return c.body(null, 204);
    }
    const message = (body.message ?? '').toString().trim();
    if (!message) return c.body(null, 204);

    await writeLog(c.env, {
        category: 'client_error',
        level: body.level === 'warn' ? 'warn' : 'error',
        message: message.slice(0, 500),
        url: (body.url ?? '').toString().slice(0, 500) || null,
        error: (body.stack ?? '').toString().slice(0, 2000) || null,
        userAgent: (body.userAgent ?? c.req.header('User-Agent') ?? '').toString().slice(0, 300) || null,
        ip: c.req.header('CF-Connecting-IP') ?? null,
    });
    return c.body(null, 204);
});

// All remaining endpoints are SuperAdmin-only.
logsRoutes.use('/', requireAuth, requireRole('SuperAdmin'));
logsRoutes.use('/stats', requireAuth, requireRole('SuperAdmin'));

// ----------------------------------------------------------------------------
// GET / — paginated, filterable log list.
// Query: category, level, search, from, to, page, pageSize
// ----------------------------------------------------------------------------
logsRoutes.get('/', async (c) => {
    const { page, size, offset } = paginate(c.req.query('page'), c.req.query('pageSize'), 25);
    const category = c.req.query('category');
    const level = c.req.query('level');
    const search = (c.req.query('search') ?? '').trim();
    const from = c.req.query('from');
    const to = c.req.query('to');

    const where: string[] = [];
    const binds: unknown[] = [];
    if (category && category !== 'all') { where.push('category = ?'); binds.push(category); }
    if (level && level !== 'all') { where.push('level = ?'); binds.push(level); }
    if (search) {
        where.push('(message LIKE ? OR path LIKE ? OR url LIKE ? OR error LIKE ? OR action LIKE ? OR user_name LIKE ? OR ip LIKE ?)');
        const like = `%${search}%`;
        binds.push(like, like, like, like, like, like, like);
    }
    if (from) { where.push('created_at >= ?'); binds.push(from.length === 10 ? `${from}T00:00:00.000Z` : from); }
    if (to) { where.push('created_at <= ?'); binds.push(to.length === 10 ? `${to}T23:59:59.999Z` : to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows, countRow] = await Promise.all([
        c.env.DB.prepare(`SELECT * FROM app_logs ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
            .bind(...binds, size, offset).all<Row>(),
        c.env.DB.prepare(`SELECT COUNT(*) as count FROM app_logs ${whereSql}`).bind(...binds).first<{ count: number }>(),
    ]);

    return c.json(paged((rows.results ?? []).map(mapLog), countRow?.count ?? 0, page, size));
});

// ----------------------------------------------------------------------------
// GET /stats — counts by category and by level (total + last 24h).
// ----------------------------------------------------------------------------
logsRoutes.get('/stats', async (c) => {
    const since = new Date(Date.now() - 86400000).toISOString();
    const [byCategory, byLevel, total, last24h] = await Promise.all([
        c.env.DB.prepare('SELECT category, COUNT(*) as count FROM app_logs GROUP BY category').all<{ category: string; count: number }>(),
        c.env.DB.prepare('SELECT level, COUNT(*) as count FROM app_logs GROUP BY level').all<{ level: string; count: number }>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM app_logs').first<{ count: number }>(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM app_logs WHERE created_at >= ?').bind(since).first<{ count: number }>(),
    ]);

    const countsByCategory: Record<string, number> = {};
    for (const r of byCategory.results ?? []) countsByCategory[r.category] = r.count;
    const countsByLevel: Record<string, number> = {};
    for (const r of byLevel.results ?? []) countsByLevel[r.level] = r.count;

    return c.json({
        total: total?.count ?? 0,
        last24h: last24h?.count ?? 0,
        byCategory: countsByCategory,
        byLevel: countsByLevel,
    });
});

// ----------------------------------------------------------------------------
// DELETE / — clear logs (optionally a single category). SuperAdmin only.
// ----------------------------------------------------------------------------
logsRoutes.delete('/', requireAuth, requireRole('SuperAdmin'), async (c) => {
    const category = c.req.query('category');
    if (category && category !== 'all') {
        await c.env.DB.prepare('DELETE FROM app_logs WHERE category = ?').bind(category).run();
    } else {
        await c.env.DB.prepare('DELETE FROM app_logs').run();
    }
    return c.json({ message: 'Logs cleared' });
});
