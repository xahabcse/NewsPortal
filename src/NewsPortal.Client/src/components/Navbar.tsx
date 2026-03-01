import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LanguageToggle from './LanguageToggle';
import NotificationPreferences from './NotificationPreferences';
import { signalRService } from '../services/SignalRService';
import toast from 'react-hot-toast';

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
    const { session, isAuthenticated, login, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search - navigate after 300ms
        searchTimeoutRef.current = setTimeout(() => {
            if (value.trim()) {
                navigate(`/search?q=${encodeURIComponent(value.trim())}`);
            } else if (window.location.pathname === '/search') {
                navigate('/');
            }
        }, 300);
    };

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        // Handle Escape key to close dropdown
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
        setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep last 10
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // Subscribe to SignalR notifications
    useEffect(() => {
        signalRService.onNotification((type, title, category) => {
            addNotification(type, title, category);
        });
    }, []);

    const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError('');
        setIsSubmitting(true);

        try {
            await login(username.trim(), password);
            setPassword('');
            setIsLoginOpen(false);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401) {
                    setLoginError('Invalid username or password.');
                } else {
                    const message = error.response?.data?.message;
                    setLoginError(typeof message === 'string' && message ? message : 'Login failed.');
                }
            } else {
                setLoginError('Login failed.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const openLoginModal = () => {
        setLoginError('');
        setPassword('');
        setIsLoginOpen(true);
    };

    const closeLoginModal = () => {
        if (isSubmitting) return;
        setIsLoginOpen(false);
    };

    const displayName = session?.username ?? 'Guest User';
    const displayRole = session?.role ?? 'Guest';
    const avatarLetter = displayName.charAt(0).toUpperCase() || 'G';

    return (
        <>
            <header className={`fixed top-0 right-0 left-0 ${isSidebarCollapsed ? 'lg:left-16' : 'lg:left-64'} h-16 glass-morphism border-b border-glass-border z-10 flex items-center justify-between px-4 lg:px-8 transition-[left] duration-300`}>
                <div className="flex items-center gap-4 flex-1 max-w-xl">
                    {/* Hamburger Menu Button - Mobile Only */}
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden text-secondary hover:text-white transition-colors p-2"
                        aria-label="Open menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div className="relative w-full">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search news, topics, or authors..."
                            className="w-full bg-white/5 border border-glass-border rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                        />
                        <div className="absolute right-3 top-2 flex items-center gap-2">
                            <span className="text-[10px] bg-white/10 border border-glass-border px-1.5 py-0.5 rounded text-secondary/70 font-mono">/</span>
                            <div className="text-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Notification Bell */}
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
                                className="absolute right-0 mt-2 w-80 bg-glass-surface border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50"
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

                    {/* User Menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 pl-6 border-l border-glass-border hover:bg-white/5 rounded-lg px-3 py-1.5 transition-colors"
                            aria-label="User menu"
                        >
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-medium text-white">{displayName}</div>
                                <div className="text-xs text-secondary">{displayRole}</div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-purple-500 border border-glass-border flex items-center justify-center text-white font-bold shadow-lg">
                                {avatarLetter}
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>

                        {/* User Dropdown Menu */}
                        {showUserMenu && isAuthenticated && (
                            <div
                                className="absolute right-0 mt-2 w-56 bg-glass-surface border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50"
                                role="menu"
                                aria-label="User menu"
                            >
                                <div className="p-4 border-b border-glass-border bg-white/5">
                                    <p className="text-sm font-semibold text-white">{session?.username}</p>
                                    <p className="text-xs text-secondary truncate">{session?.email}</p>
                                </div>
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            navigate('/profile');
                                            setShowUserMenu(false);
                                        }}
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
                                        onClick={() => {
                                            navigate('/bookmarks');
                                            setShowUserMenu(false);
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                                        role="menuitem"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                                        </svg>
                                        Bookmarks
                                    </button>
                                    {(session?.role === 'Admin' || session?.role === 'SuperAdmin') && (
                                        <button
                                            onClick={() => {
                                                navigate('/admin/dashboard');
                                                setShowUserMenu(false);
                                            }}
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
                                    {session?.role === 'SuperAdmin' && (
                                        <button
                                            onClick={() => {
                                                navigate('/admin/users');
                                                setShowUserMenu(false);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center gap-3"
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
                                        onClick={() => {
                                            logout();
                                            navigate('/');
                                            setShowUserMenu(false);
                                        }}
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

                    {isAuthenticated ? (
                        <LanguageToggle />
                    ) : (
                        <>
                            <LanguageToggle />
                            <button
                                onClick={openLoginModal}
                                className="px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-sm text-white hover:bg-accent/30 transition-colors"
                            >
                                Login
                            </button>
                        </>
                    )}
                </div>
            </header>

            {showNotifPrefs && (
                <NotificationPreferences onClose={() => setShowNotifPrefs(false)} />
            )}

            {isLoginOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-2xl font-bold text-white">Login</h2>
                            <button
                                onClick={closeLoginModal}
                                disabled={isSubmitting}
                                className="text-secondary hover:text-white disabled:opacity-50"
                                aria-label="Close login"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    required
                                    autoFocus
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                />
                            </div>

                            {loginError && (
                                <p className="text-sm text-red-400">{loginError}</p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeLoginModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-secondary hover:text-white disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Logging in...' : 'Login'}
                                </button>
                            </div>

                            {/* Social Login Buttons */}
                            <div className="mt-4 pt-4 border-t border-glass-border">
                                <p className="text-xs text-secondary text-center mb-3">Or continue with</p>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => toast('Google login coming soon. Configure OAuth credentials to enable.', { icon: '\u2139\uFE0F' })}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                        Google
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast('GitHub login coming soon. Configure OAuth credentials to enable.', { icon: '\u2139\uFE0F' })}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                                        GitHub
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-glass-border text-center">
                                <p className="text-sm text-secondary">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeLoginModal();
                                            navigate('/register');
                                        }}
                                        className="text-accent hover:text-accent/80 font-medium transition-colors"
                                    >
                                        Register here
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;

