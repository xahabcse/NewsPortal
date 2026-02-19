import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkService, type Bookmark } from '../services/BookmarkService';
import { useAuth } from '../context/AuthContext';
import NewsCard from '../components/NewsCard';

const BookmarksPage = () => {
    const { isAuthenticated } = useAuth();
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) {
            setError('Please login to view your bookmarks');
            setLoading(false);
            return;
        }

        fetchBookmarks();
    }, [page, isAuthenticated]);

    const fetchBookmarks = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await BookmarkService.getBookmarks(page, 12);
            setBookmarks(result.items);
            setTotalPages(result.totalPages);
            setTotalCount(result.totalCount);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { status?: number } };
                if (axiosError.response?.status === 401) {
                    setError('Please login to view your bookmarks');
                } else {
                    setError('Failed to load bookmarks');
                }
            } else {
                setError('Failed to load bookmarks');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBookmark = async (articleId: number) => {
        try {
            await BookmarkService.removeBookmark(articleId);
            setBookmarks(prev => prev.filter(b => b.articleId !== articleId));
            setTotalCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to remove bookmark:', err);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="p-8">
                <div className="max-w-md mx-auto text-center p-12 bg-white/5 rounded-2xl border border-glass-border">
                    <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
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
                            className="text-accent"
                        >
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
                    <p className="text-secondary text-sm mb-6">
                        Please login to view and manage your saved articles.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition-colors"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent to-purple-500 rounded-lg flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                        >
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Saved Articles</h1>
                </div>
                <p className="text-secondary text-sm">
                    {loading ? (
                        'Loading your bookmarks...'
                    ) : (
                        <>
                            You have <span className="text-accent font-semibold">{totalCount}</span> saved articles
                        </>
                    )}
                </p>
            </div>

            {/* Content */}
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
                    <h3 className="text-white font-semibold mb-1">{error}</h3>
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
            ) : bookmarks.length === 0 ? (
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
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3 className="text-white font-semibold mb-1">No Bookmarks Yet</h3>
                    <p className="text-secondary text-sm max-w-md mx-auto mb-6">
                        Start saving articles to read later by clicking the bookmark icon on any news card.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition-colors"
                    >
                        Browse News
                    </Link>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookmarks.map((bookmark) => (
                            <div key={bookmark.id} className="relative group">
                                <NewsCard
                                    title={bookmark.article.title}
                                    summary={bookmark.article.summary}
                                    categoryName={bookmark.article.categoryName}
                                    sourceName={bookmark.article.sourceName}
                                    publishedAt={bookmark.article.publishedAt}
                                    thumbnailUrl={bookmark.article.thumbnailUrl}
                                    slug={bookmark.article.slug}
                                    articleId={bookmark.article.id}
                                    showBookmark={true}
                                    isBookmarked={true}
                                    onBookmarkToggle={(id) => handleRemoveBookmark(id)}
                                />
                                <div className="absolute top-4 right-4 z-10">
                                    <button
                                        onClick={() => handleRemoveBookmark(bookmark.article.id)}
                                        className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center hover:bg-red-500/30 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove bookmark"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-red-400"
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
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
    );
};

export default BookmarksPage;
