import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
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

function levelClasses(level: string): string {
    if (level === 'error') return 'bg-danger/15 text-danger border-danger/30';
    if (level === 'warn') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-white/5 text-secondary border-glass-border';
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

function fmtTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
    // client_error
    return { primary: log.message ?? 'Client error', secondary: [log.url, log.error].filter(Boolean).join('  ·  ') };
}

const LogsPage = () => {
    const [logs, setLogs] = useState<AppLog[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [category, setCategory] = useState('all');
    const [level, setLevel] = useState('all');
    const [search, setSearch] = useState('');
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
            const res = await LogService.getLogs({ category, level, search, page, pageSize: 25 });
            setLogs(res.items);
            setTotalPages(res.totalPages || 1);
            setTotalCount(res.totalCount);
        } catch {
            toast.error('Failed to load logs');
        } finally {
            setLoading(false);
        }
    }, [category, level, search, page]);

    useEffect(() => { loadStats(); }, [loadStats]);

    // Debounced reload on filter/search/page change.
    useEffect(() => {
        const t = setTimeout(load, search ? 350 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    // Reset to page 1 when a filter changes.
    useEffect(() => { setPage(1); }, [category, level, search]);

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

    return (
        <>
            <SEO title="Central Logs" description="Application logs — requests, audit trail, extraction failures, and client errors." />
            <div className="p-4 sm:p-6 md:p-8 max-w-[1280px] mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
                    <div>
                        <h1 className="font-serif text-2xl md:text-3xl font-bold text-white">Central Logs</h1>
                        <p className="text-secondary text-sm mt-1">Requests · audit · extraction · client errors</p>
                    </div>
                    <button
                        onClick={handleClear}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors"
                    >
                        Clear {category !== 'all' ? category : 'all'}
                    </button>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {[
                            { label: 'Total', value: stats.total, cls: 'text-white' },
                            { label: 'Last 24h', value: stats.last24h, cls: 'text-accent' },
                            { label: 'Errors', value: stats.byLevel.error ?? 0, cls: 'text-danger' },
                            { label: 'Warnings', value: stats.byLevel.warn ?? 0, cls: 'text-amber-400' },
                        ].map((s) => (
                            <div key={s.label} className="glass-morphism border border-glass-border rounded-xl p-4">
                                <div className="text-[11px] uppercase tracking-wider text-secondary">{s.label}</div>
                                <div className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.value.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.key}
                                onClick={() => setCategory(c.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    category === c.key ? 'bg-accent/20 border-accent/40 text-white' : 'bg-white/5 border-glass-border text-secondary hover:text-white'
                                }`}
                            >
                                {c.label}
                                {stats && c.key !== 'all' && stats.byCategory[c.key] ? ` (${stats.byCategory[c.key]})` : ''}
                            </button>
                        ))}
                    </div>
                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="form-input w-auto text-sm py-1.5"
                    >
                        {LEVELS.map((l) => <option key={l} value={l}>{l === 'all' ? 'All levels' : l}</option>)}
                    </select>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search message, path, user, ip…"
                        className="form-input flex-1 min-w-[180px] text-sm py-1.5"
                    />
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
                        {/* Desktop table */}
                        <div className="hidden md:block glass-morphism border border-glass-border rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-glass-border text-left text-[11px] uppercase tracking-wider text-secondary">
                                        <th className="px-4 py-3 font-medium w-[150px]">Time</th>
                                        <th className="px-4 py-3 font-medium w-[90px]">Level</th>
                                        <th className="px-4 py-3 font-medium w-[110px]">Category</th>
                                        <th className="px-4 py-3 font-medium">Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        const d = describe(log);
                                        return (
                                            <tr key={log.id} className="border-b border-glass-border/50 last:border-b-0 hover:bg-white/5 align-top">
                                                <td className="px-4 py-3 text-secondary whitespace-nowrap text-xs">{fmtTime(log.createdAt)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${levelClasses(log.level)}`}>{log.level}</span>
                                                </td>
                                                <td className="px-4 py-3">
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
                        <div className="md:hidden space-y-2.5">
                            {logs.map((log) => {
                                const d = describe(log);
                                return (
                                    <div key={log.id} className="glass-morphism border border-glass-border rounded-xl p-3.5">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${levelClasses(log.level)}`}>{log.level}</span>
                                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${categoryClasses(log.category)}`}>{log.category}</span>
                                            </div>
                                            <span className="text-[10px] text-secondary whitespace-nowrap">{fmtTime(log.createdAt)}</span>
                                        </div>
                                        <div className="text-white text-sm break-words">{d.primary}</div>
                                        {d.secondary && <div className="text-secondary text-xs mt-1 break-words">{d.secondary}</div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-5 text-sm">
                            <span className="text-secondary text-xs">{totalCount.toLocaleString()} entries · page {page}/{totalPages}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white disabled:opacity-30 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white disabled:opacity-30 transition-colors"
                                >
                                    Next
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
