import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { axiosInstance } from '../../services/axiosInstance';
import { useTheme } from '../../context/ThemeContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell,
    BarChart, Bar,
    ResponsiveContainer,
    Legend,
} from 'recharts';

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

interface ChartStats {
    dailyArticles: { date: string; count: number }[];
    topArticles: { title: string; viewCount: number; slug: string }[];
}

interface CategoryStat {
    name: string;
    articleCount: number;
    color?: string;
}

const HEALTH_COLORS = ['#34d399', '#fbbf24', '#38bdf8', '#f87171'];

const AdminDashboard = () => {
    const { theme } = useTheme();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartStats, setChartStats] = useState<ChartStats | null>(null);
    const [categories, setCategories] = useState<CategoryStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const chartText = theme === 'dark' ? '#94a3b8' : '#64748b';
    const chartGrid = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    const tooltipBg = theme === 'dark' ? '#161718' : '#ffffff';
    const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const tooltipText = theme === 'dark' ? '#fff' : '#0f172a';

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, chartRes, catRes] = await Promise.all([
                    axiosInstance.get<DashboardStats>('/admin/stats'),
                    axiosInstance.get<ChartStats>('/admin/stats/charts').catch(() => null),
                    axiosInstance.get<CategoryStat[]>('/news/categories').catch(() => null),
                ]);
                setStats(statsRes.data);
                if (chartRes) setChartStats(chartRes.data);
                if (catRes) setCategories(catRes.data.filter(c => c.articleCount > 0));
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

        fetchAll();
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
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const healthData = [
        { name: 'Active', value: stats.sourceHealth.active },
        { name: 'Degraded', value: stats.sourceHealth.degraded },
        { name: 'Paused', value: stats.sourceHealth.paused },
        { name: 'Disabled', value: stats.sourceHealth.disabled },
    ].filter(d => d.value > 0);

    const categoryColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

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
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <div className="text-sm text-secondary mb-2">Total Sources</div>
                        <div className="text-3xl font-bold text-blue-400 mb-1">{stats.totalSources}</div>
                        <div className="text-xs text-secondary/70">News sources configured</div>
                    </div>
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <div className="text-sm text-secondary mb-2">Total Articles</div>
                        <div className="text-3xl font-bold text-emerald-400 mb-1">{stats.totalArticles.toLocaleString()}</div>
                        <div className="text-xs text-secondary/70">Articles in database</div>
                    </div>
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <div className="text-sm text-secondary mb-2">Articles Today</div>
                        <div className="text-3xl font-bold text-purple-400 mb-1">{stats.articlesToday.toLocaleString()}</div>
                        <div className="text-xs text-secondary/70">Fetched in last 24h</div>
                    </div>
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <div className="text-sm text-secondary mb-2">Total Users</div>
                        <div className="text-3xl font-bold text-orange-400 mb-1">{stats.totalUsers.toLocaleString()}</div>
                        <div className="text-xs text-secondary/70">Registered users</div>
                    </div>
                </div>

                {/* Charts Row 1: Daily Articles + Source Health */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Daily Articles Trend */}
                    <div className="lg:col-span-2 glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Articles Published (Last 7 Days)</h2>
                        {chartStats?.dailyArticles && chartStats.dailyArticles.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={chartStats.dailyArticles}>
                                    <defs>
                                        <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                    <XAxis
                                        dataKey="date"
                                        stroke={chartText}
                                        fontSize={11}
                                        tickFormatter={(d: string | number) => new Date(String(d) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis stroke={chartText} fontSize={11} />
                                    <Tooltip
                                        contentStyle={{
                                            background: tooltipBg,
                                            border: `1px solid ${tooltipBorder}`,
                                            borderRadius: '8px',
                                            color: tooltipText,
                                            fontSize: '12px',
                                        }}
                                        labelFormatter={(d: any) => new Date(String(d) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorArticles)"
                                        name="Articles"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-secondary text-sm">
                                No data available for the past 7 days
                            </div>
                        )}
                    </div>

                    {/* Source Health Pie Chart */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Source Health</h2>
                        {healthData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={healthData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {healthData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={HEALTH_COLORS[index % HEALTH_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: tooltipBg,
                                            border: `1px solid ${tooltipBorder}`,
                                            borderRadius: '8px',
                                            color: tooltipText,
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value: string) => <span style={{ color: chartText, fontSize: '12px' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-secondary text-sm">
                                No sources configured
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts Row 2: Category Distribution + Top Articles */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Category Distribution */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Category Distribution</h2>
                        {categories.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={categories} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                                    <XAxis type="number" stroke={chartText} fontSize={11} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke={chartText}
                                        fontSize={11}
                                        width={90}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: tooltipBg,
                                            border: `1px solid ${tooltipBorder}`,
                                            borderRadius: '8px',
                                            color: tooltipText,
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Bar dataKey="articleCount" name="Articles" radius={[0, 4, 4, 0]}>
                                        {categories.map((_, index) => (
                                            <Cell key={`cat-${index}`} fill={categoryColors[index % categoryColors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-secondary text-sm">
                                No categories available
                            </div>
                        )}
                    </div>

                    {/* Top Articles by Views */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Top Articles by Views</h2>
                        {chartStats?.topArticles && chartStats.topArticles.length > 0 ? (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {chartStats.topArticles.map((article, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-accent w-6 text-center">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate" title={article.title}>
                                                {article.title}
                                            </p>
                                            <div className="w-full bg-white/5 rounded-full h-1.5 mt-1">
                                                <div
                                                    className="bg-accent h-1.5 rounded-full"
                                                    style={{
                                                        width: `${Math.min(100, (article.viewCount / (chartStats.topArticles[0]?.viewCount || 1)) * 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-secondary whitespace-nowrap">
                                            {article.viewCount} views
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-secondary text-sm">
                                No view data available
                            </div>
                        )}
                    </div>
                </div>

                {/* System Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

                    {/* Quick Actions */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <Link
                                to="/news-sources"
                                className="p-3 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                            >
                                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Manage Sources</div>
                                    <div className="text-xs text-secondary">Add, edit, or remove sources</div>
                                </div>
                            </Link>
                            <Link
                                to="/admin/fetch-logs"
                                className="p-3 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                            >
                                <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                                        <line x1="12" y1="20" x2="12" y2="10"></line>
                                        <line x1="18" y1="20" x2="18" y2="4"></line>
                                        <line x1="6" y1="20" x2="6" y2="16"></line>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Fetch Logs</div>
                                    <div className="text-xs text-secondary">View import history</div>
                                </div>
                            </Link>
                            <Link
                                to="/admin/categories"
                                className="p-3 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                            >
                                <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                        <rect x="3" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="3" width="7" height="7"></rect>
                                        <rect x="14" y="14" width="7" height="7"></rect>
                                        <rect x="3" y="14" width="7" height="7"></rect>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Categories</div>
                                    <div className="text-xs text-secondary">Manage categories</div>
                                </div>
                            </Link>

                            {/* System Tool Links */}
                            <div className="border-t border-glass-border my-2 pt-2">
                                <p className="text-[10px] text-secondary uppercase tracking-wider mb-2">System Tools (IP: 192.168.0.109)</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <a
                                        href="http://192.168.0.109:8080/swagger"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                                <polyline points="16 18 22 12 16 6"></polyline>
                                                <polyline points="8 6 2 12 8 18"></polyline>
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-white">API Swagger</div>
                                        </div>
                                    </a>
                                    <a
                                        href="http://192.168.0.109:8081"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-white">Seq Logs</div>
                                        </div>
                                    </a>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a
                                            href="http://192.168.0.109:3001"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                                                    <path d="M12 20v-6M6 20V10M18 20V4"></path>
                                                </svg>
                                            </div>
                                            <div className="text-xs font-medium text-white">Grafana</div>
                                        </a>
                                        <a
                                            href="http://192.168.0.109:9090"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-white/5 border border-glass-border rounded-lg hover:bg-white/10 transition-colors group flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                                </svg>
                                            </div>
                                            <div className="text-xs font-medium text-white">Prometheus</div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
