import { useState, useEffect, useCallback, useRef } from 'react'
import SEO from '../components/SEO'
import NewsCard from '../components/NewsCard'
import ArticlePopup from '../components/ArticlePopup'
import SkeletonCard from '../components/SkeletonCard'
import NewsFilterBar, { defaultFilters, filtersToParams, hasActiveFilters } from '../components/NewsFilterBar'
import type { ActiveFilters } from '../components/NewsFilterBar'
import { newsApi, type NewsArticle, type Category } from '../services/api'
import { NewsSourceService } from '../services/NewsSourceService'
import type { NewsSource } from '../types/NewsSource'
import { getNotificationPrefs } from '../components/NotificationPreferences'
import toast from 'react-hot-toast'

const PAGE_SIZE = 9

const HomePage = () => {
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
  const [popupArticle, setPopupArticle] = useState<NewsArticle | null>(null)
  const [feedMode, setFeedMode] = useState<'all' | 'foryou'>('all')

  const userCategorySlugs = getNotificationPrefs().categories

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
        NewsSourceService.getAll(),
        newsApi.getCategories(),
      ])
      setSources(srcs.filter(s => s.isActive))
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
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Morning, Reader</h1>
              <p className="text-secondary text-sm">
                {loading ? 'Loading latest headlines…' : (
                  <>Stay updated with <span className="text-accent font-semibold">{totalCount}</span> articles.</>
                )}
              </p>
            </div>
          </div>

          {/* Feed mode tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { setFeedMode('all'); setFilters(defaultFilters()); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${feedMode === 'all' && !hasActiveFilters(filters)
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
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
                  onCardClick={() => setPopupArticle(item)}
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
        <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-accent/20 via-purple-500/10 to-transparent border border-accent/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-md">
              <h2 className="text-2xl font-bold text-white mb-2">Upgrade to NewsPortal+</h2>
              <p className="text-secondary text-sm italic">Unlock exclusive analysis, ad-free experience, and early access to breaking news stories from around the globe.</p>
            </div>
            <button
              onClick={handlePremiumClick}
              className="bg-white text-background px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all transform hover:scale-105"
            >
              Explore Premium
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
        </div>
      </main>

      {popupArticle && (
        <ArticlePopup
          isOpen={!!popupArticle}
          onClose={() => setPopupArticle(null)}
          title={popupArticle.title}
          summary={popupArticle.summary}
          categoryName={popupArticle.categoryName}
          sourceName={popupArticle.sourceName}
          publishedAt={popupArticle.publishedAt}
          thumbnailUrl={popupArticle.thumbnailUrl}
          sourceUrl={popupArticle.sourceUrl}
          slug={popupArticle.slug}
          articleId={popupArticle.id}
        />
      )}
    </>
  )
}

export default HomePage
