import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import NewsSourcesPage from './pages/NewsSourcesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background text-foreground flex">
          <Sidebar />

          <div className="flex-1 ml-64 flex flex-col">
            <Navbar />

            <div className="mt-16 flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/trending" element={<PlaceholderPage title="Trending" />} />
                <Route path="/news-sources" element={<NewsSourcesPage />} />
                <Route path="/news/:slug" element={<ArticleDetailPage />} />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

// Placeholder component for routes that aren't implemented yet
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8">
    <div className="text-center p-12 bg-white/2 rounded-2xl border border-dashed border-glass-border">
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-secondary text-sm">This page is coming soon...</p>
    </div>
  </div>
)

export default App
