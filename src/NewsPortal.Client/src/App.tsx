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
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import BackToTop from './components/BackToTop'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import NewsTicker from './components/NewsTicker'
import { signalRService } from './services/SignalRService'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

              <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
                <Navbar onMenuClick={() => setSidebarOpen(true)} />

                <NewsTicker />
                <div className="mt-16 flex-1 flex flex-col">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/timeline" element={<TimelinePage />} />
                    <Route path="/trending" element={<TrendingPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                    <Route path="/news-sources" element={<NewsSourcesPage />} />
                    <Route path="/news/:slug" element={<ArticleDetailPage />} />
                    <Route path="/category/:slug" element={<CategoryPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/fetch-logs" element={<FetchLogPage />} />
                    <Route path="/admin/categories" element={<CategoriesPage />} />
                    <Route path="/admin/articles" element={<ArticleManagementPage />} />
                    <Route path="/admin/users" element={<UserManagementPage />} />
                    <Route path="/admin/analytics" element={<ContentAnalyticsPage />} />
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
