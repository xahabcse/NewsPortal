import { useState, useEffect, useMemo } from 'react'
import SEO from '../components/SEO'
import DailyTimeline from '../components/DailyTimeline'
import NewsFilterBar, { defaultFilters, hasActiveFilters } from '../components/NewsFilterBar'
import type { ActiveFilters } from '../components/NewsFilterBar'
import { newsApi, type DailyHighlight, type Category } from '../services/api'
import { NewsSourceService } from '../services/NewsSourceService'
import type { NewsSource } from '../types/NewsSource'

const FETCH_DAYS = 14

const TimelinePage = () => {
    const [allHighlights, setAllHighlights] = useState<DailyHighlight[]>([])
    const [sources, setSources] = useState<NewsSource[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [filters, setFilters] = useState<ActiveFilters>(defaultFilters())
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [srcs, cats, highlights] = await Promise.all([
                    NewsSourceService.getActive(),
                    newsApi.getCategories(),
                    newsApi.getDailyHighlights(FETCH_DAYS),
                ])
                setSources(srcs.filter(s => s.isActive))
                setCategories(cats)
                setAllHighlights(highlights)
            } catch (err) {
                console.error('Failed to fetch timeline data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const filteredHighlights = useMemo(() => {
        return allHighlights.map(day => {
            const dayDate = day.date.slice(0, 10)
            if (filters.dateFrom && dayDate < filters.dateFrom) return null
            if (filters.dateTo && dayDate > filters.dateTo) return null

            let dayHighlights = day.highlights
            if (filters.categoryIds.length > 0) {
                dayHighlights = dayHighlights.filter(h => filters.categoryIds.includes(h.categoryId))
            }
            if (filters.sourceIds.length > 0) {
                dayHighlights = dayHighlights.filter(h => filters.sourceIds.includes(h.sourceId))
            }

            if (dayHighlights.length === 0) return null
            return { ...day, highlights: dayHighlights }
        }).filter((d): d is DailyHighlight => d !== null)
    }, [allHighlights, filters])

    const totalShown = filteredHighlights.reduce((sum, d) => sum + d.highlights.length, 0)
    const filtersActive = hasActiveFilters(filters)

    return (
        <>
            <SEO
                title="Daily News Timeline"
                description="Day-wise national and international news highlights"
            />
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="font-serif text-3xl font-bold text-white mb-1">Daily Timeline</h1>
                                <p className="text-secondary text-sm">
                                    {loading ? 'Loading timeline…' : (
                                        <>
                                            Everything that happened, day by day — biggest stories first.{' '}
                                            <span className="text-accent font-semibold">{totalShown}</span>
                                            {' '}stories across{' '}
                                            <span className="text-accent font-semibold">{filteredHighlights.length}</span>
                                            {' '}days.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <NewsFilterBar
                            sources={sources}
                            categories={categories}
                            filters={filters}
                            onChange={setFilters}
                            showSort={false}
                            showThumbnail={false}
                        />
                    </div>

                    {/* No results when filters active */}
                    {!loading && filteredHighlights.length === 0 && filtersActive && (
                        <div className="text-center p-12 bg-white/2 rounded-2xl border border-dashed border-glass-border">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary/40">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </div>
                            <h3 className="text-white font-semibold mb-1">No timeline entries found</h3>
                            <p className="text-secondary text-sm max-w-xs mx-auto">
                                Try adjusting your filters or clearing the date range.
                            </p>
                        </div>
                    )}

                    <DailyTimeline highlights={filteredHighlights} loading={loading} />
                </div>
            </main>
        </>
    )
}

export default TimelinePage
