import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReadHistoryService, type ReadHistoryItem } from '../services/ReadHistoryService';
import { useAuth } from '../context/AuthContext';

const ReadingHistory = () => {
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
            {history.length >= 10 && (
                <div className="ml-4 mt-2">
                    <Link
                        to="/bookmarks"
                        className="text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                        View all →
                    </Link>
                </div>
            )}
        </div>
    );
};

export default ReadingHistory;
