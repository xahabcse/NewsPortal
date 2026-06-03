import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { Category, NewsFilterParams } from '../services/api';
import type { NewsSource } from '../types/NewsSource';

export interface ActiveFilters {
    sourceIds: number[];
    categoryIds: number[];
    dateFrom: string;
    dateTo: string;
    sortBy: 'newest' | 'oldest' | 'mostviewed';
    hasThumbnail: boolean;
}

export const defaultFilters = (): ActiveFilters => ({
    sourceIds: [],
    categoryIds: [],
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest',
    hasThumbnail: false,
});

export function filtersToParams(f: ActiveFilters, page: number, pageSize: number): NewsFilterParams {
    return {
        sourceIds: f.sourceIds.length ? f.sourceIds : undefined,
        categoryIds: f.categoryIds.length ? f.categoryIds : undefined,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        sortBy: f.sortBy,
        hasThumbnail: f.hasThumbnail || undefined,
        page,
        pageSize,
    };
}

export function hasActiveFilters(f: ActiveFilters): boolean {
    return (
        f.sourceIds.length > 0 ||
        f.categoryIds.length > 0 ||
        !!f.dateFrom ||
        !!f.dateTo ||
        f.sortBy !== 'newest' ||
        f.hasThumbnail
    );
}

interface Props {
    sources: NewsSource[];
    categories: Category[];
    filters: ActiveFilters;
    onChange: (filters: ActiveFilters) => void;
    /** Hide the Sort control (e.g. on the day-grouped Timeline where it doesn't apply). */
    showSort?: boolean;
    /** Hide the "Has image" toggle (e.g. on Timeline where highlights carry no thumbnail). */
    showThumbnail?: boolean;
    /** Optional controls rendered as the first items of the filter row (e.g. feed-mode tabs),
        so they share the same wrapping line as the filters instead of sitting on a row above. */
    leading?: ReactNode;
}

type OpenPanel = 'sources' | 'categories' | 'date' | 'sort' | null;

const SORT_LABELS: Record<ActiveFilters['sortBy'], string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    mostviewed: 'Most viewed',
};

const DATE_PRESETS = [
    { label: 'Today',      days: 0 },
    { label: 'Yesterday',  days: 1 },
    { label: 'Last 7 days', days: 6 },
    { label: 'Last 30 days', days: 29 },
];

function toLocalDateStr(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function applyPreset(days: number): { dateFrom: string; dateTo: string } {
    const today = new Date();
    if (days === 0) {
        const d = toLocalDateStr(today);
        return { dateFrom: d, dateTo: d };
    }
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    return { dateFrom: toLocalDateStr(from), dateTo: toLocalDateStr(today) };
}

function formatDateRange(from: string, to: string): string {
    const fmt = (s: string) => {
        const d = new Date(s + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    if (from && to && from === to) return fmt(from);
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `From ${fmt(from)}`;
    if (to) return `Until ${fmt(to)}`;
    return '';
}

// Searchable multi-select dropdown
function MultiSelectDropdown({
    items,
    selectedIds,
    onToggle,
    getLabel,
    getColor,
    placeholder,
}: {
    items: { id: number; label: string; color?: string }[];
    selectedIds: number[];
    onToggle: (id: number) => void;
    getLabel: (item: { label: string }) => string;
    getColor?: (item: { color?: string }) => string | undefined;
    placeholder: string;
}) {
    const [search, setSearch] = useState('');
    const filtered = items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));

    const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.includes(i.id));

    const toggleAll = () => {
        if (allSelected) {
            filtered.forEach(i => { if (selectedIds.includes(i.id)) onToggle(i.id); });
        } else {
            filtered.forEach(i => { if (!selectedIds.includes(i.id)) onToggle(i.id); });
        }
    };

    return (
        <div className="p-2">
            {/* Search */}
            <div className="relative mb-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-glass-border rounded-lg py-1.5 pl-7 pr-3 text-xs text-white placeholder-secondary/50 focus:outline-none focus:border-accent/50"
                />
                <svg className="absolute left-2 top-2 text-secondary/50" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>

            {/* Select all row */}
            {filtered.length > 1 && (
                <button
                    onClick={toggleAll}
                    className="w-full text-left px-2 py-1 text-[11px] text-secondary/70 hover:text-white transition-colors mb-1"
                >
                    {allSelected ? 'Deselect all' : 'Select all'}
                </button>
            )}

            {/* Items */}
            <div className="max-h-52 overflow-y-auto space-y-0.5">
                {filtered.length === 0 && (
                    <p className="text-center text-xs text-secondary/50 py-3">No results</p>
                )}
                {filtered.map(item => {
                    const checked = selectedIds.includes(item.id);
                    const color = getColor?.(item);
                    return (
                        <button
                            key={item.id}
                            onClick={() => onToggle(item.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${checked ? 'bg-white/10 text-white' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-accent border-accent' : 'border-glass-border'}`}>
                                {checked && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                            </span>
                            {color && (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            )}
                            <span className="truncate">{getLabel(item)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function NewsFilterBar({ sources, categories, filters, onChange, showSort = true, showThumbnail = true, leading }: Props) {
    const [open, setOpen] = useState<OpenPanel>(null);
    const barRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                setOpen(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (panel: OpenPanel) => setOpen(prev => prev === panel ? null : panel);

    const set = (patch: Partial<ActiveFilters>) => onChange({ ...filters, ...patch });

    const toggleId = (key: 'sourceIds' | 'categoryIds', id: number) => {
        const cur = filters[key];
        set({ [key]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
    };

    const clearAll = () => onChange(defaultFilters());

    const activeCount = [
        filters.sourceIds.length,
        filters.categoryIds.length,
        (filters.dateFrom || filters.dateTo) ? 1 : 0,
        showSort && filters.sortBy !== 'newest' ? 1 : 0,
        showThumbnail && filters.hasThumbnail ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const sourcesMap = Object.fromEntries(sources.map(s => [s.id, s.name]));
    const categoriesMap = Object.fromEntries(categories.map(c => [c.id, { name: c.name, color: c.color }]));

    const dateLabel = (filters.dateFrom || filters.dateTo)
        ? formatDateRange(filters.dateFrom, filters.dateTo)
        : null;

    return (
        <div ref={barRef} className="relative">
            {/* Filter buttons row — wrap on all sizes. (Must NOT use overflow-x-auto: an
                overflow container clips the absolute dropdown panels, which made the
                filters unusable on mobile.) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">

                {/* Leading controls (e.g. feed-mode tabs) share this same wrapping row */}
                {leading}
                {leading && (
                    <span className="hidden sm:block self-center w-px h-5 bg-glass-border mx-0.5" aria-hidden="true" />
                )}

                {/* Sources button */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => toggle('sources')}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${open === 'sources' || filters.sourceIds.length > 0
                            ? 'bg-accent/20 text-accent border-accent/40'
                            : 'bg-white/5 text-secondary hover:text-white border-glass-border hover:border-white/20'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                        Sources
                        {filters.sourceIds.length > 0 && (
                            <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {filters.sourceIds.length}
                            </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open === 'sources' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>

                    {open === 'sources' && (
                        <div className="absolute top-full left-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-[#1a1a2e] border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="px-3 pt-2 pb-1 border-b border-glass-border flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-white uppercase tracking-wider">News Sources</span>
                                {filters.sourceIds.length > 0 && (
                                    <button onClick={() => set({ sourceIds: [] })} className="text-[10px] text-secondary/60 hover:text-red-400 transition-colors">Clear</button>
                                )}
                            </div>
                            <MultiSelectDropdown
                                items={sources.map(s => ({ id: s.id, label: s.name }))}
                                selectedIds={filters.sourceIds}
                                onToggle={id => toggleId('sourceIds', id)}
                                getLabel={i => i.label}
                                placeholder="Search sources…"
                            />
                        </div>
                    )}
                </div>

                {/* Categories button */}
                <div className="relative">
                    <button
                        onClick={() => toggle('categories')}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${open === 'categories' || filters.categoryIds.length > 0
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                            : 'bg-white/5 text-secondary hover:text-white border-glass-border hover:border-white/20'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        Categories
                        {filters.categoryIds.length > 0 && (
                            <span className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {filters.categoryIds.length}
                            </span>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open === 'categories' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>

                    {open === 'categories' && (
                        <div className="absolute top-full left-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-[#1a1a2e] border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="px-3 pt-2 pb-1 border-b border-glass-border flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Categories</span>
                                {filters.categoryIds.length > 0 && (
                                    <button onClick={() => set({ categoryIds: [] })} className="text-[10px] text-secondary/60 hover:text-red-400 transition-colors">Clear</button>
                                )}
                            </div>
                            <MultiSelectDropdown
                                items={categories.map(c => ({ id: c.id, label: c.name, color: c.color }))}
                                selectedIds={filters.categoryIds}
                                onToggle={id => toggleId('categoryIds', id)}
                                getLabel={i => i.label}
                                getColor={i => i.color}
                                placeholder="Search categories…"
                            />
                        </div>
                    )}
                </div>

                {/* Date range button */}
                <div className="relative">
                    <button
                        onClick={() => toggle('date')}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${open === 'date' || (filters.dateFrom || filters.dateTo)
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            : 'bg-white/5 text-secondary hover:text-white border-glass-border hover:border-white/20'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {dateLabel ?? 'Date range'}
                        {(filters.dateFrom || filters.dateTo) && (
                            <button
                                onClick={e => { e.stopPropagation(); set({ dateFrom: '', dateTo: '' }); }}
                                className="ml-0.5 text-secondary/60 hover:text-red-400 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        )}
                        {!(filters.dateFrom || filters.dateTo) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open === 'date' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                        )}
                    </button>

                    {open === 'date' && (
                        <div className="absolute top-full left-0 mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-[#1a1a2e] border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="px-3 pt-2 pb-1 border-b border-glass-border">
                                <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Date Range</span>
                            </div>
                            <div className="p-3 space-y-3">
                                {/* Quick presets */}
                                <div className="flex flex-wrap gap-1.5">
                                    {DATE_PRESETS.map(p => {
                                        const { dateFrom, dateTo } = applyPreset(p.days);
                                        const active = filters.dateFrom === dateFrom && filters.dateTo === dateTo;
                                        return (
                                            <button
                                                key={p.label}
                                                onClick={() => set({ dateFrom, dateTo })}
                                                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${active ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-white/5 text-secondary border-glass-border hover:text-white hover:border-white/20'}`}
                                            >
                                                {p.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom range */}
                                <div className="space-y-2">
                                    <label className="block text-[11px] text-secondary/70 font-medium">Custom range</label>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-secondary/50 mb-0.5 block">From</label>
                                            <input
                                                type="date"
                                                value={filters.dateFrom}
                                                max={filters.dateTo || toLocalDateStr(new Date())}
                                                onChange={e => set({ dateFrom: e.target.value })}
                                                className="w-full bg-white/5 border border-glass-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50 [color-scheme:dark]"
                                            />
                                        </div>
                                        <svg className="text-secondary/40 flex-shrink-0 hidden sm:block mt-4" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-secondary/50 mb-0.5 block">To</label>
                                            <input
                                                type="date"
                                                value={filters.dateTo}
                                                min={filters.dateFrom}
                                                max={toLocalDateStr(new Date())}
                                                onChange={e => set({ dateTo: e.target.value })}
                                                className="w-full bg-white/5 border border-glass-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50 [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {(filters.dateFrom || filters.dateTo) && (
                                    <button
                                        onClick={() => set({ dateFrom: '', dateTo: '' })}
                                        className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                                    >
                                        Clear date filter
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sort button */}
                {showSort && (
                <div className="relative">
                    <button
                        onClick={() => toggle('sort')}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${open === 'sort' || filters.sortBy !== 'newest'
                            ? 'bg-green-500/20 text-green-400 border-green-500/40'
                            : 'bg-white/5 text-secondary hover:text-white border-glass-border hover:border-white/20'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></svg>
                        {SORT_LABELS[filters.sortBy]}
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open === 'sort' ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>

                    {open === 'sort' && (
                        <div className="absolute top-full left-0 mt-1.5 w-44 max-w-[calc(100vw-2rem)] bg-[#1a1a2e] border border-glass-border rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="px-3 pt-2 pb-1 border-b border-glass-border">
                                <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Sort by</span>
                            </div>
                            <div className="p-1.5 space-y-0.5">
                                {(Object.entries(SORT_LABELS) as [ActiveFilters['sortBy'], string][]).map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => { set({ sortBy: val }); setOpen(null); }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${filters.sortBy === val ? 'bg-green-500/15 text-green-400' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <span className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center ${filters.sortBy === val ? 'border-green-400 bg-green-400' : 'border-glass-border'}`}>
                                            {filters.sortBy === val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </span>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Has thumbnail toggle */}
                {showThumbnail && (
                <button
                    onClick={() => set({ hasThumbnail: !filters.hasThumbnail })}
                    className={`shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border transition-colors ${filters.hasThumbnail
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                        : 'bg-white/5 text-secondary hover:text-white border-glass-border hover:border-white/20'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Has image
                </button>
                )}

                {/* Clear all */}
                {activeCount > 0 && (
                    <button
                        onClick={clearAll}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-red-400/80 hover:text-red-400 bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Clear all ({activeCount})
                    </button>
                )}
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {filters.sourceIds.map(id => (
                        <span key={`s-${id}`} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-accent/15 border border-accent/30 text-accent text-[11px] rounded-full">
                            {sourcesMap[id] ?? `Source ${id}`}
                            <button onClick={() => toggleId('sourceIds', id)} className="ml-0.5 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </span>
                    ))}
                    {filters.categoryIds.map(id => {
                        const cat = categoriesMap[id];
                        return (
                            <span key={`c-${id}`} className="flex items-center gap-1 pl-2 pr-1 py-0.5 border text-[11px] rounded-full"
                                style={{ backgroundColor: `${cat?.color ?? '#6c757d'}18`, borderColor: `${cat?.color ?? '#6c757d'}50`, color: cat?.color ?? '#9ca3af' }}>
                                {cat?.name ?? `Category ${id}`}
                                <button onClick={() => toggleId('categoryIds', id)} className="ml-0.5 hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </span>
                        );
                    })}
                    {(filters.dateFrom || filters.dateTo) && (
                        <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {formatDateRange(filters.dateFrom, filters.dateTo)}
                            <button onClick={() => set({ dateFrom: '', dateTo: '' })} className="ml-0.5 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </span>
                    )}
                    {showSort && filters.sortBy !== 'newest' && (
                        <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-green-500/15 border border-green-500/30 text-green-400 text-[11px] rounded-full">
                            {SORT_LABELS[filters.sortBy]}
                            <button onClick={() => set({ sortBy: 'newest' })} className="ml-0.5 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </span>
                    )}
                    {showThumbnail && filters.hasThumbnail && (
                        <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] rounded-full">
                            Has image
                            <button onClick={() => set({ hasThumbnail: false })} className="ml-0.5 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
