import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import ToastProvider from './components/ToastProvider'
import HomePage from './pages/HomePage'
import NewsSourcesPage from './pages/NewsSourcesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import CategoryPage from './pages/CategoryPage'
import NotFoundPage from './pages/NotFoundPage'
import SearchResultsPage from './pages/SearchResultsPage'
import TrendingPage from './pages/TrendingPage'
import BookmarksPage from './pages/BookmarksPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import FetchLogPage from './pages/admin/FetchLogPage'
import CategoriesPage from './pages/admin/CategoriesPage'
import UserManagementPage from './pages/admin/UserManagementPage'
import ArticleManagementPage from './pages/admin/ArticleManagementPage'
import ContentAnalyticsPage from './pages/admin/ContentAnalyticsPage'
import TimelinePage from './pages/TimelinePage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import BackToTop from './components/BackToTop'
import ScrollToTop from './components/ScrollToTop'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import NewsTicker from './components/NewsTicker'
import { signalRService } from './services/SignalRService'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Start SignalR connection on app mount — only when explicitly enabled.
  // The Cloudflare Workers backend does not support SignalR, so on that deploy
  // the env flag stays unset and we skip the connection entirely.
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_SIGNALR !== 'true') return
    signalRService.start()
    return () => signalRService.stop()
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <HelmetProvider>
          <ErrorBoundary>
            <Router>
              <ScrollToTop />
              <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />

                <div className={`flex-1 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'} flex flex-col min-w-0 transition-[padding] duration-300`}>
                  <Navbar onMenuClick={() => setSidebarOpen(true)} isSidebarCollapsed={sidebarCollapsed} />

                  <NewsTicker />
                  <div className="mt-14 sm:mt-16 flex-1 flex flex-col">
                    <Routes>
                      {/* Public routes — home, login, register only */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />

                      {/* Content routes — any authenticated user (Reader+) */}
                      <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
                      <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
                      <Route path="/trending" element={<ProtectedRoute><TrendingPage /></ProtectedRoute>} />
                      <Route path="/news-sources" element={<ProtectedRoute><NewsSourcesPage /></ProtectedRoute>} />
                      <Route path="/news/:slug" element={<ProtectedRoute><ArticleDetailPage /></ProtectedRoute>} />
                      <Route path="/category/:slug" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
                      <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                      <Route path="/user/:username" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />

                      {/* Admin routes — Admin or SuperAdmin */}
                      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/fetch-logs" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><FetchLogPage /></ProtectedRoute>} />
                      <Route path="/admin/categories" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><CategoriesPage /></ProtectedRoute>} />
                      <Route path="/admin/articles" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><ArticleManagementPage /></ProtectedRoute>} />
                      <Route path="/admin/analytics" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><ContentAnalyticsPage /></ProtectedRoute>} />
                      <Route path="/admin/users" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><UserManagementPage /></ProtectedRoute>} />

                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </div>
                </div>
              </div>
              <BackToTop />
              <KeyboardShortcuts />
              <ToastProvider />
            </Router>
          </ErrorBoundary>
        </HelmetProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
