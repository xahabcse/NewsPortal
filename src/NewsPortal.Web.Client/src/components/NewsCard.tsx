import type { FC } from 'react';

interface NewsCardProps {
    title: string;
    summary: string;
    category: string;
    author: string;
    date: string;
    image: string;
}

const NewsCard: FC<NewsCardProps> = ({ title, summary, category, author, date, image }) => {
    return (
        <div className="group glass-morphism border border-glass-border rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300 flex flex-col h-full">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4 bg-accent/90 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded backdrop-blur-md">
                    {category}
                </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-[11px] text-secondary font-medium mb-3">
                    <span>{author}</span>
                    <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                    <span>{date}</span>
                </div>

                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-accent transition-colors line-clamp-2">
                    {title}
                </h3>

                <p className="text-sm text-secondary line-clamp-3 mb-6">
                    {summary}
                </p>

                <button className="mt-auto flex items-center gap-2 text-xs font-bold text-accent group-hover:gap-3 transition-all">
                    READ MORE
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
            </div>
        </div>
    );
};

export default NewsCard;
