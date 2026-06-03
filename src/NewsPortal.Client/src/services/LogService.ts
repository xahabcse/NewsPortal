import { axiosInstance } from './axiosInstance';

export interface AppLog {
    id: number;
    createdAt: string;
    category: 'request' | 'audit' | 'extraction' | 'client_error';
    level: 'info' | 'warn' | 'error';
    message: string | null;
    method: string | null;
    path: string | null;
    status: number | null;
    durationMs: number | null;
    ip: string | null;
    userAgent: string | null;
    userId: number | null;
    userName: string | null;
    action: string | null;
    targetType: string | null;
    targetId: string | null;
    sourceSlug: string | null;
    url: string | null;
    error: string | null;
    meta: string | null;
}

export interface PagedLogs {
    items: AppLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface LogStats {
    total: number;
    last24h: number;
    byCategory: Record<string, number>;
    byLevel: Record<string, number>;
}

export interface LogFilters {
    category?: string;
    level?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}

export const LogService = {
    getLogs: async (filters: LogFilters = {}): Promise<PagedLogs> => {
        const params: Record<string, string | number> = {};
        if (filters.category && filters.category !== 'all') params.category = filters.category;
        if (filters.level && filters.level !== 'all') params.level = filters.level;
        if (filters.search) params.search = filters.search;
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        params.page = filters.page ?? 1;
        params.pageSize = filters.pageSize ?? 25;
        const res = await axiosInstance.get<PagedLogs>('/logs', { params });
        return res.data;
    },

    getStats: async (): Promise<LogStats> => {
        const res = await axiosInstance.get<LogStats>('/logs/stats');
        return res.data;
    },

    clear: async (category?: string): Promise<void> => {
        await axiosInstance.delete('/logs', { params: category && category !== 'all' ? { category } : {} });
    },
};

/**
 * Report a frontend runtime error to the backend (category=client_error).
 * Uses fetch + keepalive so it still sends during a crash/unload, and is fully
 * best-effort — never throws back into the error handler. Throttled per session.
 */
let reportCount = 0;
const recent = new Set<string>();
export function reportClientError(message: string, stack?: string, level: 'error' | 'warn' = 'error'): void {
    try {
        if (!message || reportCount >= 25) return;        // hard cap per page session
        const key = message.slice(0, 120);
        if (recent.has(key)) return;                       // dedupe identical messages
        recent.add(key);
        reportCount++;

        const base = axiosInstance.defaults.baseURL || '/api/v1';
        const payload = JSON.stringify({
            message: String(message).slice(0, 500),
            stack: stack ? String(stack).slice(0, 2000) : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            level,
        });
        void fetch(`${base}/logs/client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
        }).catch(() => { /* best-effort */ });
    } catch {
        // never let error reporting throw
    }
}
