import { useNavigate } from 'react-router-dom';
import { Layers, Clock } from 'lucide-react';
import type { DailyHighlight } from '../services/api';

interface Props {
    highlights: DailyHighlight[];
    loading: boolean;
}

function formatDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    if (dd.getTime() === today.getTime()) return 'Today';
    if (dd.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
}

const DailyTimeline = ({ highlights, loading }: Props) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="space-y-8">
                {Array.from({ length: 2 }).map((_, i) => (
                    <section key={i}>
                        <div className="h-5 w-32 bg-white/10 rounded mb-4 animate-pulse" />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, j) => (
                                <div key={j} className="glass-morphism border border-glass-border rounded-xl p-3.5 animate-pulse">
                                    <div className="h-3 w-20 bg-white/10 rounded mb-3" />
                                    <div className="h-4 w-full bg-white/10 rounded mb-2" />
                                    <div className="h-3 w-2/3 bg-white/5 rounded" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        );
    }

    if (highlights.length === 0) return null;

    return (
        <div className="space-y-8 pb-8">
            {highlights.map((day) => (
                <section key={day.date}>
                    {/* Day header — sticky so the current day's label stays in view while scanning */}
                    <div className="sticky top-0 z-10 flex items-center gap-3 mb-4 py-2 bg-background/85 backdrop-blur-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
                        <h2 className="font-serif text-lg sm:text-xl font-bold text-white whitespace-nowrap">{formatDay(day.date)}</h2>
                        <span className="text-[11px] text-secondary whitespace-nowrap">
                            {day.highlights.length} {day.highlights.length === 1 ? 'story' : 'stories'}
                        </span>
                        <span className="flex-1 h-px bg-glass-border" />
                    </div>

                    {/* Story grid — ordered by importance (multi-source first) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {day.highlights.map((h) => {
                            const color = h.categoryColor || '#6c757d';
                            return (
                                <button
                                    key={`${h.categoryId}-${h.articleId}`}
                                    onClick={() => navigate(`/news/${h.slug}`)}
                                    className="text-left group glass-morphism border border-glass-border rounded-xl p-3.5 transition-all hover:bg-white/[0.04] hover:-translate-y-0.5"
                                    style={{ borderLeftWidth: '3px', borderLeftColor: color }}
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                        <span
                                            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                            style={{ color, backgroundColor: `${color}1f` }}
                                        >
                                            {h.categoryName}
                                        </span>
                                        {(h.sourceCount ?? 1) >= 2 && (
                                            <span
                                                className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25"
                                                title={`Covered by ${h.sourceCount} sources`}
                                            >
                                                <Layers className="w-2.5 h-2.5" strokeWidth={2} /> {h.sourceCount} sources
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-secondary/60 ml-auto whitespace-nowrap">
                                            <Clock className="w-3 h-3" strokeWidth={1.75} /> {formatTime(h.publishedAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-white/90 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                                        {h.title}
                                    </p>
                                    <p className="text-[11px] text-secondary/70 mt-1.5 truncate">{h.sourceName}</p>
                                </button>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default DailyTimeline;
