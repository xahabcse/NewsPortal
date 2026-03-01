import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { newsApi, type DailyHighlight } from '../services/api';

const DailyTimeline = () => {
    const navigate = useNavigate();
    const [highlights, setHighlights] = useState<DailyHighlight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHighlights = async () => {
            try {
                const data = await newsApi.getDailyHighlights(7);
                setHighlights(data);
            } catch (err) {
                console.error('Failed to fetch daily highlights:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHighlights();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const articleDate = new Date(date);
        articleDate.setHours(0, 0, 0, 0);

        if (articleDate.getTime() === today.getTime()) return 'Today';
        if (articleDate.getTime() === yesterday.getTime()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="h-5 w-40 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div className="relative">
                    <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-glass-border hidden md:block"></div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="relative flex items-center mb-8">
                            <div className={`w-full md:w-[calc(50%-2rem)] ${i % 2 === 0 ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'}`}>
                                <div className="glass-morphism border border-glass-border rounded-xl p-4 animate-pulse">
                                    <div className="h-3 bg-white/10 rounded w-20 mb-3"></div>
                                    <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                                    <div className="h-3 bg-white/5 rounded w-3/4"></div>
                                </div>
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white/10 rounded-full hidden md:block"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (highlights.length === 0) return null;

    // Flatten all highlights into timeline nodes for alternating layout
    const timelineNodes: { day: DailyHighlight; highlightIndex: number; globalIndex: number }[] = [];
    let globalIdx = 0;
    highlights.forEach((day) => {
        day.highlights.forEach((_, hIdx) => {
            timelineNodes.push({ day, highlightIndex: hIdx, globalIndex: globalIdx });
            globalIdx++;
        });
    });

    return (
        <div className="mb-8">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round" className="text-accent">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Daily News Timeline
                </h3>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Center vertical line - desktop only */}
                <div className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-accent/50 via-glass-border to-transparent h-full hidden md:block"></div>

                {/* Mobile vertical line - left aligned */}
                <div className="absolute left-4 w-0.5 bg-gradient-to-b from-accent/50 via-glass-border to-transparent h-full md:hidden"></div>

                {timelineNodes.map((node) => {
                    const h = node.day.highlights[node.highlightIndex];
                    const isLeft = node.globalIndex % 2 === 0;
                    const isFirstOfDay = node.highlightIndex === 0;

                    return (
                        <div key={`${node.day.date}-${h.categoryId}`} className="relative mb-6">
                            {/* Date label - shown on first highlight of each day */}
                            {isFirstOfDay && (
                                <div className="text-center mb-2">
                                    <span className="inline-block text-[10px] font-bold text-accent uppercase tracking-widest bg-[var(--color-bg)] px-3 relative z-10">
                                        {formatDate(node.day.date)}
                                    </span>
                                </div>
                            )}

                            {/* Desktop layout - alternating */}
                            <div className="hidden md:flex items-center">
                                {/* Left content */}
                                <div className={`w-[calc(50%-2rem)] ${isLeft ? '' : 'opacity-0 pointer-events-none'}`}>
                                    {isLeft && (
                                        <button
                                            onClick={() => navigate(`/news/${h.slug}`)}
                                            className="block w-full text-right group"
                                        >
                                            <div
                                                className="glass-morphism border rounded-xl p-4 transition-all hover:scale-[1.02] hover:border-opacity-60"
                                                style={{ borderColor: h.categoryColor || '#6c757d' }}
                                            >
                                                <div className="flex items-center justify-end gap-2 mb-2">
                                                    <span className="text-[10px] text-secondary/60">
                                                        {h.sourceName}
                                                    </span>
                                                    <span
                                                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                        style={{
                                                            color: h.categoryColor || '#9ca3af',
                                                            backgroundColor: `${h.categoryColor || '#6c757d'}20`
                                                        }}
                                                    >
                                                        {h.categoryName}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-secondary group-hover:text-white transition-colors line-clamp-2">
                                                    {h.title}
                                                </p>
                                                {h.summary && (
                                                    <p className="text-xs text-secondary/50 mt-1 line-clamp-1">
                                                        {h.summary}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </div>

                                {/* Center node */}
                                <div className="flex-shrink-0 w-16 flex items-center justify-center relative z-10">
                                    <div className="relative">
                                        <div
                                            className="w-4 h-4 rounded-full border-2 bg-[var(--color-bg)]"
                                            style={{ borderColor: h.categoryColor || '#6c757d' }}
                                        ></div>
                                        <div
                                            className="absolute inset-1 rounded-full"
                                            style={{ backgroundColor: h.categoryColor || '#6c757d' }}
                                        ></div>
                                    </div>
                                    {/* Connecting line to card */}
                                    <div
                                        className={`absolute top-1/2 -translate-y-1/2 h-px w-6 ${isLeft ? 'right-10' : 'left-10'}`}
                                        style={{ backgroundColor: h.categoryColor || '#6c757d', opacity: 0.4 }}
                                    ></div>
                                </div>

                                {/* Right content */}
                                <div className={`w-[calc(50%-2rem)] ${!isLeft ? '' : 'opacity-0 pointer-events-none'}`}>
                                    {!isLeft && (
                                        <button
                                            onClick={() => navigate(`/news/${h.slug}`)}
                                            className="block w-full text-left group"
                                        >
                                            <div
                                                className="glass-morphism border rounded-xl p-4 transition-all hover:scale-[1.02] hover:border-opacity-60"
                                                style={{ borderColor: h.categoryColor || '#6c757d' }}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span
                                                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                                        style={{
                                                            color: h.categoryColor || '#9ca3af',
                                                            backgroundColor: `${h.categoryColor || '#6c757d'}20`
                                                        }}
                                                    >
                                                        {h.categoryName}
                                                    </span>
                                                    <span className="text-[10px] text-secondary/60">
                                                        {h.sourceName}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-secondary group-hover:text-white transition-colors line-clamp-2">
                                                    {h.title}
                                                </p>
                                                {h.summary && (
                                                    <p className="text-xs text-secondary/50 mt-1 line-clamp-1">
                                                        {h.summary}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Mobile layout - single column */}
                            <div className="md:hidden flex items-start gap-4 pl-1">
                                {/* Node */}
                                <div className="flex-shrink-0 relative z-10 mt-4">
                                    <div className="relative">
                                        <div
                                            className="w-3.5 h-3.5 rounded-full border-2 bg-[var(--color-bg)]"
                                            style={{ borderColor: h.categoryColor || '#6c757d' }}
                                        ></div>
                                        <div
                                            className="absolute inset-1 rounded-full"
                                            style={{ backgroundColor: h.categoryColor || '#6c757d' }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Card */}
                                <button
                                    onClick={() => navigate(`/news/${h.slug}`)}
                                    className="flex-1 text-left group"
                                >
                                    <div
                                        className="glass-morphism border rounded-xl p-3 transition-all active:scale-[0.98]"
                                        style={{ borderColor: h.categoryColor || '#6c757d' }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                                className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    color: h.categoryColor || '#9ca3af',
                                                    backgroundColor: `${h.categoryColor || '#6c757d'}20`
                                                }}
                                            >
                                                {h.categoryName}
                                            </span>
                                            <span className="text-[9px] text-secondary/60">
                                                {h.sourceName}
                                            </span>
                                            <span className="text-[9px] text-secondary/40 ml-auto">
                                                {formatShortDate(node.day.date)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary group-hover:text-white transition-colors line-clamp-2">
                                            {h.title}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Bottom cap */}
                <div className="hidden md:flex justify-center pb-2">
                    <div className="w-2 h-2 rounded-full bg-glass-border"></div>
                </div>
            </div>
        </div>
    );
};

export default DailyTimeline;
