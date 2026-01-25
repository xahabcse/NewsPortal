import { Link, useLocation } from 'react-router-dom'

const Sidebar = () => {
    const location = useLocation()

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : ''
    }

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass-morphism border-r border-glass-border p-6 flex flex-col gap-8">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white">N</div>
                <span className="text-xl font-bold tracking-tight text-white">NewsPortal</span>
            </div>

            <nav className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Main Menu</div>
                <Link to="/" className={`huly-sidebar-item ${isActive('/')}`}>
                    <span>Home</span>
                </Link>
                <Link to="/trending" className={`huly-sidebar-item ${isActive('/trending')}`}>
                    <div className="flex flex-col">
                        <span>Trending</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Most popular stories</span>
                    </div>
                </Link>
                <Link to="/categories" className={`huly-sidebar-item ${isActive('/categories')}`}>
                    <div className="flex flex-col">
                        <span>Categories</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Browse by topic</span>
                    </div>
                </Link>
                <Link to="/bookmarks" className={`huly-sidebar-item ${isActive('/bookmarks')}`}>
                    <div className="flex flex-col">
                        <span>Bookmarks</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Your saved items</span>
                    </div>
                </Link>
                <Link to="/news-sources" className={`huly-sidebar-item ${isActive('/news-sources')}`}>
                    <div className="flex flex-col">
                        <span>News Channels</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Manage sources</span>
                    </div>
                </Link>
            </nav>

            <nav className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Developer</div>
                <Link to="/logs" className={`huly-sidebar-item ${isActive('/logs')}`}>
                    <div className="flex flex-col">
                        <span>System Logs</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Monitor & debug</span>
                    </div>
                </Link>
                <Link to="/fetch-logs" className={`huly-sidebar-item ${isActive('/fetch-logs')}`}>
                    <div className="flex flex-col">
                        <span>Fetch Logs</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">News fetch history</span>
                    </div>
                </Link>
            </nav>

            <nav className="flex flex-col gap-2 mt-auto">
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Support</div>
                <Link to="/settings" className={`huly-sidebar-item ${isActive('/settings')}`}>
                    <div className="flex flex-col">
                        <span>Settings</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">App preferences</span>
                    </div>
                </Link>
                <Link to="/help" className={`huly-sidebar-item ${isActive('/help')}`}>
                    <div className="flex flex-col">
                        <span>Help Center</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">FAQ & Support</span>
                    </div>
                </Link>
            </nav>
        </aside>
    );
};

export default Sidebar;
