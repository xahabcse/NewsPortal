import { useState, useEffect } from 'react'
import { logsApi } from '../services/api'
import type { LogEntry, LogStats } from '../services/api'

const LogsPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        const result = await logsApi.getLogs(page, 50, selectedLevel || undefined, searchQuery || undefined)
        setLogs(result.items)
        setTotalPages(result.totalPages)
        setError(null)
      } catch (err) {
        console.error('Error fetching logs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load logs')
      } finally {
        setLoading(false)
      }
    }

    const fetchStats = async () => {
      try {
        const statsData = await logsApi.getLogStats()
        setStats(statsData)
      } catch (err) {
        console.error('Error fetching stats:', err)
      }
    }

    fetchLogs()
    fetchStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLogs()
      fetchStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [page, selectedLevel, searchQuery, refreshTrigger])

  const getLevelColor = (level: string) => {
    const levelLower = level.toLowerCase()
    if (levelLower === 'error' || levelLower === 'fatal') return 'text-red-500 bg-red-500/10 border-red-500/20'
    if (levelLower === 'warning') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    if (levelLower === 'information') return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  }

  const getLevelBadgeColor = (level: string) => {
    const levelLower = level.toLowerCase()
    if (levelLower === 'error' || levelLower === 'fatal') return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (levelLower === 'warning') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (levelLower === 'information') return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">System Logs</h1>
          <p className="text-secondary text-sm">Monitor application events and errors in real-time</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-morphism border border-glass-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-xs mb-1">Total Logs</p>
                  <p className="text-2xl font-bold text-white">{stats.totalLogs}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            <div className="glass-morphism border border-glass-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-xs mb-1">Errors</p>
                  <p className="text-2xl font-bold text-red-400">{stats.errorCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
              </div>
            </div>

            <div className="glass-morphism border border-glass-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-xs mb-1">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.warningCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
              </div>
            </div>

            <div className="glass-morphism border border-glass-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-xs mb-1">Info</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.infoCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-morphism border border-glass-border rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-2.5 text-secondary hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </div>
            </form>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLevel('')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedLevel === '' ? 'bg-accent text-white' : 'bg-white/5 text-secondary hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedLevel('Information')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedLevel === 'Information' ? 'bg-blue-500 text-white' : 'bg-white/5 text-secondary hover:text-white'
                }`}
              >
                Info
              </button>
              <button
                onClick={() => setSelectedLevel('Warning')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedLevel === 'Warning' ? 'bg-yellow-500 text-white' : 'bg-white/5 text-secondary hover:text-white'
                }`}
              >
                Warnings
              </button>
              <button
                onClick={() => setSelectedLevel('Error')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedLevel === 'Error' ? 'bg-red-500 text-white' : 'bg-white/5 text-secondary hover:text-white'
                }`}
              >
                Errors
              </button>
            </div>

            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/5 border border-glass-border rounded-lg text-secondary hover:text-white hover:border-accent/50 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="glass-morphism border border-glass-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 text-center m-4 rounded-xl">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary/40">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">No logs found</h3>
              <p className="text-secondary text-sm">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <div className="divide-y divide-glass-border">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-4 hover:bg-white/2 transition-all cursor-pointer ${getLevelColor(log.level)}`}
                  onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`px-2 py-1 rounded text-xs font-mono font-semibold border ${getLevelBadgeColor(log.level)}`}>
                      {log.level}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="text-white text-sm font-medium break-words">{log.message}</p>
                        <span className="text-xs text-secondary font-mono whitespace-nowrap">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-xs text-secondary/70 font-mono">{log.source}</p>
                      {expandedLog === index && log.exception && (
                        <pre className="mt-3 p-3 bg-black/30 rounded-lg text-xs text-red-300 overflow-x-auto font-mono border border-red-500/20">
                          {log.exception}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/5 border border-glass-border rounded-lg text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white/5 border border-glass-border rounded-lg text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogsPage
