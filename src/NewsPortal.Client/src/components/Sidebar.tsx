import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ReadingHistory from './ReadingHistory'

const Sidebar = () => {
    const location = useLocation()
    const { role } = useAuth()

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : ''
    }

    const isAdmin = role === 'Admin'

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
                <Link to="/bookmarks" className={`huly-sidebar-item ${isActive('/bookmarks')}`}>
                    <div className="flex flex-col">
                        <span>Saved</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Your bookmarks</span>
                    </div>
                </Link>
                <Link to="/news-sources" className={`huly-sidebar-item ${isActive('/news-sources')}`}>
                    <div className="flex flex-col">
                        <span>News Channels</span>
                        <span className="text-[10px] text-secondary/50 font-normal leading-tight">Manage sources</span>
                    </div>
                </Link>
            </nav>

            <nav className="flex flex-col gap-2 mt-4">
                <ReadingHistory />
            </nav>

            {isAdmin && (
                <nav className="flex flex-col gap-2 mt-4 pt-4 border-t border-glass-border">
                    <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Admin</div>
                    <Link to="/admin/dashboard" className={`huly-sidebar-item ${isActive('/admin/dashboard')}`}>
                        <div className="flex flex-col">
                            <span>Dashboard</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">System overview</span>
                        </div>
                    </Link>
                    <Link to="/admin/fetch-logs" className={`huly-sidebar-item ${isActive('/admin/fetch-logs')}`}>
                        <div className="flex flex-col">
                            <span>Fetch Logs</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Import history</span>
                        </div>
                    </Link>
                </nav>
            )}
        </aside>
    );
};

export default Sidebar;
