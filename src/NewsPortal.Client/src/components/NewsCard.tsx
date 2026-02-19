import { Link } from 'react-router-dom';
import { useState, type FC } from 'react';

interface NewsCardProps {
    title: string;
    summary: string | null;
    categoryName?: string | null;
    sourceName: string;
    publishedAt: string;
    thumbnailUrl: string | null;
    slug: string;
}

const ImagePlaceholder: FC<{ category: string }> = ({ category }) => (
    <div className="w-full h-full bg-gradient-to-br from-accent/20 via-purple-500/10 to-background flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
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

const NewsCard: FC<NewsCardProps> = ({ title, summary, categoryName, sourceName, publishedAt, thumbnailUrl, slug }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const showImage = thumbnailUrl && !imgFailed;
    const category = categoryName || 'General';

    const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="group glass-morphism border border-glass-border rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300 flex flex-col h-full">
            <div className="relative h-48 overflow-hidden">
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
                <div className="absolute top-4 left-4 bg-accent/90 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded backdrop-blur-md">
                    {category}
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-[11px] text-secondary font-medium mb-3">
                    <span>{sourceName}</span>
                    <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                    <span>{formattedDate}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-accent transition-colors line-clamp-2">
                    {title}
                </h3>

                <p className="text-sm text-secondary line-clamp-3 mb-6">
                    {summary || 'No summary available'}
                </p>

                <Link
                    to={`/news/${slug}`}
                    className="mt-auto flex items-center gap-2 text-xs font-bold text-accent group-hover:gap-3 transition-all"
                >
                    READ MORE
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </Link>
            </div>
        </div>
    );
};

export default NewsCard;
