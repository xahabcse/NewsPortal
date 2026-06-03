import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsSourceService } from '../services/NewsSourceService';
import { useAuth } from '../context/AuthContext';
import FetchJobStatusModal from '../components/FetchJobStatusModal';
import TestSourceResultsModal from '../components/TestSourceResultsModal';
import toast from 'react-hot-toast';
import type {
    NewsSource,
    CreateNewsSourceDto,
    NewsSourceTestResult,
    FetchJobStatusResponse,
} from '../types/NewsSource';

const HEALTH_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
    0: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
    1: { label: 'Degraded', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
    2: { label: 'Paused', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/30' },
    3: { label: 'Disabled', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

const FETCH_METHOD_LABELS: Record<number, string> = { 1: 'RSS', 2: 'API', 3: 'Scrape' };

const HEALTH_FILTERS = [
    { value: -1, label: 'All' },
    { value: 0, label: 'Active' },
    { value: 1, label: 'Degraded' },
    { value: 2, label: 'Paused' },
    { value: 3, label: 'Disabled' },
];

const emptyForm: CreateNewsSourceDto = {
    name: '',
    baseUrl: '',
    fetchMethod: 1,
    rssFeedUrl: '',
    apiEndpoint: '',
    apiKey: '',
    fetchIntervalMinutes: 30,
};

const INTERVAL_PRESETS = [
    { value: 15, label: '15m' },
    { value: 30, label: '30m' },
    { value: 60, label: '1h' },
    { value: 360, label: '6h' },
    { value: 720, label: '12h' },
    { value: 1440, label: '24h' },
];

function timeAgo(dateStr: string | undefined | null): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

function HealthBadge({ status }: { status: number | undefined }) {
    const info = HEALTH_LABELS[status ?? 0] ?? HEALTH_LABELS[0];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${info.bg} ${info.border} ${info.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${info.color.replace('text-', 'bg-')}`} />
            {info.label}
        </span>
    );
}

function SourceFormModal({
    isOpen,
    editingSource,
    onClose,
    onSave,
    canTest,
    onTestResult,
}: {
    isOpen: boolean;
    editingSource: NewsSource | null;
    onClose: () => void;
    onSave: (form: CreateNewsSourceDto, id: number | null) => Promise<void>;
    canTest: boolean;
    onTestResult?: (result: NewsSourceTestResult, sourceName: string) => void;
}) {
    const [form, setForm] = useState<CreateNewsSourceDto>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<NewsSourceTestResult | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setTestResult(null);
        if (editingSource) {
            setForm({
                name: editingSource.name,
                baseUrl: editingSource.baseUrl,
                logoUrl: editingSource.logoUrl,
                fetchMethod: editingSource.fetchMethod,
                rssFeedUrl: editingSource.rssFeedUrl ?? '',
                apiEndpoint: editingSource.apiEndpoint ?? '',
                apiKey: editingSource.apiKey ?? '',
                fetchIntervalMinutes: editingSource.fetchIntervalMinutes,
            });
        } else {
            setForm(emptyForm);
        }
    }, [isOpen, editingSource]);

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        setError('');
        try {
            const result = await NewsSourceService.testSource(form);
            const sourceName = form.name || (editingSource?.name) || 'New Source';
            setTestResult(result);
            if (onTestResult) {
                onTestResult(result, sourceName);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await onSave(form, editingSource?.id ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] p-4 overflow-y-auto">
            <div className="w-full max-w-2xl glass-morphism border border-glass-border rounded-2xl p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {editingSource ? 'Edit Source' : 'Add News Source'}
                    </h2>
                    <button onClick={onClose} className="text-secondary hover:text-white transition-colors text-xl leading-none">&times;</button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs text-secondary mb-1">Name *</label>
                        <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BBC News" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs text-secondary mb-1">Base URL *</label>
                        <input className="form-input" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="https://www.bbc.com" />
                    </div>
                    <div>
                        <label className="block text-xs text-secondary mb-1">Fetch Method</label>
                        <select className="form-input" value={form.fetchMethod} onChange={e => setForm(f => ({ ...f, fetchMethod: Number(e.target.value) }))}>
                            <option value={1}>RSS</option>
                            <option value={2}>API</option>
                            <option value={3}>Scrape</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-secondary mb-1">Fetch Interval</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {INTERVAL_PRESETS.map(preset => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, fetchIntervalMinutes: preset.value }))}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        form.fetchIntervalMinutes === preset.value
                                            ? 'bg-accent text-white'
                                            : 'bg-white/5 text-secondary hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <input 
                            type="number" 
                            className="form-input" 
                            min={5} 
                            max={1440} 
                            value={form.fetchIntervalMinutes} 
                            onChange={e => setForm(f => ({ ...f, fetchIntervalMinutes: Number(e.target.value) }))} 
                            placeholder="Custom (minutes)"
                        />
                    </div>
                    {form.fetchMethod === 1 && (
                        <div className="col-span-2">
                            <label className="block text-xs text-secondary mb-1">RSS Feed URL</label>
                            <input className="form-input" value={form.rssFeedUrl ?? ''} onChange={e => setForm(f => ({ ...f, rssFeedUrl: e.target.value }))} placeholder="https://feeds.bbci.co.uk/news/rss.xml" />
                        </div>
                    )}
                    {form.fetchMethod === 2 && (
                        <>
                            <div className="col-span-2">
                                <label className="block text-xs text-secondary mb-1">API Endpoint</label>
                                <input className="form-input" value={form.apiEndpoint ?? ''} onChange={e => setForm(f => ({ ...f, apiEndpoint: e.target.value }))} placeholder="https://api.example.com/articles" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-secondary mb-1">API Key</label>
                                <input className="form-input" value={form.apiKey ?? ''} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Optional" />
                            </div>
                        </>
                    )}
                    <div className="col-span-2">
                        <label className="block text-xs text-secondary mb-1">Logo URL</label>
                        <input className="form-input" value={form.logoUrl ?? ''} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png (optional)" />
                    </div>
                </div>

                {testResult && (
                    <div className={`mb-4 p-4 rounded-xl border text-sm ${testResult.isSuccess ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className={`font-semibold mb-1 ${testResult.isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                            {testResult.isSuccess ? '✓ Test Passed' : '✗ Test Failed'}
                        </div>
                        <p className="text-secondary text-xs mb-2">{testResult.message} ({testResult.durationMs}ms)</p>
                        <button
                            onClick={() => {
                                const sourceName = form.name || (editingSource?.name) || 'New Source';
                                if (onTestResult) onTestResult(testResult, sourceName);
                            }}
                            className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
                        >
                            View detailed results →
                        </button>
                    </div>
                )}

                {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

                <div className="flex items-center justify-between pt-2 border-t border-glass-border">
                    <div>
                        {canTest && (
                            <button className="btn-secondary text-xs" onClick={handleTest} disabled={testing || !form.name || !form.baseUrl}>
                                {testing ? 'Testing…' : '🧪 Test Source'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.baseUrl}>
                            {saving ? 'Saving…' : editingSource ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DeleteDialog({
    source,
    onClose,
    onConfirm,
}: {
    source: NewsSource | null;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
}) {
    const [deleting, setDeleting] = useState(false);

    if (!source) return null;

    const handleConfirm = async () => {
        setDeleting(true);
        try {
            await onConfirm(source.id);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-morphism border border-glass-border rounded-2xl p-6 animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-2">Delete Source</h3>
                <p className="text-secondary text-sm mb-6">
                    Are you sure you want to delete <span className="text-white font-medium">{source.name}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button className="btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
                    <button className="btn-danger" onClick={handleConfirm} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FetchJobTracker({ jobId, onDone }: { jobId: string; onDone: () => void }) {
    const [job, setJob] = useState<FetchJobStatusResponse | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            try {
                const status = await NewsSourceService.getFetchJobStatus(jobId);
                if (cancelled) return;
                setJob(status);
                if (status.status === 'Succeeded' || status.status === 'Failed') {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setTimeout(() => onDoneRef.current(), 3000);
                }
            } catch {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        };

        void poll();
        intervalRef.current = setInterval(poll, 2000);

        return () => {
            cancelled = true;
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [jobId]);

    if (!job) {
        return <span className="text-xs text-secondary animate-pulse">Queued…</span>;
    }

    const statusColor = job.status === 'Succeeded' ? 'text-emerald-400' : job.status === 'Failed' ? 'text-red-400' : 'text-amber-400';

    return (
        <span className={`text-xs font-medium ${statusColor}`}>
            {job.status === 'Running' && '⏳ '}
            {job.status === 'Succeeded' && '✓ '}
            {job.status === 'Failed' && '✗ '}
            {job.status}
            {job.status === 'Succeeded' && ` · +${job.newArticles} new`}
            {job.status === 'Failed' && job.errorCode && ` (${job.errorCode})`}
        </span>
    );
}

export default function NewsSourcesPage() {
    const { canManageSources, canCreateSources, canEditSources, canDeleteSources, canFetchSources, sourcePermissionMessage } = useAuth();

    const [sources, setSources] = useState<NewsSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [healthFilter, setHealthFilter] = useState(-1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<NewsSource | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const [fetchingJobs, setFetchingJobs] = useState<Record<number, string>>({});
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [selectedJobSourceName, setSelectedJobSourceName] = useState('');

    const [testResult, setTestResult] = useState<NewsSourceTestResult | null>(null);
    const [testSourceName, setTestSourceName] = useState('');

    const loadSources = useCallback(async () => {
        try {
            const data = canManageSources
                ? await NewsSourceService.getAll()
                : await NewsSourceService.getActive();
            setSources(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sources');
        } finally {
            setLoading(false);
        }
    }, [canManageSources]);

    useEffect(() => { void loadSources(); }, [loadSources]);

    const filtered = sources.filter(s => {
        if (healthFilter >= 0 && (s.healthStatus ?? 0) !== healthFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return s.name.toLowerCase().includes(q) || s.baseUrl.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
        }
        return true;
    });

    const handleSave = async (form: CreateNewsSourceDto, id: number | null) => {
        // Convert empty strings to undefined for optional URL fields to pass [Url] validation
        const sanitized: CreateNewsSourceDto = {
            ...form,
            logoUrl: form.logoUrl?.trim() || undefined,
            rssFeedUrl: form.rssFeedUrl?.trim() || undefined,
            apiEndpoint: form.apiEndpoint?.trim() || undefined,
            apiKey: form.apiKey?.trim() || undefined,
        };
        if (id != null) {
            await NewsSourceService.update(id, sanitized);
        } else {
            await NewsSourceService.create(sanitized);
        }
        setModalOpen(false);
        setEditingSource(null);
        await loadSources();
    };

    const handleDelete = async (id: number) => {
        await NewsSourceService.delete(id);
        setDeleteTarget(null);
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        await loadSources();
    };

    const handleFetch = async (source: NewsSource) => {
        try {
            const resp = await NewsSourceService.fetchNow(source.id);
            setFetchingJobs(prev => ({ ...prev, [source.id]: resp.jobId }));
            setSelectedJobId(resp.jobId);
            setSelectedJobSourceName(source.name);
            toast.success(`Fetch job started for "${source.name}"`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Fetch failed');
        }
    };

    const handleFetchDone = useCallback((sourceId: number) => {
        setFetchingJobs(prev => {
            const next = { ...prev };
            delete next[sourceId];
            return next;
        });
        void loadSources();
    }, [loadSources]);

    const handleResume = async (id: number) => {
        await NewsSourceService.resume(id);
        await loadSources();
    };

    const handlePause = async (id: number) => {
        await NewsSourceService.pause(id);
        await loadSources();
    };

    const handleDisable = async (id: number) => {
        await NewsSourceService.disable(id);
        await loadSources();
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(s => s.id)));
        }
    };

    const handleBulkAction = async (action: 'pause' | 'resume' | 'fetch') => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await NewsSourceService.bulkAction({ sourceIds: Array.from(selectedIds), action });
            setSelectedIds(new Set());
            await loadSources();
            toast.success(`${selectedIds.size} sources ${action}d successfully`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Bulk action failed');
        } finally {
            setBulkLoading(false);
        }
    };

    const healthCounts = sources.reduce<Record<number, number>>((acc, s) => {
        const h = s.healthStatus ?? 0;
        acc[h] = (acc[h] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <main className="p-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-white mb-1">News Channels</h1>
                    <p className="text-secondary text-sm">{sourcePermissionMessage}</p>
                </div>
                {canCreateSources && (
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => { setEditingSource(null); setModalOpen(true); }}
                    >
                        <span className="text-lg leading-none">+</span> Add Source
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <input
                        type="text"
                        placeholder="Search sources…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="form-input pl-9"
                    />
                    <svg className="absolute left-3 top-2.5 text-secondary" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {HEALTH_FILTERS.map(f => {
                        const count = f.value === -1 ? sources.length : (healthCounts[f.value] ?? 0);
                        const active = healthFilter === f.value;
                        return (
                            <button
                                key={f.value}
                                onClick={() => setHealthFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    active
                                        ? 'bg-accent/20 border-accent/40 text-white'
                                        : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {f.label}
                                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && canManageSources && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20 animate-fade-in">
                    <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
                    <button className="bulk-btn inline-flex items-center gap-1.5" onClick={() => handleBulkAction('fetch')} disabled={bulkLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                        Fetch All
                    </button>
                    <button className="bulk-btn inline-flex items-center gap-1.5" onClick={() => handleBulkAction('resume')} disabled={bulkLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        Resume All
                    </button>
                    <button className="bulk-btn inline-flex items-center gap-1.5" onClick={() => handleBulkAction('pause')} disabled={bulkLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="4" x2="6" y2="20" /><line x1="18" y1="4" x2="18" y2="20" /></svg>
                        Pause All
                    </button>
                    <button className="text-xs text-secondary hover:text-white ml-auto transition-colors" onClick={() => setSelectedIds(new Set())}>Clear</button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent" />
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center text-sm">
                    {error}
                    <button onClick={loadSources} className="ml-3 underline hover:text-red-300">Retry</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center p-12 bg-white/2 rounded-2xl border border-dashed border-glass-border">
                    <h3 className="text-white font-semibold mb-1">No sources found</h3>
                    <p className="text-secondary text-sm">{search || healthFilter >= 0 ? 'Try adjusting your filters.' : 'Add your first news source to get started.'}</p>
                </div>
            ) : (
                <div className="glass-morphism border border-glass-border rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-glass-border text-left">
                                    {canManageSources && (
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === filtered.length && filtered.length > 0}
                                                onChange={toggleAll}
                                                className="accent-accent"
                                            />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Source</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Method</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Health</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Articles</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Last Fetch</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Failures</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(source => (
                                    <tr key={source.id} className="border-b border-glass-border/50 hover:bg-white/[0.02] transition-colors">
                                        {canManageSources && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(source.id)}
                                                    onChange={() => toggleSelect(source.id)}
                                                    className="accent-accent"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {source.logoUrl ? (
                                                    <img src={source.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/5" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                                                        {source.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-white font-medium">{source.name}</div>
                                                    <div className="text-xs text-secondary truncate max-w-[200px]">{source.baseUrl}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-secondary font-mono">
                                                {FETCH_METHOD_LABELS[source.fetchMethod] ?? 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <HealthBadge status={source.healthStatus} />
                                        </td>
                                        <td className="px-4 py-3 text-secondary">{source.articleCount ?? 0}</td>
                                        <td className="px-4 py-3 text-secondary text-xs">{timeAgo(source.lastFetchedAt)}</td>
                                        <td className="px-4 py-3">
                                            {(source.consecutiveFailures ?? 0) > 0 ? (
                                                <span className="text-amber-400 text-xs font-medium" title={source.lastErrorCode ?? ''}>
                                                    {source.consecutiveFailures}
                                                </span>
                                            ) : (
                                                <span className="text-secondary text-xs">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {fetchingJobs[source.id] ? (
                                                    <FetchJobTracker
                                                        jobId={fetchingJobs[source.id]}
                                                        onDone={() => handleFetchDone(source.id)}
                                                    />
                                                ) : (
                                                    <>
                                                        {canFetchSources && source.isActive && (
                                                            <button
                                                                onClick={() => handleFetch(source)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 transition-colors"
                                                                title="Fetch now"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                                                Fetch
                                                            </button>
                                                        )}
                                                        {canEditSources && (source.healthStatus === 2 || source.healthStatus === 1) && (
                                                            <button
                                                                onClick={() => handleResume(source.id)}
                                                                className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                                                                title="Resume"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                            </button>
                                                        )}
                                                        {canEditSources && source.healthStatus === 0 && (
                                                            <button
                                                                onClick={() => handlePause(source.id)}
                                                                className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-sky-500/15 text-sky-400 text-xs font-medium hover:bg-sky-500/25 transition-colors"
                                                                title="Pause"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="4" x2="6" y2="20" /><line x1="18" y1="4" x2="18" y2="20" /></svg>
                                                            </button>
                                                        )}
                                                        {canEditSources && (
                                                            <button
                                                                onClick={() => { setEditingSource(source); setModalOpen(true); }}
                                                                className="px-2 py-1 rounded-md bg-white/5 text-secondary text-xs hover:bg-white/10 hover:text-white transition-colors"
                                                                title="Edit"
                                                            >
                                                                ✎
                                                            </button>
                                                        )}
                                                        {canDeleteSources && (
                                                            <button
                                                                onClick={() => handleDisable(source.id)}
                                                                className="px-2 py-1 rounded-md bg-red-500/10 text-red-400/70 text-xs hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                                title="Disable"
                                                            >
                                                                ⊘
                                                            </button>
                                                        )}
                                                        {canDeleteSources && (
                                                            <button
                                                                onClick={() => setDeleteTarget(source)}
                                                                className="px-2 py-1 rounded-md bg-red-500/10 text-red-400/70 text-xs hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                                title="Delete"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-3 border-t border-glass-border flex items-center justify-between">
                        <span className="text-xs text-secondary">
                            {filtered.length} of {sources.length} sources
                        </span>
                    </div>
                </div>
            )}

            {/* Modals */}
            <SourceFormModal
                isOpen={modalOpen}
                editingSource={editingSource}
                onClose={() => { setModalOpen(false); setEditingSource(null); setTestResult(null); }}
                onSave={handleSave}
                canTest={canFetchSources}
                onTestResult={(result, name) => {
                    setTestResult(result);
                    setTestSourceName(name);
                }}
            />
            <DeleteDialog
                source={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
            <FetchJobStatusModal
                isOpen={!!selectedJobId}
                jobId={selectedJobId}
                sourceName={selectedJobSourceName}
                onClose={() => {
                    setSelectedJobId(null);
                    setSelectedJobSourceName('');
                    loadSources(); // Refresh after modal closes
                }}
            />
            <TestSourceResultsModal
                isOpen={!!testResult}
                result={testResult}
                sourceName={testSourceName}
                onClose={() => {
                    setTestResult(null);
                    setTestSourceName('');
                }}
            />
        </main>
    );
}
