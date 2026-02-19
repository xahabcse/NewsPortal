import { useState, useEffect } from 'react';
import SEO from '../../components/SEO';
import { axiosInstance } from '../../services/axiosInstance';

interface FetchLog {
    id: string;
    sourceId: number;
    sourceName: string;
    status: string;
    articlesFetched: number;
    newArticles: number;
    updatedArticles: number;
    duration: string;
    errorMessage?: string;
    startedAt: string;
}

interface FetchLogsResponse {
    items: FetchLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

const FetchLogPage = () => {
    const [logs, setLogs] = useState<FetchLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axiosInstance.get<FetchLogsResponse>(
                    `/fetchjobs/logs?page=${page}&pageSize=20&status=${statusFilter}`
                );
                setLogs(response.data.items);
                setTotalPages(response.data.totalPages);
            } catch (err: unknown) {
                setError('Failed to load fetch logs');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [page, statusFilter]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'Failed': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'Running': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-secondary bg-white/5 border-glass-border';
        }
    };

    return (
        <>
            <SEO
                title="Fetch History Logs"
                description="View news source fetch history and import logs."
            />
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Fetch History</h1>
                            <p className="text-secondary text-sm">View import logs and fetch job history</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                            >
                                <option value="all">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Failed">Failed</option>
                                <option value="Running">Running</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 10 }).map((_, idx) => (
                            <div key={idx} className="glass-morphism border border-glass-border rounded-xl p-4 animate-pulse">
                                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-white/10 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                        <p className="text-secondary">No fetch logs found</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="glass-morphism border border-glass-border rounded-xl p-4 hover:border-glass-border/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                                                {log.status}
                                            </span>
                                            <span className="text-white font-medium">{log.sourceName}</span>
                                        </div>
                                        <span className="text-xs text-secondary">
                                            {new Date(log.startedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-secondary">Articles:</span>{' '}
                                            <span className="text-white font-medium">{log.articlesFetched}</span>
                                        </div>
                                        <div>
                                            <span className="text-secondary">New:</span>{' '}
                                            <span className="text-green-400 font-medium">{log.newArticles}</span>
                                        </div>
                                        <div>
                                            <span className="text-secondary">Updated:</span>{' '}
                                            <span className="text-blue-400 font-medium">{log.updatedArticles}</span>
                                        </div>
                                        <div>
                                            <span className="text-secondary">Duration:</span>{' '}
                                            <span className="text-white font-medium">{log.duration}</span>
                                        </div>
                                    </div>
                                    {log.errorMessage && (
                                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                                            {log.errorMessage}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg bg-white/5 border border-glass-border text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-sm text-secondary">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 rounded-lg bg-white/5 border border-glass-border text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default FetchLogPage;
