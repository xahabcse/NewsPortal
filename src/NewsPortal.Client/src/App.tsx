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

  // Start SignalR connection on app mount
  useEffect(() => {
    signalRService.start()
    return () => signalRService.stop()
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>
        <HelmetProvider>
          <ErrorBoundary>
            <Router>
              <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />

                <div className={`flex-1 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'} flex flex-col min-w-0 transition-[padding] duration-300`}>
                  <Navbar onMenuClick={() => setSidebarOpen(true)} isSidebarCollapsed={sidebarCollapsed} />

                  <NewsTicker />
                  <div className="mt-16 flex-1 flex flex-col">
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/search" element={<SearchResultsPage />} />
                      <Route path="/timeline" element={<TimelinePage />} />
                      <Route path="/trending" element={<TrendingPage />} />
                      <Route path="/news-sources" element={<NewsSourcesPage />} />
                      <Route path="/news/:slug" element={<ArticleDetailPage />} />
                      <Route path="/category/:slug" element={<CategoryPage />} />

                      {/* Authenticated-only routes */}
                      <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

                      {/* Admin routes (Admin or SuperAdmin) */}
                      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/fetch-logs" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><FetchLogPage /></ProtectedRoute>} />
                      <Route path="/admin/categories" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><CategoriesPage /></ProtectedRoute>} />
                      <Route path="/admin/articles" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><ArticleManagementPage /></ProtectedRoute>} />
                      <Route path="/admin/analytics" element={<ProtectedRoute roles={['Admin', 'SuperAdmin']}><ContentAnalyticsPage /></ProtectedRoute>} />

                      {/* SuperAdmin-only routes */}
                      <Route path="/admin/users" element={<ProtectedRoute roles={['SuperAdmin']}><UserManagementPage /></ProtectedRoute>} />

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
