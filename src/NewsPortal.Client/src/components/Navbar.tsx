import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import NotificationPreferences from './NotificationPreferences';
import { signalRService } from '../services/SignalRService';
import { Avatar } from '../utils/avatars';

interface Notification {
    id: string;
    type: 'article' | 'breaking';
    title: string;
    category?: string;
    timestamp: Date;
    read: boolean;
}

interface NavbarProps {
    onMenuClick?: () => void;
    isSidebarCollapsed?: boolean;
}

const Navbar = ({ onMenuClick, isSidebarCollapsed = false }: NavbarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
    const { session, isAuthenticated, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifPrefs, setShowNotifPrefs] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            if (value.trim()) {
                navigate(`/search?q=${encodeURIComponent(value.trim())}`);
            } else if (window.location.pathname === '/search') {
                navigate('/');
            }
        }, 300);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowNotifications(false);
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, []);

    const addNotification = (type: 'article' | 'breaking', title: string, category?: string) => {
        const newNotification: Notification = {
            id: Date.now().toString(),
            type,
            title,
            category,
            timestamp: new Date(),
            read: false
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 10));
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        signalRService.onNotification((type, title, category) => {
            addNotification(type, title, category);
        });
    }, []);

    const displayName = session?.username ?? 'Guest User';
    const displayRole = session?.role ?? 'Guest';
    const isAdmin = session?.role === 'Admin' || session?.role === 'SuperAdmin';

    return (
        <>
            <header className={`fixed top-0 right-0 left-0 ${isSidebarCollapsed ? 'lg:left-16' : 'lg:left-64'} h-14 sm:h-16 glass-morphism border-b border-glass-border z-10 flex items-center justify-between gap-2 px-2 sm:px-4 lg:px-8 transition-[left] duration-300`}>
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
                    {/* Hamburger Menu Button - Mobile/Tablet Only */}
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden text-secondary hover:text-white transition-colors p-2 -ml-1 shrink-0 rounded-lg hover:bg-white/5"
                        aria-label="Open menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="relative w-full min-w-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search..."
                            className="w-full bg-white/5 border border-glass-border rounded-lg py-1.5 sm:py-2 pl-3 pr-9 sm:pl-4 sm:pr-14 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                        />
                        <div className="absolute right-2 sm:right-3 top-1.5 sm:top-2 flex items-center gap-1.5">
                            <span className="hidden sm:inline-block text-[10px] bg-white/10 border border-glass-border px-1.5 py-0.5 rounded text-secondary/70 font-mono">/</span>
                            <div className="text-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-3 lg:gap-4 shrink-0">
                    {/* Notification Bell — only when authenticated (no-op for guests) */}
                    {isAuthenticated && (
                    <div className="relative" ref={notificationRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="text-secondary hover:text-white transition-colors relative"
                            aria-label="Notifications"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-accent rounded-full border border-background text-[10px] text-white font-bold flex items-center justify-center px-1">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div
                                className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-glass-surface border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50"
                                role="dialog"
                                aria-label="Notifications"
                                aria-modal="true"
                            >
                                <div className="p-4 border-b border-glass-border">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                                        <div className="flex items-center gap-3">
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={() => setNotifications([])}
                                                    className="text-xs text-accent hover:text-accent/80"
                                                >
                                                    Clear all
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    setShowNotifPrefs(true);
                                                }}
                                                className="text-secondary hover:text-white transition-colors"
                                                title="Notification preferences"
                                                aria-label="Notification preferences"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-secondary">
                                            No notifications yet
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                onClick={() => markAsRead(notification.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        markAsRead(notification.id);
                                                    }
                                                }}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`Notification: ${notification.title}`}
                                                className={`p-4 border-b border-glass-border hover:bg-white/5 cursor-pointer transition-colors focus:outline-none focus:bg-white/10 ${
                                                    !notification.read ? 'bg-accent/5' : ''
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-2 h-2 rounded-full mt-2 ${
                                                        notification.type === 'breaking' ? 'bg-red-500' : 'bg-accent'
                                                    }`} />
                                                    <div className="flex-1">
                                                        <p className={`text-sm ${
                                                            !notification.read ? 'font-semibold text-white' : 'text-secondary'
                                                        }`}>
                                                            {notification.title}
                                                        </p>
                                                        {notification.category && (
                                                            <p className="text-xs text-secondary mt-1">
                                                                {notification.category}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-secondary/50 mt-2">
                                                            {notification.timestamp.toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    {/* User Menu — avatar only on mobile, full block on sm+ (only when authenticated) */}
                    {isAuthenticated && (
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 sm:pl-3 lg:pl-6 sm:border-l sm:border-glass-border hover:bg-white/5 rounded-lg px-1 sm:px-3 py-1.5 transition-colors"
                            aria-label="User menu"
                        >
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-medium text-white">{displayName}</div>
                                <div className="text-xs text-secondary">{displayRole}</div>
                            </div>
                            <Avatar id={session?.avatarId || 1} size="md" />
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary hidden md:block">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>

                        {/* User Dropdown Menu */}
                        {showUserMenu && isAuthenticated && (
                            <div
                                className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-1rem)] bg-glass-surface border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50"
                                role="menu"
                                aria-label="User menu"
                            >
                                <div className="p-4 border-b border-glass-border bg-white/5">
                                    <p className="text-sm font-semibold text-white">{session?.username}</p>
                                    <p className="text-xs text-secondary truncate">{session?.email}</p>
                                </div>
                                <div className="py-2">
                                    <button
                                        onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        My Profile
                                    </button>
                                    <button
                                        onClick={() => { navigate('/bookmarks'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                                        </svg>
                                        Bookmarks
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => { navigate('/admin/dashboard'); setShowUserMenu(false); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                                            role="menuitem"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                                                <line x1="2" x2="22" y1="10" y2="10"></line>
                                            </svg>
                                            Admin Dashboard
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => { navigate('/admin/users'); setShowUserMenu(false); }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-accent hover:text-accent hover:bg-accent/10 transition-colors flex items-center gap-3"
                                            role="menuitem"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            User Management
                                        </button>
                                    )}
                                </div>
                                <div className="border-t border-glass-border py-2">
                                    <button
                                        onClick={() => { logout(); navigate('/'); setShowUserMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                            <polyline points="16 17 21 12 16 7"></polyline>
                                            <line x1="21" x2="9" y1="12" y2="12"></line>
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="text-secondary hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        )}
                    </button>

                    {!isAuthenticated && !isAuthRoute && (
                        <button
                            onClick={() => navigate('/login')}
                            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-xs sm:text-sm text-white hover:bg-accent/30 transition-colors whitespace-nowrap"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </header>

            {showNotifPrefs && (
                <NotificationPreferences onClose={() => setShowNotifPrefs(false)} />
            )}
        </>
    );
};

export default Navbar;
