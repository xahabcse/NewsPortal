import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
}

interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [results, setResults] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Save to recent searches
    useEffect(() => {
        if (query.trim()) {
            const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]') as string[];
            const filtered = recent.filter(s => s.toLowerCase() !== query.toLowerCase());
            filtered.unshift(query);
            const limited = filtered.slice(0, 5); // Keep last 5 searches
            localStorage.setItem('recentSearches', JSON.stringify(limited));
        }
    }, [query]);

    // Fetch search results
    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await axiosInstance.post<PagedResult<NewsArticle>>('/news/search', {
                    query: query.trim(),
                    page,
                    pageSize: 12
                });
                setResults(response.data.items);
                setTotalPages(response.data.totalPages);
                setTotalCount(response.data.totalCount);
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'response' in err) {
                    const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
                    if (axiosError.response?.status === 400) {
                        setError('Please enter a valid search query.');
                    } else if (axiosError.response?.status === 404) {
                        setError('No articles found matching your search.');
                    } else {
                        setError('Failed to search articles. Please try again.');
                    }
                } else {
                    setError('Failed to search articles. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, page]);

    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]') as string[];

    const clearRecentSearches = () => {
        localStorage.removeItem('recentSearches');
        window.location.reload();
    };

    if (!query.trim()) {
        return (
            <>
                <SEO
                    title="Search News"
                    description="Search through thousands of news articles from trusted sources worldwide."
                />
                <div className="p-8">
                    <div className="max-w-2xl mx-auto text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-secondary/40"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Search News</h1>
                    <p className="text-secondary text-sm mb-8">
                        Find articles by title, summary, author, or content
                    </p>

                    {recentSearches.length > 0 && (
                        <div className="bg-white/5 rounded-xl border border-glass-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Recent Searches</h3>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-xs text-secondary hover:text-white transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((search, idx) => (
                                    <Link
                                        key={idx}
                                        to={`/search?q=${encodeURIComponent(search)}`}
                                        className="px-3 py-1.5 bg-white/5 border border-glass-border rounded-lg text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        {search}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Search Results
                        </h1>
                        <p className="text-secondary text-sm">
                            {loading ? (
                                'Searching...'
                            ) : (
                                <>
                                    Found <span className="text-accent font-semibold">{totalCount}</span> articles for "<span className="text-accent">{query}</span>"
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>

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
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
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
                            className="text-red-500"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-1">Search Error</h3>
                    <p className="text-secondary text-sm max-w-md mx-auto">{error}</p>
                </div>
            ) : results.length === 0 ? (
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
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-1">No Results Found</h3>
                    <p className="text-secondary text-sm max-w-md mx-auto mb-4">
                        We couldn't find any articles matching "{query}". Try different keywords or check your spelling.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-medium text-sm"
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
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.map((article) => (
                            <NewsCard
                                key={article.id}
                                title={article.title}
                                summary={article.summary}
                                categoryName={article.categoryName}
                                sourceName={article.sourceName}
                                publishedAt={article.publishedAt}
                                thumbnailUrl={article.thumbnailUrl}
                                slug={article.slug}
                            />
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
    );
};

export default SearchResultsPage;
