import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import NewsCard from './components/NewsCard'
import { newsData } from './data/newsData'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />

        <main className="mt-16 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Morning, Reader</h1>
              <p className="text-secondary text-sm">Stay updated with the latest headlines today.</p>
            </div>

            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-glass-border">
              <button className="px-4 py-1.5 text-xs font-semibold rounded-md bg-accent text-white shadow-lg shadow-accent/20">All News</button>
              <button className="px-4 py-1.5 text-xs font-semibold rounded-md text-secondary hover:text-white transition-colors">Popular</button>
              <button className="px-4 py-1.5 text-xs font-semibold rounded-md text-secondary hover:text-white transition-colors">Recent</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsData.map(news => (
              <NewsCard key={news.id} {...news} />
            ))}
          </div>

          <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-accent/20 via-purple-500/10 to-transparent border border-accent/10 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold text-white mb-2">Upgrade to NewsPortal+</h2>
                <p className="text-secondary text-sm italic">Unlock exclusive analysis, ad-free experience, and early access to breaking news stories from around the globe.</p>
              </div>
              <button className="bg-white text-background px-8 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all transform hover:scale-105">
                Explore Premium
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
