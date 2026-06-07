import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Calendar, Search, RotateCw, Trash2, ChevronLeft, ChevronRight,
    Activity, FileWarning, Bug,
} from 'lucide-react';
import SEO from '../../components/SEO';
import { LogService, type AppLog, type LogStats } from '../../services/LogService';

const CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'request', label: 'Requests' },
    { key: 'audit', label: 'Audit' },
    { key: 'extraction', label: 'Extraction' },
    { key: 'client_error', label: 'Client errors' },
];

const LEVELS = ['all', 'info', 'warn', 'error'];

// Quick date presets — values are local YYYY-MM-DD ranges (the API expands a 10-char
// date to a full UTC day).
const DATE_PRESETS = [
    { key: 'all', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7d', label: 'Last 7 days' },
];

function localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangeForPreset(key: string): { from: string; to: string } {
    const today = new Date();
    const t = localDateStr(today);
    if (key === 'today') return { from: t, to: t };
    if (key === 'yesterday') {
        const y = localDateStr(new Date(today.getTime() - 86400000));
        return { from: y, to: y };
    }
    if (key === '7d') return { from: localDateStr(new Date(today.getTime() - 6 * 86400000)), to: t };
    return { from: '', to: '' }; // all
}

function levelClasses(level: string): string {
    if (level === 'error') return 'bg-danger/15 text-danger border-danger/30';
    if (level === 'warn') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-white/5 text-secondary border-glass-border';
}

function levelDot(level: string): string {
    if (level === 'error') return 'bg-danger';
    if (level === 'warn') return 'bg-amber-400';
    return 'bg-secondary/50';
}

function categoryClasses(category: string): string {
    switch (category) {
        case 'request': return 'bg-accent/15 text-accent border-accent/30';
        case 'audit': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
        case 'extraction': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        case 'client_error': return 'bg-danger/15 text-danger border-danger/30';
        default: return 'bg-white/5 text-secondary border-glass-border';
    }
}

/** Local day key (YYYY-MM-DD) for grouping. */
function dayKey(iso: string): string {
    try { return localDateStr(new Date(iso)); } catch { return iso.slice(0, 10); }
}

/** Friendly day-group header label. */
function dayLabel(key: string): string {
    const today = localDateStr(new Date());
    const yest = localDateStr(new Date(Date.now() - 86400000));
    if (key === today) return 'Today';
    if (key === yest) return 'Yesterday';
    try {
        return new Date(key + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch { return key; }
}

/** Time-of-day for a single row (the date lives in the group header). */
function fmtTimeOnly(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return iso; }
}

/** Primary + secondary description lines for a log row (category-aware). */
function describe(log: AppLog): { primary: string; secondary: string } {
    if (log.category === 'request') {
        return {
            primary: `${log.method ?? ''} ${log.path ?? ''} → ${log.status ?? '?'}${log.durationMs != null ? ` (${log.durationMs}ms)` : ''}`.trim(),
            secondary: [log.userName ? `user: ${log.userName}` : null, log.ip ? `ip: ${log.ip}` : null].filter(Boolean).join('  ·  '),
        };
    }
    if (log.category === 'audit') {
        return {
            primary: `${log.action ?? 'action'}${log.targetType ? ` · ${log.targetType}#${log.targetId ?? ''}` : ''}`,
            secondary: [log.message, log.userName ? `by ${log.userName}` : null].filter(Boolean).join('  ·  '),
        };
    }
    if (log.category === 'extraction') {
        return { primary: log.message ?? 'Extraction failed', secondary: [log.sourceSlug, log.url].filter(Boolean).join('  ·  ') };
    }
    return { primary: log.message ?? 'Client error', secondary: [log.url, log.error].filter(Boolean).join('  ·  ') };
}

const LogsPage = () => {
    const [logs, setLogs] = useState<AppLog[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [category, setCategory] = useState('all');
    const [level, setLevel] = useState('all');
    const [search, setSearch] = useState('');
    const [datePreset, setDatePreset] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(() => {
        LogService.getStats().then(setStats).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await LogService.getLogs({ category, level, search, from, to, page, pageSize: 50 });
            setLogs(res.items);
            setTotalPages(res.totalPages || 1);
            setTotalCount(res.totalCount);
        } catch {
            toast.error('Failed to load logs');
        } finally {
            setLoading(false);
        }
    }, [category, level, search, from, to, page]);

    useEffect(() => { loadStats(); }, [loadStats]);

    // Debounced reload on filter/search/page change.
    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    // Reset to page 1 when a filter changes.
    useEffect(() => { setPage(1); }, [category, level, search, from, to]);

    const applyPreset = (key: string) => {
        setDatePreset(key);
        const { from: f, to: t } = rangeForPreset(key);
        setFrom(f);
        setTo(t);
    };

    // Group the loaded (already created_at-DESC) logs by local day.
    const groups = useMemo(() => {
        const map = new Map<string, AppLog[]>();
        for (const log of logs) {
            const k = dayKey(log.createdAt);
            (map.get(k) ?? map.set(k, []).get(k)!).push(log);
        }
        return [...map.entries()].map(([key, items]) => ({ key, items }));
    }, [logs]);

    const handleClear = async () => {
        const label = category === 'all' ? 'ALL logs' : `all "${category}" logs`;
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        try {
            await LogService.clear(category);
            toast.success('Logs cleared');
            setPage(1);
            load();
            loadStats();
        } catch {
            toast.error('Failed to clear logs');
        }
    };

    const statCards = stats ? [
        { label: 'Total', value: stats.total, cls: 'text-white', Icon: Activity },
        { label: 'Last 24h', value: stats.last24h, cls: 'text-accent', Icon: RotateCw },
        { label: 'Errors', value: stats.byLevel.error ?? 0, cls: 'text-danger', Icon: Bug },
        { label: 'Warnings', value: stats.byLevel.warn ?? 0, cls: 'text-amber-400', Icon: FileWarning },
    ] : [];

    return (
        <>
            <SEO title="Central Logs" description="Application logs — requests, audit trail, extraction failures, and client errors." />
            <div className="p-3 sm:p-6 md:p-8 max-w-[1280px] mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3 mb-5 sm:mb-6">
                    <div>
                        <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">Central Logs</h1>
                        <p className="text-secondary text-xs sm:text-sm mt-1">Requests · audit · extraction · client errors</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { load(); loadStats(); }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 border border-glass-border text-secondary hover:text-white hover:bg-white/10 transition-colors"
                            title="Refresh"
                        >
                            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={handleClear}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                            <span className="hidden sm:inline">Clear {category !== 'all' ? category : 'all'}</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-5 sm:mb-6">
                        {statCards.map((s) => (
                            <div key={s.label} className="glass-morphism border border-glass-border rounded-xl p-3 sm:p-4">
                                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-secondary">
                                    <s.Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {s.label}
                                </div>
                                <div className={`text-xl sm:text-2xl font-bold mt-1 ${s.cls}`}>{s.value.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="space-y-2.5 mb-4">
                    {/* Category chips */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.key}
                                onClick={() => setCategory(c.key)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    category === c.key ? 'bg-accent/20 border-accent/40 text-white' : 'bg-white/5 border-glass-border text-secondary hover:text-white'
                                }`}
                            >
                                {c.label}
                                {stats && c.key !== 'all' && stats.byCategory[c.key] ? ` (${stats.byCategory[c.key]})` : ''}
                            </button>
                        ))}
                    </div>

                    {/* Date presets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
                        <Calendar className="w-4 h-4 text-secondary shrink-0" strokeWidth={1.75} />
                        {DATE_PRESETS.map((p) => (
                            <button
                                key={p.key}
                                onClick={() => applyPreset(p.key)}
                                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                    datePreset === p.key ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-glass-border text-secondary hover:text-white'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom range + level + search */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={from}
                                max={to || localDateStr(new Date())}
                                onChange={(e) => { setFrom(e.target.value); setDatePreset('custom'); }}
                                className="form-input w-auto text-xs sm:text-sm py-1.5 [color-scheme:dark]"
                                aria-label="From date"
                            />
                            <span className="text-secondary text-xs">→</span>
                            <input
                                type="date"
                                value={to}
                                min={from}
                                max={localDateStr(new Date())}
                                onChange={(e) => { setTo(e.target.value); setDatePreset('custom'); }}
                                className="form-input w-auto text-xs sm:text-sm py-1.5 [color-scheme:dark]"
                                aria-label="To date"
                            />
                        </div>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="form-input w-auto text-xs sm:text-sm py-1.5"
                        >
                            {LEVELS.map((l) => <option key={l} value={l}>{l === 'all' ? 'All levels' : l}</option>)}
                        </select>
                        <div className="relative flex-1 min-w-[160px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/60" strokeWidth={1.75} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search message, path, user, ip…"
                                className="form-input w-full text-xs sm:text-sm py-1.5 pl-8"
                            />
                        </div>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="text-center py-16 text-secondary text-sm">Loading logs…</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-16 glass-morphism border border-dashed border-glass-border rounded-2xl text-secondary text-sm">
                        No logs match these filters.
                    </div>
                ) : (
                    <>
                        {/* Date-wise groups */}
                        <div className="space-y-5">
                            {groups.map((g) => (
                                <section key={g.key}>
                                    {/* Sticky day header */}
                                    <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 mb-2 bg-background/85 backdrop-blur-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-accent/12 border border-accent/25 text-accent">
                                                <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                                            </span>
                                            <span className="font-serif text-sm sm:text-base font-bold text-white">{dayLabel(g.key)}</span>
                                        </div>
                                        <span className="text-[11px] text-secondary">{g.items.length} {g.items.length === 1 ? 'entry' : 'entries'}</span>
                                    </div>

                                    {/* Desktop table */}
                                    <div className="hidden md:block glass-morphism border border-glass-border rounded-2xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                {g.items.map((log) => {
                                                    const d = describe(log);
                                                    return (
                                                        <tr key={log.id} className="border-b border-glass-border/50 last:border-b-0 hover:bg-white/5 align-top">
                                                            <td className="px-4 py-3 text-secondary whitespace-nowrap text-xs w-[88px] tabular-nums">{fmtTimeOnly(log.createdAt)}</td>
                                                            <td className="px-2 py-3 w-[80px]">
                                                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${levelClasses(log.level)}`}>{log.level}</span>
                                                            </td>
                                                            <td className="px-2 py-3 w-[112px]">
                                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${categoryClasses(log.category)}`}>{log.category}</span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-white break-words">{d.primary}</div>
                                                                {d.secondary && <div className="text-secondary text-xs mt-0.5 break-words">{d.secondary}</div>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile cards */}
                                    <div className="md:hidden space-y-2">
                                        {g.items.map((log) => {
                                            const d = describe(log);
                                            return (
                                                <div key={log.id} className="glass-morphism border border-glass-border rounded-xl p-3">
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${levelDot(log.level)}`} />
                                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${categoryClasses(log.category)}`}>{log.category}</span>
                                                        </div>
                                                        <span className="text-[10px] text-secondary whitespace-nowrap tabular-nums">{fmtTimeOnly(log.createdAt)}</span>
                                                    </div>
                                                    <div className="text-white text-sm break-words leading-snug">{d.primary}</div>
                                                    {d.secondary && <div className="text-secondary text-xs mt-1 break-words">{d.secondary}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-5 text-sm">
                            <span className="text-secondary text-xs">{totalCount.toLocaleString()} entries · page {page}/{totalPages}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" strokeWidth={2} /> Prev
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white disabled:opacity-30 transition-colors"
                                >
                                    Next <ChevronRight className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default LogsPage;
