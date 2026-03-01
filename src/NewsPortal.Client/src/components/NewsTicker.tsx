import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { newsApi, type NewsArticle } from '../services/api';
import { signalRService } from '../services/SignalRService';

const NewsTicker = () => {
    const navigate = useNavigate();
    const [headlines, setHeadlines] = useState<NewsArticle[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        // Load featured/latest headlines for ticker
        newsApi.getFeaturedNews(8)
            .then(items => {
                if (items && items.length > 0) {
                    setHeadlines(items);
                } else {
                    // Fallback to latest when no featured articles
                    newsApi.getLatestNews(1, 8).then(r => setHeadlines(r.items)).catch(() => { });
                }
            })
            .catch(() => {
                // Fallback to latest on error
                newsApi.getLatestNews(1, 8).then(r => setHeadlines(r.items)).catch(() => { });
            });

        // Listen for breaking news via SignalR
        signalRService.onNotification((type, title) => {
            if (type === 'breaking') {
                setHeadlines(prev => {
                    const breakingItem: NewsArticle = {
                        id: Date.now(),
                        title: `BREAKING: ${title}`,
                        slug: '',
                        summary: null,
                        thumbnailUrl: null,
                        sourceUrl: null,
                        publishedAt: new Date().toISOString(),
                        sourceName: 'Breaking News',
                        categoryName: 'Breaking',
                    };
                    return [breakingItem, ...prev].slice(0, 10);
                });
                setDismissed(false); // Show ticker again for breaking news
            }
        });
    }, []);

    if (dismissed || headlines.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-red-500/10 via-accent/5 to-red-500/10 border-b border-red-500/20 relative overflow-hidden">
            <div className="flex items-center h-8">
                <div
                    className="flex-1 overflow-hidden"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div
                        className={`flex gap-8 whitespace-nowrap ${isPaused ? '' : 'animate-ticker'}`}
                        style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
                    >
                        {[...headlines, ...headlines].map((item, idx) => (
                            <button
                                key={`${item.id}-${idx}`}
                                onClick={() => {
                                    if (item.slug) navigate(`/news/${item.slug}`);
                                }}
                                className="inline-flex items-center gap-2 text-xs text-secondary hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500/70 flex-shrink-0"></span>
                                <span>{item.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 px-2 h-full text-secondary hover:text-white transition-colors"
                    aria-label="Dismiss ticker"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NewsTicker;
