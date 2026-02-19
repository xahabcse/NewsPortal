import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ReadingHistory from './ReadingHistory'

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar = ({ isOpen = true, onClose }: SidebarProps) => {
    const location = useLocation()
    const { role } = useAuth()

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : ''
    }

    const isAdmin = role === 'Admin'

    const sidebarClasses = `
        fixed left-0 top-0 h-screen w-64 glass-morphism border-r border-glass-border p-6 flex flex-col gap-8
        transition-transform duration-300 z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
    `.trim()

    return (
        <>
            {/* Mobile overlay */}
            {!isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            <aside className={sidebarClasses}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white">N</div>
                        <span className="text-xl font-bold tracking-tight text-white">NewsPortal</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden text-secondary hover:text-white transition-colors"
                        aria-label="Close menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
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
                    <Link to="/admin/categories" className={`huly-sidebar-item ${isActive('/admin/categories')}`}>
                        <div className="flex flex-col">
                            <span>Categories</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Manage categories</span>
                        </div>
                    </Link>
                </nav>
            )}
            </aside>
        </>
    );
};

export default Sidebar;
