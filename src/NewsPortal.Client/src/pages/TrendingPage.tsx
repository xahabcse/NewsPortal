import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { axiosInstance } from '../services/axiosInstance';
import NewsCard from '../components/NewsCard';

interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
    publishedAt: string;
    sourceName: string;
    categoryName: string | null;
    viewCount?: number;
}

const TrendingPage = () => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState(24); // hours

    useEffect(() => {
        const fetchTrending = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await axiosInstance.get<NewsArticle[]>(
                    `/news/trending?count=24&hours=${timeRange}`
                );
                setArticles(response.data);
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'response' in err) {
                    const axiosError = err as { response?: { status?: number } };
                    if (axiosError.response?.status === 404) {
                        setError('No trending articles found.');
                    } else {
                        setError('Failed to load trending articles.');
                    }
                } else {
                    setError('Failed to load trending articles.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTrending();
    }, [timeRange]);

    const timeRanges = [
        { label: '24h', value: 24 },
        { label: '48h', value: 48 },
        { label: '7d', value: 168 }
    ];

    return (
        <>
            <SEO
                title="Trending News - Most Viewed Articles"
                description="Discover the most popular and trending news articles. See what everyone is reading right now."
            />
            <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white"
                                >
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-white">Trending Now</h1>
                        </div>
                        <p className="text-secondary text-sm">
                            Most viewed articles in the last {timeRange >= 168 ? `${timeRange / 24} days` : `${timeRange} hours`}
                        </p>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-glass-border">
                        {timeRanges.map(range => (
                            <button
                                key={range.value}
                                onClick={() => setTimeRange(range.value)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                    timeRange === range.value
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-secondary hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="glass-morphism border border-glass-border rounded-2xl overflow-hidden animate-pulse">
                            <div className="h-48 bg-white/10"></div>
                            <div className="p-6 space-y-3">
                                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                                <div className="h-4 bg-white/10 rounded"></div>
                                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-orange-500"
                        >
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-1">No Trending Articles</h3>
                    <p className="text-secondary text-sm max-w-md mx-auto">{error}</p>
                    <Link
                        to="/"
                        className="mt-4 inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-medium text-sm"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back to Home
                    </Link>
                </div>
            ) : articles.length === 0 ? (
                <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-secondary/40"
                        >
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-1">No Articles Yet</h3>
                    <p className="text-secondary text-sm max-w-md mx-auto">
                        Articles will appear here once they start getting views.
                    </p>
                </div>
            ) : (
                <>
                    {/* Ranked Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {articles.map((article, index) => (
                            <div key={article.id} className="relative">
                                {/* Rank Badge */}
                                <div className="absolute -top-2 -left-2 z-10 w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                    <span className="text-white font-bold text-sm">{index + 1}</span>
                                </div>
                                <NewsCard
                                    title={article.title}
                                    summary={article.summary}
                                    categoryName={article.categoryName}
                                    sourceName={article.sourceName}
                                    publishedAt={article.publishedAt}
                                    thumbnailUrl={article.thumbnailUrl}
                                    slug={article.slug}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 text-center">
                        <p className="text-secondary text-sm">
                            Showing top {articles.length} articles by view count
                        </p>
                    </div>
                </>
            )}
        </div>
        </>
    );
};

export default TrendingPage;
