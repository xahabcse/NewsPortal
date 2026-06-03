import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { axiosInstance } from '../services/axiosInstance';
import { newsApi, type Category } from '../services/api';
import { NewsSourceService } from '../services/NewsSourceService';
import type { NewsSource } from '../types/NewsSource';
import NewsCard from '../components/NewsCard';

interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
    sourceUrl: string | null;
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

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [sources, setSources] = useState<NewsSource[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
    const [selectedSource, setSelectedSource] = useState<number | ''>('');
    const [datePreset, setDatePreset] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<string>('newest');

    // Load filter options
    useEffect(() => {
        newsApi.getCategories().then(setCategories).catch(() => {});
        NewsSourceService.getAll().then(s => setSources(s.filter(x => x.isActive))).catch(() => {});
    }, []);

    const activeFilterCount = [selectedCategory, selectedSource, datePreset].filter(Boolean).length + (sortOrder !== 'newest' ? 1 : 0);

    // Save to recent searches
    useEffect(() => {
        if (query.trim()) {
            const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]') as string[];
            const filtered = recent.filter(s => s.toLowerCase() !== query.toLowerCase());
            filtered.unshift(query);
            const limited = filtered.slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(limited));
        }
    }, [query]);

    // Compute date filter
    const getFromDate = useCallback(() => {
        if (!datePreset) return undefined;
        const now = new Date();
        if (datePreset === 'today') {
            now.setHours(0, 0, 0, 0);
            return now.toISOString();
        }
        if (datePreset === 'week') {
            now.setDate(now.getDate() - 7);
            return now.toISOString();
        }
        if (datePreset === 'month') {
            now.setMonth(now.getMonth() - 1);
            return now.toISOString();
        }
        return undefined;
    }, [datePreset]);

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
                const body: Record<string, unknown> = {
                    query: query.trim(),
                    page,
                    pageSize: 12,
                };
                if (selectedCategory) body.categoryId = selectedCategory;
                if (selectedSource) body.sourceId = selectedSource;
                const fromDate = getFromDate();
                if (fromDate) body.fromDate = fromDate;

                const response = await axiosInstance.post<PagedResult<NewsArticle>>('/news/search', body);
                let items = response.data.items;

                // Client-side sort for oldest
                if (sortOrder === 'oldest') {
                    items = [...items].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
                }

                setResults(items);
                setTotalPages(response.data.totalPages);
                setTotalCount(response.data.totalCount);
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'response' in err) {
                    const axiosError = err as { response?: { status?: number } };
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
    }, [query, page, selectedCategory, selectedSource, datePreset, sortOrder, getFromDate]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [selectedCategory, selectedSource, datePreset, sortOrder]);

    const clearFilters = () => {
        setSelectedCategory('');
        setSelectedSource('');
        setDatePreset('');
        setSortOrder('newest');
    };

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
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary/40">
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
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            showFilters || activeFilterCount > 0
                                ? 'bg-accent/15 border-accent/40 text-accent'
                                : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14"></line>
                            <line x1="4" y1="10" x2="4" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12" y2="3"></line>
                            <line x1="20" y1="21" x2="20" y2="16"></line>
                            <line x1="20" y1="12" x2="20" y2="3"></line>
                            <line x1="1" y1="14" x2="7" y2="14"></line>
                            <line x1="9" y1="8" x2="15" y2="8"></line>
                            <line x1="17" y1="16" x2="23" y2="16"></line>
                        </svg>
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white/5 border border-glass-border rounded-xl p-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-secondary mb-1.5">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-secondary mb-1.5">Source</label>
                                <select
                                    value={selectedSource}
                                    onChange={e => setSelectedSource(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                >
                                    <option value="">All Sources</option>
                                    {sources.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-secondary mb-1.5">Date Range</label>
                                <select
                                    value={datePreset}
                                    onChange={e => setDatePreset(e.target.value)}
                                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                >
                                    <option value="">Any Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">Past Week</option>
                                    <option value="month">Past Month</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-secondary mb-1.5">Sort By</label>
                                <select
                                    value={sortOrder}
                                    onChange={e => setSortOrder(e.target.value)}
                                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="relevance">Relevance</option>
                                </select>
                            </div>
                        </div>
                        {activeFilterCount > 0 && (
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-secondary hover:text-white transition-colors"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary/40">
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                sourceUrl={article.sourceUrl}
                                articleId={article.id}
                                showBookmark
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
