import { useNavigate } from 'react-router-dom';
import { useState, type FC } from 'react';
import toast from 'react-hot-toast';
import BookmarkButton from './BookmarkButton';

interface NewsCardProps {
    title: string;
    summary: string | null;
    categoryName?: string | null;
    sourceName: string;
    publishedAt: string;
    thumbnailUrl: string | null;
    slug: string;
    sourceUrl?: string | null;
    articleId?: number;
    isBookmarked?: boolean;
    onBookmarkToggle?: (articleId: number, isBookmarked: boolean) => void;
    showBookmark?: boolean;
    onCardClick?: () => void;
}

const ImagePlaceholder: FC<{ category: string }> = ({ category }) => (
    <div className="w-full h-full bg-gradient-to-br from-accent/20 via-purple-500/10 to-background flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v14a2 2 0 0 0 2 2z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <line x1="10" y1="12" x2="10" y2="18" />
                <line x1="14" y1="12" x2="14" y2="18" />
                <line x1="10" y1="15" x2="14" y2="15" />
            </svg>
        </div>
        <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest text-secondary/50">{category}</span>
    </div>
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NewsCard: FC<NewsCardProps> = ({
    title,
    summary,
    categoryName,
    sourceName,
    publishedAt,
    thumbnailUrl,
    slug,
    articleId,
    isBookmarked = false,
    onBookmarkToggle,
    showBookmark = false,
    onCardClick
}) => {
    const navigate = useNavigate();
    const [imgFailed, setImgFailed] = useState(false);
    const [bookmarked, setBookmarked] = useState(isBookmarked);
    const showImage = thumbnailUrl && !imgFailed;
    const category = categoryName || 'General';

    const handleBookmarkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (articleId && onBookmarkToggle) {
            onBookmarkToggle(articleId, !bookmarked);
            setBookmarked(!bookmarked);
            toast.success(bookmarked ? 'Bookmark removed' : 'Article saved to bookmarks');
        }
    };

    const handleCardClick = () => {
        if (onCardClick) {
            onCardClick();
        } else {
            navigate(`/news/${slug}`);
        }
    };

    const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const readingTime = summary ? Math.max(1, Math.ceil(summary.split(/\s+/).length / 200)) : 1;

    return (
        <div
            onClick={handleCardClick}
            className="group glass-morphism border border-glass-border rounded-xl md:rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300 flex flex-row md:flex-col md:h-full cursor-pointer"
        >
            {/* Image — square on mobile, full-width banner on desktop */}
            <div className="relative w-28 h-28 shrink-0 md:w-full md:h-48 overflow-hidden">
                {showImage ? (
                    <img
                        src={thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <ImagePlaceholder category={category} />
                )}

                {/* Category badge — desktop only (overlaid on image) */}
                <div className="hidden md:block absolute top-4 left-4 bg-accent/90 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded backdrop-blur-md">
                    {category}
                </div>

                {showBookmark && articleId && (
                    onBookmarkToggle ? (
                        // Controlled mode (e.g. Bookmarks page handles removal itself).
                        <button
                            onClick={handleBookmarkClick}
                            className="absolute top-2 right-2 md:top-4 md:right-4 w-7 h-7 md:w-8 md:h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                            title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill={bookmarked ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={bookmarked ? 'text-accent' : 'text-white'}
                            >
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    ) : (
                        // Self-managed mode (card grids): add/remove via BookmarkService.
                        // checkOnMount is off so a grid of N cards doesn't fire N requests.
                        <BookmarkButton
                            articleId={articleId}
                            variant="icon"
                            checkOnMount={false}
                            className="absolute top-2 right-2 md:top-4 md:right-4"
                        />
                    )
                )}
            </div>

            {/* Content */}
            <div className="p-3 md:p-6 flex flex-col flex-1 min-w-0">
                {/* Category badge — mobile only (inline text) */}
                <span className="md:hidden inline-block bg-accent/20 text-accent text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1.5 w-fit">
                    {category}
                </span>

                {/* Title */}
                <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-3 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {title}
                </h3>

                {/* Meta info */}
                <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-secondary font-medium flex-wrap">
                    <span className="truncate max-w-[90px] md:max-w-none">{sourceName}</span>
                    <span className="w-1 h-1 rounded-full bg-secondary/30 shrink-0"></span>
                    <span className="shrink-0">{formattedDate}</span>
                    <span className="hidden md:inline w-1 h-1 rounded-full bg-secondary/30"></span>
                    <span className="hidden md:inline">{readingTime} min read</span>
                </div>

                {/* Summary — desktop only */}
                <p className="hidden md:block text-sm text-secondary line-clamp-3 mt-3 mb-6">
                    {summary || 'No summary available'}
                </p>

                {/* Read more — desktop only */}
                <span className="hidden md:flex mt-auto items-center gap-2 text-xs font-bold text-accent group-hover:gap-3 transition-all">
                    READ MORE
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </span>
            </div>
        </div>
    );
};

export default NewsCard;
