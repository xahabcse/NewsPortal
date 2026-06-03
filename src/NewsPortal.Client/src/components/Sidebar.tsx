import { Link, useLocation } from 'react-router-dom'

import { useState, useEffect } from 'react'
import { StatsService } from '../services/StatsService'
import { newsApi, type Category } from '../services/api'

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

// Reusable inline SVG icon components (20x20, stroke-based, Lucide-style)
const IconHome = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
)
const IconTimeline = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
)
const IconTrending = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
)
const IconBookmark = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>
)
const IconRss = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
)
const IconFileText = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
)
const IconInfo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
)
const IconChevronLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
)
const IconChevronRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
)

// Map Bootstrap Icon names to inline SVGs (16x16)
const categoryIconMap: Record<string, JSX.Element> = {
    'bi-flag': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>,
    'bi-globe': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
    'bi-bank': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>,
    'bi-graph-up': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
    'bi-cpu': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>,
    'bi-trophy': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>,
    'bi-film': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line><line x1="17" y1="17" x2="22" y2="17"></line></svg>,
    'bi-heart-pulse': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"></path></svg>,
    'bi-mortarboard': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"></path></svg>,
    'bi-chat-quote': <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 8h2v4H8z"></path><path d="M14 8h2v4h-2z"></path></svg>,
};

const Sidebar = ({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) => {
    const location = useLocation()
    const [todayCount, setTodayCount] = useState<number>(0)
    const [categories, setCategories] = useState<Category[]>([])
    const [showAllCategories, setShowAllCategories] = useState(false)

    // Auto-close sidebar on navigation (mobile)
    useEffect(() => {
        if (isOpen && onClose) {
            onClose();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : ''
    }

    const isCategoryActive = (slug: string) => {
        return location.pathname === `/category/${slug}` ? 'active' : ''
    }


    useEffect(() => {
        const fetchTodayCount = async () => {
            try {
                const stats = await StatsService.getTodayCount()
                setTodayCount(stats.count)
            } catch (error) {
                console.error('Failed to fetch today count:', error)
            }
        }

        fetchTodayCount()
        const interval = setInterval(fetchTodayCount, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await newsApi.getCategories()
                setCategories(cats.filter(c => (c.articleCount ?? 0) > 0))
            } catch (error) {
                console.error('Failed to fetch categories:', error)
            }
        }
        fetchCategories()
    }, [])

    const visibleCategories = showAllCategories ? categories : categories.slice(0, 6)

    const sidebarClasses = [
        'fixed left-0 top-0 h-screen glass-morphism border-r border-glass-border flex flex-col overflow-y-auto',
        'transition-all duration-300 z-50',
        // Width: icon-only on desktop when collapsed, full-width otherwise
        isCollapsed ? 'w-64 lg:w-16' : 'w-64',
        // Padding: compact on desktop when collapsed, normal otherwise
        isCollapsed ? 'p-4 sm:p-6 lg:p-2' : 'p-4 sm:p-6',
        // Gap: compact on desktop when collapsed, normal otherwise
        isCollapsed ? 'gap-4 sm:gap-6 lg:gap-2' : 'gap-4 sm:gap-6',
        // Visibility: on mobile hide off-screen by default, show when isOpen.
        // On desktop (lg+) always visible regardless of isOpen.
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
    ].join(' ')

    // Hide text labels when collapsed on desktop only; always show on mobile.
    const textClass = isCollapsed ? 'lg:hidden' : ''
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            <aside className={sidebarClasses}>
                {/* Logo + Close */}
                <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:gap-0' : ''}`}>
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white shrink-0">N</div>
                        <span className={`text-xl font-bold tracking-tight text-white ${textClass}`}>NewsPortal</span>
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

                {/* Today's Articles Badge */}
                {/* Expanded: full badge on all screens */}
                {!isCollapsed ? (
                    <div className="bg-accent/15 border border-accent/30 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-secondary uppercase tracking-wider">Today</div>
                                <div className="text-2xl font-bold text-white">{todayCount}</div>
                            </div>
                            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                                <IconFileText />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Mobile: full badge (sidebar always expanded on mobile) */}
                        <div className="bg-accent/15 border border-accent/30 rounded-xl p-3 lg:hidden">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] text-secondary uppercase tracking-wider">Today</div>
                                    <div className="text-2xl font-bold text-white">{todayCount}</div>
                                </div>
                                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center text-accent">
                                    <IconFileText />
                                </div>
                            </div>
                        </div>
                        {/* Desktop collapsed: compact count */}
                        <div className="hidden lg:flex flex-col items-center bg-accent/15 border border-accent/30 rounded-lg py-2" title={`${todayCount} articles today`}>
                            <div className="text-[8px] text-secondary uppercase">Today</div>
                            <div className="text-lg font-bold text-white">{todayCount}</div>
                        </div>
                    </>
                )}

                {/* Main Menu */}
                <nav className={`flex flex-col ${isCollapsed ? 'lg:gap-1 gap-2' : 'gap-2'}`}>
                    <div className={`text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4 ${textClass}`}>Main Menu</div>

                    <Link to="/" className={`huly-sidebar-item ${isActive('/')} ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title="Home">
                        <span className="shrink-0"><IconHome /></span>
                        <span className={textClass}>Home</span>
                    </Link>

                    <Link to="/timeline" className={`huly-sidebar-item ${isActive('/timeline')} ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title="Daily Timeline">
                        <span className="shrink-0"><IconTimeline /></span>
                        <div className={`flex flex-col ${textClass}`}>
                            <span>Daily Timeline</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Day-wise highlights</span>
                        </div>
                    </Link>

                    <Link to="/trending" className={`huly-sidebar-item ${isActive('/trending')} ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title="Trending">
                        <span className="shrink-0"><IconTrending /></span>
                        <div className={`flex flex-col ${textClass}`}>
                            <span>Trending</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Most popular stories</span>
                        </div>
                    </Link>

                    <Link to="/bookmarks" className={`huly-sidebar-item ${isActive('/bookmarks')} ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title="Saved">
                        <span className="shrink-0"><IconBookmark /></span>
                        <div className={`flex flex-col ${textClass}`}>
                            <span>Saved</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Your bookmarks</span>
                        </div>
                    </Link>

                    <Link to="/news-sources" className={`huly-sidebar-item ${isActive('/news-sources')} ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title="News Channels">
                        <span className="shrink-0"><IconRss /></span>
                        <div className={`flex flex-col ${textClass}`}>
                            <span>News Channels</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Manage sources</span>
                        </div>
                    </Link>

                    <Link to="/about" className={`huly-sidebar-item ${isActive('/about')} ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`} title="About">
                        <span className="shrink-0"><IconInfo /></span>
                        <div className={`flex flex-col ${textClass}`}>
                            <span>About</span>
                            <span className="text-[10px] text-secondary/50 font-normal leading-tight">Story & team</span>
                        </div>
                    </Link>
                </nav>

                {/* Categories Section */}
                {categories.length > 0 && (
                    <nav className={`flex flex-col gap-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
                        <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 ml-4">Categories</div>
                        {visibleCategories.map(cat => (
                            <Link
                                key={cat.id}
                                to={`/category/${cat.slug}`}
                                className={`huly-sidebar-item group ${isCategoryActive(cat.slug)}`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="flex items-center gap-2.5">
                                        <span
                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                            style={cat.color ? {
                                                backgroundColor: `${cat.color}20`,
                                                color: cat.color,
                                                border: `1px solid ${cat.color}30`
                                            } : {
                                                backgroundColor: 'rgb(var(--color-accent) / 0.12)',
                                                color: 'rgb(var(--color-accent))',
                                                border: '1px solid rgb(var(--color-accent) / 0.3)'
                                            }}
                                        >
                                            {cat.icon && categoryIconMap[cat.icon] ? categoryIconMap[cat.icon] : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                                            )}
                                        </span>
                                        <span className="text-sm">{cat.name}</span>
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-secondary border border-glass-border group-hover:bg-accent/15 group-hover:text-accent group-hover:border-accent/30 transition-colors">
                                        {cat.articleCount}
                                    </span>
                                </div>
                            </Link>
                        ))}
                        {categories.length > 6 && (
                            <button
                                onClick={() => setShowAllCategories(!showAllCategories)}
                                className="text-xs text-accent hover:text-accent/80 ml-4 mt-1 text-left transition-colors"
                            >
                                {showAllCategories ? 'Show less' : `Show all (${categories.length})`}
                            </button>
                        )}
                    </nav>
                )}

                {/* Admin navigation moved to the profile dashboard (/profile) as a
                    role-gated Admin Control Panel. */}

                {/* Spacer to push toggle to bottom */}
                <div className="flex-1" />

                {/* Collapse/Expand Toggle — desktop only */}
                <button
                    onClick={onToggleCollapse}
                    className={`hidden lg:flex items-center gap-3 px-4 py-2 rounded-lg text-secondary hover:text-white hover:bg-white/5 transition-all duration-200 ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span className="shrink-0">
                        {isCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
                    </span>
                    <span className={`text-sm ${textClass}`}>Collapse</span>
                </button>
            </aside>
        </>
    );
};

export default Sidebar;
