import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { newsApi, type NewsArticle } from '../services/api';
import NewsCard from '../components/NewsCard';

const CategoryPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [categoryName, setCategoryName] = useState('');

    const fetchArticles = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const result = await newsApi.getNewsByCategory(slug, page, 12);
            setArticles(result.items);
            setTotalPages(result.totalPages);
            if (result.items.length > 0 && result.items[0].categoryName) {
                setCategoryName(result.items[0].categoryName);
            } else {
                setCategoryName(slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            }
        } catch (error) {
            console.error('Failed to fetch category articles:', error);
        } finally {
            setLoading(false);
        }
    }, [slug, page]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    useEffect(() => {
        setPage(1);
    }, [slug]);

    if (loading) {
        return (
            <div className="p-8">
                <div className="mb-8">
                    <div className="h-4 bg-white/10 rounded w-32 mb-4 animate-pulse"></div>
                    <div className="h-8 bg-white/10 rounded w-48 animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="glass-morphism border border-glass-border rounded-2xl h-96 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{categoryName} News - NewsPortal</title>
                <meta name="description" content={`Browse ${categoryName} news articles on NewsPortal`} />
            </Helmet>
            <div className="p-8">
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-sm mb-3">
                        <Link to="/" className="text-secondary hover:text-white transition-colors">
                            Home
                        </Link>
                        <span className="text-secondary/40">/</span>
                        <span className="text-accent font-medium">{categoryName}</span>
                    </div>
                    <h1 className="font-serif text-3xl font-bold text-white">{categoryName}</h1>
                    <p className="text-secondary text-sm mt-1">
                        {articles.length > 0
                            ? `Showing ${articles.length} articles`
                            : 'No articles found'}
                    </p>
                </div>

                {articles.length === 0 ? (
                    <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">No Articles Yet</h2>
                        <p className="text-secondary text-sm">No articles have been categorized under {categoryName}.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {articles.map(article => (
                                <NewsCard
                                    key={article.id}
                                    title={article.title}
                                    summary={article.summary}
                                    categoryName={article.categoryName}
                                    sourceName={article.sourceName}
                                    publishedAt={article.publishedAt}
                                    thumbnailUrl={article.thumbnailUrl}
                                    slug={article.slug}
                                    articleId={article.id}
                                    showBookmark
                                />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-8">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="btn-secondary disabled:opacity-30"
                                >
                                    Previous
                                </button>
                                <span className="text-secondary text-sm px-4">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="btn-secondary disabled:opacity-30"
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

export default CategoryPage;
