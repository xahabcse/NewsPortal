import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layers, Clock } from 'lucide-react';
import type { DailyHighlight, CategoryHighlight } from '../services/api';

interface Props {
    highlights: DailyHighlight[];
    loading: boolean;
}

function formatDay(dateStr: string, t: (key: string) => string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    if (dd.getTime() === today.getTime()) return t('timeline.today');
    if (dd.getTime() === yesterday.getTime()) return t('timeline.yesterday');
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
}

function publishMs(iso: string | null): number {
    if (!iso) return 0;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? 0 : t;
}

const DailyTimeline = ({ highlights, loading }: Props) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="space-y-10">
                {Array.from({ length: 2 }).map((_, i) => (
                    <section key={i}>
                        <div className="h-6 w-36 bg-white/10 rounded mb-6 animate-pulse" />
                        <div className="relative pl-[72px] md:pl-0 space-y-5">
                            {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j} className={`md:w-1/2 ${j % 2 ? 'md:ml-auto' : ''}`}>
                                    <div className="glass-morphism border border-glass-border rounded-xl p-3.5 animate-pulse">
                                        <div className="h-3 w-20 bg-white/10 rounded mb-3" />
                                        <div className="h-4 w-full bg-white/10 rounded mb-2" />
                                        <div className="h-3 w-2/3 bg-white/5 rounded" />
                                    </div>
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
        <div className="space-y-10 pb-10">
            {highlights.map((day) => {
                // Read each day as a publish-time stream: newest at the top, oldest at the bottom.
                const items = [...day.highlights].sort((a, b) => publishMs(b.publishedAt) - publishMs(a.publishedAt));

                return (
                    <section key={day.date}>
                        {/* Day header — section divider that sits above this day's spine */}
                        <div className="sticky top-0 z-30 flex items-center gap-3 mb-5 py-2 bg-background/85 backdrop-blur-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
                            <h2 className="font-serif text-xl font-bold text-white whitespace-nowrap">{formatDay(day.date, t)}</h2>
                            <span className="text-xs font-medium text-secondary whitespace-nowrap">
                                {items.length} {items.length === 1 ? t('timeline.story') : t('timeline.stories')}
                            </span>
                            <span className="flex-1 h-px bg-glass-border" />
                        </div>

                        {/* Timeline: central spine (desktop) / left rail (mobile) with time-chip nodes */}
                        <div className="relative">
                            {/* the spine */}
                            <div className="absolute top-2 bottom-2 w-px bg-accent/25 left-6 md:left-1/2 md:-translate-x-1/2" />

                            <div className="space-y-5">
                                {items.map((h, i) => (
                                    <TimelineEntry key={`${h.categoryId}-${h.articleId}`} h={h} onLeft={i % 2 === 0} onOpen={() => navigate(`/news/${h.slug}`)} />
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

interface EntryProps {
    h: CategoryHighlight;
    onLeft: boolean;
    onOpen: () => void;
}

const TimelineEntry = ({ h, onLeft, onOpen }: EntryProps) => {
    const { t } = useTranslation();
    const color = h.categoryColor || '#6c757d';
    const time = formatTime(h.publishedAt);
    const multi = (h.sourceCount ?? 1) >= 2;

    return (
        <div className="relative">
            {/* Time chip — the node on the spine (centred on desktop, on the left rail on mobile) */}
            <div className="absolute z-20 top-2 left-6 md:left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/12 text-accent border border-accent/30 ring-[3px] ring-background shadow-sm whitespace-nowrap">
                    <Clock className="w-3 h-3" strokeWidth={2.25} /> {time || '·'}
                </span>
            </div>

            {/* Desktop-only connector from the spine to the card */}
            <span
                className={`hidden md:block absolute top-[15px] h-px w-10 bg-accent/25 z-0 ${onLeft ? 'right-1/2' : 'left-1/2'}`}
            />

            {/* Card — left/right on desktop, single column (right of the rail) on mobile */}
            <div className={`pl-[72px] md:pl-0 md:w-1/2 ${onLeft ? 'md:pr-10' : 'md:pl-10 md:ml-auto'}`}>
                <button
                    onClick={onOpen}
                    className="block w-full text-left group glass-morphism border border-glass-border rounded-xl p-3.5 transition-all hover:border-accent/40 hover:-translate-y-0.5"
                >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            {h.categoryName}
                        </span>
                        {multi && (
                            <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/12 text-accent border border-accent/25"
                                title={t('timeline.coveredBy', { count: h.sourceCount })}
                            >
                                <Layers className="w-2.5 h-2.5" strokeWidth={2} /> {t('timeline.sourcesCount', { count: h.sourceCount })}
                            </span>
                        )}
                    </div>
                    <p className="font-serif text-[15px] font-bold text-white leading-snug line-clamp-3 group-hover:text-accent transition-colors">
                        {h.title}
                    </p>
                    <p className="text-xs font-medium text-secondary mt-2 truncate">{h.sourceName}</p>
                </button>
            </div>
        </div>
    );
};

export default DailyTimeline;
