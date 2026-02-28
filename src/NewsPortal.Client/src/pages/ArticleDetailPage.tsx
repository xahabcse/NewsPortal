import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { axiosInstance } from '../services/axiosInstance';
import { ReadHistoryService } from '../services/ReadHistoryService';
import { useAuth } from '../context/AuthContext';
import NewsCard from '../components/NewsCard';
import ShareButton from '../components/ShareButton';
import TextToSpeech from '../components/TextToSpeech';
import CommentsSection from '../components/CommentsSection';

interface NewsArticleDetail {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    sourceUrl: string;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    author: string | null;
    publishedAt: string;
    viewCount: number;
    isFeatured: boolean;
    sourceName: string;
    categoryName: string | null;
    categorySlug: string | null;
}

interface RelatedArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
    publishedAt: string;
    sourceName: string;
    categoryName: string | null;
}

const calculateReadingTime = (content: string | null): number => {
    if (!content) return 1;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200);
};

const ImagePlaceholder: React.FC<{ category: string }> = ({ category }) => (
    <div className="w-full h-full bg-gradient-to-br from-accent/20 via-purple-500/10 to-background flex flex-col items-center justify-center gap-3">
        <div className="w-20 h-20 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v14a2 2 0 0 0 2 2z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <line x1="10" y1="12" x2="10" y2="18" />
                <line x1="14" y1="12" x2="14" y2="18" />
                <line x1="10" y1="15" x2="14" y2="15" />
            </svg>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary/50">{category}</span>
    </div>
);

const ArticleDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [article, setArticle] = useState<NewsArticleDetail | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => {
        const fetchArticle = async () => {
            if (!slug) {
                setError('Article not found');
                setLoading(false);
                return;
            }

            try {
                const response = await axiosInstance.get<NewsArticleDetail>(`/news/${slug}`);
                setArticle(response.data);

                // Fetch related articles
                const relatedResponse = await axiosInstance.get<RelatedArticle[]>(`/news/${slug}/related?count=4`);
                setRelatedArticles(relatedResponse.data);

                // Record reading history if user is authenticated
                if (isAuthenticated && response.data?.id) {
                    // Debounce: wait 5 seconds before recording (user actually reading)
                    const timer = setTimeout(() => {
                        ReadHistoryService.recordRead(response.data.id).catch(console.error);
                    }, 5000);
                    return () => clearTimeout(timer);
                }
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'response' in err) {
                    const axiosError = err as { response?: { status?: number } };
                    if (axiosError.response?.status === 404) {
                        setError('Article not found');
                    } else {
                        setError('Failed to load article');
                    }
                } else {
                    setError('Failed to load article');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [slug, isAuthenticated]);

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                    <div className="h-10 bg-white/10 rounded w-3/4"></div>
                    <div className="h-6 bg-white/10 rounded w-1/2"></div>
                    <div className="h-64 bg-white/10 rounded-2xl"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-white/10 rounded"></div>
                        <div className="h-4 bg-white/10 rounded"></div>
                        <div className="h-4 bg-white/10 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                    <h2 className="text-2xl font-bold text-white mb-2">Article Not Found</h2>
                    <p className="text-secondary text-sm mb-6">{error || 'The article you\'re looking for doesn\'t exist or has been removed.'}</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const showImage = article.imageUrl && !imgFailed;
    const category = article.categoryName || 'General';
    const readingTime = calculateReadingTime(article.content);
    const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <>
            {/* Dynamic Meta Tags for Article */}
            <Helmet>
                <title>{article.title} - {article.sourceName}</title>
                <meta name="description" content={article.summary || `Read ${article.title} from ${article.sourceName}`} />
                <meta name="author" content={article.author || article.sourceName} />
                <meta name="publish_date" content={article.publishedAt} />

                {/* Open Graph */}
                <meta property="og:title" content={article.title} />
                <meta property="og:description" content={article.summary || ''} />
                <meta property="og:image" content={article.imageUrl || article.thumbnailUrl || ''} />
                <meta property="og:type" content="article" />
                <meta property="article:published_time" content={article.publishedAt} />
                <meta property="article:author" content={article.author || ''} />
                <meta property="article:section" content={article.categoryName || ''} />
                <meta property="og:site_name" content={article.sourceName} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={article.title} />
                <meta name="twitter:description" content={article.summary || ''} />
                <meta name="twitter:image" content={article.imageUrl || article.thumbnailUrl || ''} />

                {/* Schema.org JSON-LD for NewsArticle */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "NewsArticle",
                        "headline": article.title,
                        "description": article.summary || '',
                        "image": article.imageUrl || article.thumbnailUrl || '',
                        "datePublished": article.publishedAt,
                        "dateModified": article.publishedAt,
                        "author": article.author ? {
                            "@type": "Person",
                            "name": article.author
                        } : {
                            "@type": "Organization",
                            "name": article.sourceName
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": article.sourceName,
                            "logo": {
                                "@type": "ImageObject",
                                "url": `${window.location.origin}/logo.png`
                            }
                        },
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": `${window.location.origin}/news/${article.slug}`
                        },
                        "articleSection": article.categoryName || 'News',
                        "wordCount": article.content ? article.content.split(/\s+/).length : 0
                    })}
                </script>
            </Helmet>

            <div className="p-8 max-w-4xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 text-secondary hover:text-white transition-colors text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back
            </button>

            {/* Article Header */}
            <div className="mb-8">
                {/* Category Badge */}
                <div className="inline-block mb-4">
                    <span className="bg-accent/90 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded backdrop-blur-md">
                        {category}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                    {article.title}
                </h1>

                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                    {article.sourceName && (
                        <span className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            {article.sourceName}
                        </span>
                    )}
                    {article.author && (
                        <span className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            {article.author}
                        </span>
                    )}
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {formattedDate}
                    </span>
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        {article.viewCount.toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {readingTime} min read
                    </span>
                </div>

                {/* Action Buttons: Share + Listen */}
                <div className="flex items-center gap-3 mt-4">
                    <ShareButton
                        title={article.title}
                        url={`${window.location.origin}/news/${article.slug}`}
                        summary={article.summary || undefined}
                    />
                    <TextToSpeech
                        text={article.content || article.summary || article.title}
                        title={article.title}
                    />
                </div>
            </div>

            {/* Featured Image */}
            {showImage && article.imageUrl ? (
                <div className="mb-8 rounded-2xl overflow-hidden border border-glass-border">
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-auto max-h-[500px] object-cover"
                        onError={() => setImgFailed(true)}
                    />
                </div>
            ) : (
                <div className="mb-8 h-64 rounded-2xl border border-glass-border overflow-hidden">
                    <ImagePlaceholder category={category} />
                </div>
            )}

            {/* Summary */}
            {article.summary && (
                <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-glass-border">
                    <p className="text-lg text-white/90 leading-relaxed">
                        {article.summary}
                    </p>
                </div>
            )}

            {/* Article Content */}
            {article.content ? (
                <article className="prose prose-invert prose-lg max-w-none">
                    <div 
                        className="text-white/90 leading-relaxed space-y-4"
                        dangerouslySetInnerHTML={{ __html: article.content.replace(/\n\n/g, '</p><p class="mb-4">').replace(/\n/g, '<br />') }}
                    />
                </article>
            ) : (
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-glass-border">
                    <p className="text-secondary">Full content not available. Read the original article at the source.</p>
                </div>
            )}

            {/* Source Link */}
            {article.sourceUrl && (
                <div className="mt-8 pt-8 border-t border-glass-border">
                    <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-medium"
                    >
                        Read Original Article
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            )}

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
                <div className="mt-12 pt-8 border-t border-glass-border">
                    <h2 className="text-2xl font-bold text-white mb-6">Related Articles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relatedArticles.map((related) => (
                            <NewsCard
                                key={related.id}
                                title={related.title}
                                summary={related.summary}
                                categoryName={related.categoryName}
                                sourceName={related.sourceName}
                                publishedAt={related.publishedAt}
                                thumbnailUrl={related.thumbnailUrl}
                                slug={related.slug}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Comments Section */}
            <CommentsSection />
        </div>
        </>
    );
};

export default ArticleDetailPage;
