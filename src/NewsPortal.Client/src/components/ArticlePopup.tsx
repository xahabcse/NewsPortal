import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ArticlePopupProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    summary: string | null;
    categoryName: string | null;
    sourceName: string;
    publishedAt: string;
    thumbnailUrl: string | null;
    sourceUrl: string | null;
    slug: string;
    articleId?: number;
}

const ArticlePopup: FC<ArticlePopupProps> = ({
    isOpen,
    onClose,
    title,
    summary,
    categoryName,
    sourceName,
    publishedAt,
    thumbnailUrl,
    sourceUrl,
    slug,
}) => {
    const { t } = useTranslation();
    const [imgFailed, setImgFailed] = useState(false);
    const category = categoryName || t('article.generalCategory');

    // Reset image state when article changes
    useEffect(() => {
        setImgFailed(false);
    }, [slug]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const showImage = thumbnailUrl && !imgFailed;

    const readingTime = summary ? Math.ceil(summary.split(/\s+/).length / 200) : 1;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Popup Card */}
            <div
                className="relative w-full max-w-2xl max-h-[90vh] bg-[#1a1b1e] border border-glass-border rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-colors text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Image */}
                {showImage ? (
                    <div className="w-full h-56 overflow-hidden flex-shrink-0">
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={() => setImgFailed(true)}
                        />
                    </div>
                ) : (
                    <div className="w-full h-32 bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v14a2 2 0 0 0 2 2z" />
                                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                <line x1="10" y1="12" x2="10" y2="18" />
                                <line x1="14" y1="12" x2="14" y2="18" />
                                <line x1="10" y1="15" x2="14" y2="15" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {/* Category Badge */}
                    <span className="inline-block bg-accent/90 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded mb-4">
                        {category}
                    </span>

                    {/* Title */}
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">
                        {title}
                    </h2>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-secondary mb-5">
                        <span className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            {sourceName}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                        <span>{formattedDate}</span>
                        <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                        <span>{t('article.readingTime', { minutes: readingTime })}</span>
                    </div>

                    {/* Summary / Content */}
                    <div className="text-sm text-white/85 leading-relaxed space-y-3">
                        {summary ? (
                            summary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                                <p key={i}>{paragraph}</p>
                            ))
                        ) : (
                            <p className="text-secondary italic">{t('article.noSummaryFull')}</p>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 sm:p-4 border-t border-glass-border flex items-center gap-2 sm:gap-3 flex-shrink-0 bg-[#1a1b1e]">
                    {sourceUrl && (
                        <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors"
                        >
                            {t('article.readFullArticle')}
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    )}
                    <Link
                        to={`/news/${slug}`}
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors"
                    >
                        {t('article.details')}
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ArticlePopup;
