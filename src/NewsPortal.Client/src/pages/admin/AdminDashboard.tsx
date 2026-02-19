import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { axiosInstance } from '../../services/axiosInstance';

interface DashboardStats {
    totalSources: number;
    totalArticles: number;
    totalUsers: number;
    sourceHealth: {
        active: number;
        degraded: number;
        paused: number;
        disabled: number;
    };
    articlesToday: number;
    failedJobs24h: number;
    failedSources: number;
}

const AdminDashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axiosInstance.get<DashboardStats>('/admin/stats');
                setStats(response.data);
            } catch (err: unknown) {
                if (err && typeof err === 'object' && 'response' in err) {
                    const axiosError = err as { response?: { status?: number } };
                    if (axiosError.response?.status === 403) {
                        setError('Access denied. Admin privileges required.');
                    } else {
                        setError('Failed to load dashboard stats');
                    }
                } else {
                    setError('Failed to load dashboard stats');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="glass-morphism border border-glass-border rounded-2xl p-6 animate-pulse">
                            <div className="h-4 bg-white/10 rounded w-24 mb-4"></div>
                            <div className="h-12 bg-white/10 rounded w-16"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-secondary text-sm mb-6">{error}</p>
                    <Link to="/" className="text-accent hover:text-accent/80 transition-colors">
                        Go Home →
                    </Link>
                </div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const StatCard = ({ title, value, subtitle, color = 'accent' }: { title: string; value: string | number; subtitle?: string; color?: string }) => (
        <div className="glass-morphism border border-glass-border rounded-2xl p-6">
            <div className="text-sm text-secondary mb-2">{title}</div>
            <div className={`text-3xl font-bold text-${color}-400 mb-1`}>{value}</div>
            {subtitle && <div className="text-xs text-secondary/70">{subtitle}</div>}
        </div>
    );

    return (
        <>
            <SEO
                title="Admin Dashboard"
                description="NewsPortal administration dashboard with system statistics and operational metrics."
            />
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-secondary text-sm">System overview and operational metrics</p>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Sources"
                        value={stats.totalSources}
                        subtitle="News sources configured"
                        color="blue"
                    />
                    <StatCard
                        title="Total Articles"
                        value={stats.totalArticles.toLocaleString()}
                        subtitle="Articles in database"
                        color="green"
                    />
                    <StatCard
                        title="Articles Today"
                        value={stats.articlesToday.toLocaleString()}
                        subtitle="Fetched in last 24h"
                        color="purple"
                    />
                    <StatCard
                        title="Total Users"
                        value={stats.totalUsers.toLocaleString()}
                        subtitle="Registered users"
                        color="orange"
                    />
                </div>

                {/* Source Health */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Source Health Status</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                    <span className="text-sm text-white">Active</span>
                                </div>
                                <span className="text-lg font-bold text-emerald-400">{stats.sourceHealth.active}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                    <span className="text-sm text-white">Degraded</span>
                                </div>
                                <span className="text-lg font-bold text-amber-400">{stats.sourceHealth.degraded}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-sky-400"></div>
                                    <span className="text-sm text-white">Paused</span>
                                </div>
                                <span className="text-lg font-bold text-sky-400">{stats.sourceHealth.paused}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <span className="text-sm text-white">Disabled</span>
                                </div>
                                <span className="text-lg font-bold text-red-400">{stats.sourceHealth.disabled}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">System Alerts</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    <span className="text-sm text-red-400">Failed Jobs (24h)</span>
                                </div>
                                <span className="text-lg font-bold text-red-400">{stats.failedJobs24h}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    <span className="text-sm text-amber-400">Sources with 3+ Failures</span>
                                </div>
                                <span className="text-lg font-bold text-amber-400">{stats.failedSources}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            to="/news-sources"
                            className="p-4 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Manage Sources</div>
                                    <div className="text-xs text-secondary">Add, edit, or remove sources</div>
                                </div>
                            </div>
                        </Link>
                        <Link
                            to="/admin/fetch-logs"
                            className="p-4 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                                        <line x1="12" y1="20" x2="12" y2="10"></line>
                                        <line x1="18" y1="20" x2="18" y2="4"></line>
                                        <line x1="6" y1="20" x2="6" y2="16"></line>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Fetch Logs</div>
                                    <div className="text-xs text-secondary">View import history</div>
                                </div>
                            </div>
                        </Link>
                        <a
                            href="/monitoring"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-4 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                        <path d="M2 12h5"></path>
                                        <path d="M17 12h5"></path>
                                        <path d="M7 12v5"></path>
                                        <path d="M17 12v-5"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Grafana</div>
                                    <div className="text-xs text-secondary">System monitoring</div>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
