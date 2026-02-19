import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import ToastProvider from './components/ToastProvider'
import HomePage from './pages/HomePage'
import NewsSourcesPage from './pages/NewsSourcesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import NotFoundPage from './pages/NotFoundPage'
import SearchResultsPage from './pages/SearchResultsPage'
import TrendingPage from './pages/TrendingPage'
import BookmarksPage from './pages/BookmarksPage'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <HelmetProvider>
        <ErrorBoundary>
          <Router>
            <div className="min-h-screen bg-background text-foreground flex">
              <Sidebar />

              <div className="flex-1 ml-64 flex flex-col">
                <Navbar />

                <div className="mt-16 flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/trending" element={<TrendingPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                    <Route path="/news-sources" element={<NewsSourcesPage />} />
                    <Route path="/news/:slug" element={<ArticleDetailPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </div>
              </div>
            </div>
            <ToastProvider />
          </Router>
        </ErrorBoundary>
      </HelmetProvider>
    </AuthProvider>
  )
}

export default App
