import { useState, useEffect } from 'react'
import { fetchLogsApi } from '../services/api'
import type { NewsFetchLog, FetchLogListResult } from '../services/api'

const FetchLogsPage = () => {
  const [fetchLogs, setFetchLogs] = useState<NewsFetchLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        let result: FetchLogListResult

        if (filter === 'failed') {
          result = await fetchLogsApi.getFailedFetchLogs(page, 20)
        } else {
          result = await fetchLogsApi.getAllFetchLogs(page, 20)
        }

        let filteredLogs = result.logs
        if (filter === 'success') {
          filteredLogs = result.logs.filter(log => log.success)
        }

        setFetchLogs(filteredLogs)
        setTotalPages(result.totalPages)
        setTotalCount(result.totalCount)
        setError(null)
      } catch (err) {
        console.error('Error fetching fetch logs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load fetch logs')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData()
    }, 30000)

    return () => clearInterval(interval)
  }, [page, filter, refreshTrigger])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const toggleExpand = (id: string) => {
    setExpandedLog(expandedLog === id ? null : id)
  }

  // Calculate stats
  const successCount = fetchLogs.filter(log => log.success).length
  const failedCount = fetchLogs.filter(log => !log.success).length
  const totalArticles = fetchLogs.reduce((sum, log) => sum + log.articlesFetched, 0)
  const totalNewArticles = fetchLogs.reduce((sum, log) => sum + log.newArticles, 0)

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">News Fetch Logs</h1>
          <p className="text-secondary text-sm">Monitor news fetching operations from all sources</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
            <div className="text-secondary text-sm mb-1">Total Fetches</div>
            <div className="text-2xl font-bold text-white">{totalCount}</div>
          </div>
          <div className="bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-xl p-4">
            <div className="text-green-400 text-sm mb-1">Successful</div>
            <div className="text-2xl font-bold text-green-400">{successCount}</div>
          </div>
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl p-4">
            <div className="text-red-400 text-sm mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-400">{failedCount}</div>
          </div>
          <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-xl p-4">
            <div className="text-blue-400 text-sm mb-1">Total Articles</div>
            <div className="text-2xl font-bold text-blue-400">{totalArticles}</div>
            <div className="text-xs text-blue-400/70 mt-1">{totalNewArticles} new</div>
          </div>
        </div>

        {/* Filter and Controls */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => { setFilter('all'); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-white/5 text-secondary hover:bg-white/10 border border-white/10'
                }`}
              >
                All Fetches
              </button>
              <button
                onClick={() => { setFilter('success'); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-secondary hover:bg-green-500/10 border border-white/10'
                }`}
              >
                Successful
              </button>
              <button
                onClick={() => { setFilter('failed'); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'failed'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/5 text-secondary hover:bg-red-500/10 border border-white/10'
                }`}
              >
                Failed
              </button>
            </div>

            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium transition-colors border border-white/20"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-secondary mt-4">Loading fetch logs...</p>
          </div>
        )}

        {/* Logs List */}
        {!loading && !error && (
          <>
            <div className="space-y-3 mb-6">
              {fetchLogs.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-12 text-center">
                  <p className="text-secondary text-lg">No fetch logs found</p>
                  <p className="text-secondary/60 text-sm mt-2">Logs will appear here when news fetching operations occur</p>
                </div>
              ) : (
                fetchLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`bg-white/5 backdrop-blur-md border rounded-xl p-4 transition-colors cursor-pointer ${
                      log.success
                        ? 'border-green-500/20 hover:bg-green-500/5'
                        : 'border-red-500/20 hover:bg-red-500/5'
                    }`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                              log.success
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            {log.success ? '✓ Success' : '✗ Failed'}
                          </span>
                          <span className="font-semibold text-white">{log.sourceName}</span>
                          <span className="text-secondary text-sm">{formatTimestamp(log.fetchedAt)}</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-secondary">Fetched:</span>
                            <span className="text-white ml-2 font-medium">{log.articlesFetched}</span>
                          </div>
                          <div>
                            <span className="text-secondary">New:</span>
                            <span className="text-green-400 ml-2 font-medium">{log.newArticles}</span>
                          </div>
                          <div>
                            <span className="text-secondary">Updated:</span>
                            <span className="text-blue-400 ml-2 font-medium">{log.updatedArticles}</span>
                          </div>
                          <div>
                            <span className="text-secondary">Duration:</span>
                            <span className="text-white ml-2 font-medium">{log.duration}</span>
                          </div>
                          <div className="text-right md:text-left">
                            <button
                              className="text-primary hover:text-primary-light text-xs font-medium"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(log.id)
                              }}
                            >
                              {expandedLog === log.id ? 'Hide Details ▲' : 'Show Details ▼'}
                            </button>
                          </div>
                        </div>

                        {expandedLog === log.id && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            {log.details && (
                              <div className="mb-3">
                                <span className="text-secondary text-sm font-medium">Details:</span>
                                <p className="text-white/80 text-sm mt-1">{log.details}</p>
                              </div>
                            )}
                            {log.errorMessage && (
                              <div>
                                <span className="text-red-400 text-sm font-medium">Error:</span>
                                <pre className="text-red-400/80 text-xs mt-1 bg-red-500/10 p-3 rounded-lg overflow-x-auto">
                                  {log.errorMessage}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 disabled:bg-white/5 disabled:text-secondary/50 text-white rounded-lg font-medium transition-colors border border-white/20 disabled:border-white/5"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-white/5 text-white rounded-lg border border-white/10">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 disabled:bg-white/5 disabled:text-secondary/50 text-white rounded-lg font-medium transition-colors border border-white/20 disabled:border-white/5"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default FetchLogsPage
