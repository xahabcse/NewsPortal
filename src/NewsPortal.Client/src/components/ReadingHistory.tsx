import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReadHistoryService, type ReadHistoryItem } from '../services/ReadHistoryService';
import { useAuth } from '../context/AuthContext';

interface Props {
    /** 'sidebar' = compact list (legacy). 'dashboard' = card grid for the profile page. */
    variant?: 'sidebar' | 'dashboard';
}

const ReadingHistory = ({ variant = 'sidebar' }: Props) => {
    const { isAuthenticated } = useAuth();
    const [history, setHistory] = useState<ReadHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        fetchHistory();
    }, [isAuthenticated]);

    const fetchHistory = async () => {
        try {
            const result = await ReadHistoryService.getReadingHistory(10);
            setHistory(result.items);
        } catch (error) {
            console.error('Failed to fetch reading history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    // ── Dashboard variant: a card matching the other profile sections ──────────
    if (variant === 'dashboard') {
        return (
            <div className="bg-white/5 border border-glass-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Recently Read</h3>
                    {history.length > 0 && (
                        <span className="text-xs text-secondary">{history.length} article{history.length > 1 ? 's' : ''}</span>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary/40">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <p className="text-sm text-secondary mb-1">No articles read yet</p>
                        <Link to="/" className="text-xs text-accent hover:text-accent/80 transition-colors">Browse News →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {history.map((item) => (
                            <Link
                                key={item.id}
                                to={`/news/${item.article.slug}`}
                                className="block p-3 rounded-xl bg-white/5 border border-glass-border hover:bg-white/10 hover:border-accent/30 transition-colors group"
                            >
                                <div className="text-sm text-white line-clamp-2 group-hover:text-accent transition-colors">
                                    {item.article.title}
                                </div>
                                <div className="text-[11px] text-secondary/60 mt-1.5">
                                    {item.article.sourceName}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Sidebar variant (legacy compact list) ──────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-2">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">
                    Recently Read
                </div>
                {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-16 bg-white/5 rounded-lg animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="space-y-2">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">
                    Recently Read
                </div>
                <div className="text-xs text-secondary/50 ml-4">
                    No recent articles
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">
                Recently Read
            </div>
            <div className="space-y-1 ml-2">
                {history.map((item) => (
                    <Link
                        key={item.id}
                        to={`/news/${item.article.slug}`}
                        className="block p-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                        <div className="text-xs text-white line-clamp-2 group-hover:text-accent transition-colors">
                            {item.article.title}
                        </div>
                        <div className="text-[10px] text-secondary/50 mt-1">
                            {item.article.sourceName}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default ReadingHistory;
