import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import SEO from '../components/SEO'
import NewsCard from '../components/NewsCard'
import SkeletonCard from '../components/SkeletonCard'
import NewsFilterBar, { defaultFilters, filtersToParams, hasActiveFilters } from '../components/NewsFilterBar'
import type { ActiveFilters } from '../components/NewsFilterBar'
import { newsApi, type NewsArticle, type Category } from '../services/api'
import { NewsSourceService } from '../services/NewsSourceService'
import type { NewsSource } from '../types/NewsSource'
import { getNotificationPrefs } from '../components/NotificationPreferences'
import { getBanglaDate, getBengaliCalendarDate, getHijriDate, getSession, getBanglaRitu, toBanglaDigits } from '../utils/dateLocale'
import { useAuth } from '../context/AuthContext'
import WeatherWidget from '../components/WeatherWidget'
import toast from 'react-hot-toast'

const PAGE_SIZE = 9

// Time-of-day outline icon (line/transparent, 24x24, currentColor) — replaces the greeting emoji.
const SessionIcon = ({ hour }: { hour: number }) => {
  const svgProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'w-5 h-5 sm:w-7 sm:h-7',
  }
  // Night
  if (hour < 4 || hour >= 19) {
    return (
      <svg {...svgProps}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></svg>
    )
  }
  // Sunrise (dawn) / sunset (evening) — horizon with rising sun
  if ((hour >= 4 && hour < 6) || (hour >= 15 && hour < 19)) {
    return (
      <svg {...svgProps}><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" /></svg>
    )
  }
  // Daytime sun
  return (
    <svg {...svgProps}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
  )
}

const HomePage = () => {
  const { session: authSession } = useAuth()
  const [news, setNews] = useState<NewsArticle[]>([])
  const [sources, setSources] = useState<NewsSource[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filters, setFilters] = useState<ActiveFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [feedMode, setFeedMode] = useState<'all' | 'foryou'>('all')

  const userCategorySlugs = getNotificationPrefs().categories

  const { session, bengaliDate, hijriDate, banglaDate, ritu, currentHour } = useMemo(() => {
    const now = new Date()
    return {
      session: getSession(now.getHours()),
      bengaliDate: getBengaliCalendarDate(now),
      hijriDate: getHijriDate(now),
      banglaDate: getBanglaDate(now),
      ritu: getBanglaRitu(now),
      currentHour: now.getHours(),
    }
  }, [])

  const handlePremiumClick = () => {
    toast(
      () => (
        <div>
          <strong>NewsPortal+ Coming Soon!</strong>
          <p className="text-xs opacity-70 mt-1">We're working on premium features. Stay tuned!</p>
        </div>
      ),
      { duration: 5000, position: 'top-right' }
    )
  }

  const fetchMeta = useCallback(async () => {
    try {
      const [srcs, cats] = await Promise.all([
        NewsSourceService.getActive(),
        newsApi.getCategories(),
      ])
      setSources(srcs)
      setCategories(cats)
    } catch (err) {
      console.error('Error fetching metadata:', err)
    }
  }, [])

  const fetchNews = useCallback(async (pageNum: number, append = false, currentFilters = filters) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)

      let result
      if (hasActiveFilters(currentFilters)) {
        result = await newsApi.getFilteredNews(filtersToParams(currentFilters, pageNum, PAGE_SIZE))
      } else {
        result = await newsApi.getLatestNews(pageNum, PAGE_SIZE)
      }

      if (append) setNews(prev => [...prev, ...result.items])
      else setNews(result.items)

      setHasNextPage(result.hasNextPage)
      setTotalCount(result.totalCount)
      setError(null)
    } catch (err) {
      console.error('Error fetching news:', err)
      setError(`Failed to load news. ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filters])

  useEffect(() => { fetchMeta() }, [fetchMeta])

  // Re-fetch on filter change
  useEffect(() => {
    setPage(1)
    fetchNews(1, false, filters)
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchNews(nextPage, true)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [hasNextPage, loadingMore, loading, page, fetchNews])

  const handleFiltersChange = (newFilters: ActiveFilters) => {
    setFilters(newFilters)
    setFeedMode('all')
  }

  return (
    <>
      <SEO
        title="Latest News & Headlines"
        description="Stay updated with the latest headlines from trusted news sources worldwide. Real-time news aggregation with smart categorization."
      />
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4">
            <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
              <span className="shrink-0 mt-0.5 sm:mt-1 w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-accent/12 border border-accent/25 flex items-center justify-center text-accent">
                <SessionIcon hour={currentHour} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-xl sm:text-4xl font-bold text-white mb-1.5 tracking-tight leading-tight break-words">
                  {session.greeting}, <span className="text-accent">{authSession?.username || 'পাঠক'}</span>
                </h1>
                <p className="text-[11px] sm:text-base font-bold mb-1 flex flex-wrap items-center gap-x-1 sm:gap-x-1.5">
                  <span className="text-white/80">আজ</span>
                  <span className="text-accent">{bengaliDate}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/70">{hijriDate}</span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/70">{banglaDate}</span>
                </p>
                <p className="text-[11px] sm:text-sm font-semibold mb-1 flex items-center gap-1.5">
                  <span className="text-secondary">ঋতু পরিক্রমায়</span>
                  <span className="text-accent font-bold">{ritu.name}</span>
                </p>
                <p className="text-secondary text-[11px] sm:text-sm font-medium flex items-center flex-wrap">
                  {loading ? 'সর্বশেষ শিরোনাম লোড হচ্ছে…' : (
                    <>
                      সর্বমোট <span className="text-accent font-bold text-sm sm:text-base mx-1">{toBanglaDigits(totalCount)}</span> টি সংবাদ প্রস্তুত আছে আপনার জন্য
                      <span className="inline-block w-3 h-3 rounded-full bg-danger ml-2" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="hidden sm:block shrink-0 w-44">
              <WeatherWidget />
            </div>
          </div>

          {/* Feed mode tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { setFeedMode('all'); setFilters(defaultFilters()); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${feedMode === 'all' && !hasActiveFilters(filters)
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-white/5 text-secondary hover:text-white hover:bg-white/10 border border-glass-border'}`}
            >
              All News
            </button>
            {userCategorySlugs.length > 0 && (
              <button
                onClick={() => {
                  const catIds = categories
                    .filter(c => userCategorySlugs.includes(c.slug))
                    .map(c => c.id)
                  setFilters({ ...defaultFilters(), categoryIds: catIds })
                  setFeedMode('foryou')
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${feedMode === 'foryou'
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-white/5 text-secondary hover:text-white hover:bg-white/10 border border-glass-border'}`}
              >
                For You
              </button>
            )}
          </div>

          {/* Filter bar */}
          <NewsFilterBar
            sources={sources}
            categories={categories}
            filters={filters}
            onChange={handleFiltersChange}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, idx) => <SkeletonCard key={idx} />)}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            {error}
            <button
              onClick={() => fetchNews(1, false)}
              className="mt-3 px-4 py-2 bg-accent/20 border border-accent/30 text-accent text-sm font-medium rounded-lg hover:bg-accent/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center p-12 bg-white/2 rounded-2xl border border-dashed border-glass-border">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary/40"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v14a2 2 0 0 0 2 2z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            </div>
            <h3 className="text-white font-semibold mb-1">No articles found</h3>
            <p className="text-secondary text-sm max-w-xs mx-auto">
              Try adjusting your filters or check back in a few moments.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {news.map(item => (
                <NewsCard
                  key={item.id}
                  title={item.title}
                  summary={item.summary}
                  categoryName={item.categoryName}
                  sourceName={item.sourceName}
                  publishedAt={item.publishedAt}
                  thumbnailUrl={item.thumbnailUrl}
                  slug={item.slug}
                  sourceUrl={item.sourceUrl}
                  articleId={item.id}
                  showBookmark
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {hasNextPage && (
              <div ref={observerTarget} className="mt-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-secondary">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span className="text-sm">Loading more articles…</span>
                  </div>
                )}
              </div>
            )}

            {!hasNextPage && news.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-secondary text-sm">
                  You've caught up! <span className="text-accent">{news.length}</span> articles loaded.
                </p>
              </div>
            )}
          </>
        )}

        {/* Premium banner */}
        <div className="mt-12 p-4 sm:p-8 rounded-3xl bg-accent/10 border border-accent/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="max-w-md">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white mb-2">Upgrade to NewsPortal+</h2>
              <p className="text-secondary text-xs sm:text-sm italic">Unlock exclusive analysis, ad-free experience, and early access to breaking news stories from around the globe.</p>
            </div>
            <button
              onClick={handlePremiumClick}
              className="bg-accent text-white px-4 sm:px-8 py-2 sm:py-3 rounded-xl font-bold hover:bg-accent/90 transition-all transform hover:scale-105"
            >
              Explore Premium
            </button>
          </div>
        </div>
      </main>

    </>
  )
}

export default HomePage
