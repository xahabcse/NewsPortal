import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { axiosInstance } from '../../services/axiosInstance';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell,
    BarChart, Bar,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface Overview {
    totalArticles: number;
    totalComments: number;
    totalUsers: number;
    totalSources: number;
    articlesToday: number;
    commentsToday: number;
    totalViews: number;
}

interface DailyData {
    date: string;
    count: number;
    views: number;
}

interface CategoryPerf {
    name: string;
    articles: number;
    views: number;
    color: string;
}

interface SourcePerf {
    name: string;
    articles: number;
    views: number;
}

interface TopArticle {
    title: string;
    views: number;
    slug: string;
    source: string;
    category: string;
}

interface HourlyData {
    hour: number;
    comments: number;
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#34d399', '#fbbf24', '#f87171', '#38bdf8', '#fb923c', '#a3e635'];

const ContentAnalyticsPage = () => {
    const { role } = useAuth();
    const navigate = useNavigate();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [daily, setDaily] = useState<DailyData[]>([]);
    const [categories, setCategories] = useState<CategoryPerf[]>([]);
    const [sources, setSources] = useState<SourcePerf[]>([]);
    const [topArticles, setTopArticles] = useState<TopArticle[]>([]);
    const [hourly, setHourly] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (role !== 'Admin' && role !== 'SuperAdmin') {
            navigate('/');
            return;
        }

        const fetchAll = async () => {
            try {
                const [ovRes, dailyRes, catRes, srcRes, topRes, hourlyRes] = await Promise.all([
                    axiosInstance.get('/analytics/overview'),
                    axiosInstance.get('/analytics/articles/daily?days=30'),
                    axiosInstance.get('/analytics/categories/performance'),
                    axiosInstance.get('/analytics/sources/performance'),
                    axiosInstance.get('/analytics/articles/top?count=10'),
                    axiosInstance.get('/analytics/engagement/hourly'),
                ]);
                setOverview(ovRes.data);
                setDaily(dailyRes.data);
                setCategories(catRes.data);
                setSources(srcRes.data);
                setTopArticles(topRes.data);
                setHourly(hourlyRes.data);
            } catch {
                // Silently handle errors
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [role, navigate]);

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Analytics</h1>
                    <p className="text-sm text-secondary mt-1">Publisher-grade insights into portal performance</p>
                </div>
            </div>

            {/* Overview Cards */}
            {overview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Articles', value: overview.totalArticles.toLocaleString(), sub: `+${overview.articlesToday} today`, color: 'text-accent' },
                        { label: 'Total Views', value: overview.totalViews.toLocaleString(), sub: 'All time', color: 'text-purple-400' },
                        { label: 'Comments', value: overview.totalComments.toLocaleString(), sub: `+${overview.commentsToday} today`, color: 'text-green-400' },
                        { label: 'Users', value: overview.totalUsers.toLocaleString(), sub: `${overview.totalSources} sources`, color: 'text-amber-400' },
                    ].map((card, i) => (
                        <div key={i} className="bg-white/5 border border-glass-border rounded-xl p-4">
                            <p className="text-[10px] text-secondary uppercase tracking-wider">{card.label}</p>
                            <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value}</p>
                            <p className="text-[10px] text-secondary mt-1">{card.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Daily Articles Trend */}
            <div className="bg-white/5 border border-glass-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Article Ingestion (Last 30 Days)</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={daily}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{ background: 'rgba(22,23,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#colorCount)" strokeWidth={2} name="Articles" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Category + Source Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="bg-white/5 border border-glass-border rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Category Distribution</h2>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={categories}
                                dataKey="articles"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={false}
                                labelLine={false}
                            >
                                {categories.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'rgba(22,23,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Source Performance */}
                <div className="bg-white/5 border border-glass-border rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4">Source Performance</h2>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={sources.slice(0, 8)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={120} />
                            <Tooltip
                                contentStyle={{ background: 'rgba(22,23,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            <Legend />
                            <Bar dataKey="articles" fill="#6366f1" name="Articles" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Articles Table */}
            <div className="bg-white/5 border border-glass-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Top Performing Articles</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-secondary text-left border-b border-glass-border">
                                <th className="pb-3 font-medium">#</th>
                                <th className="pb-3 font-medium">Article</th>
                                <th className="pb-3 font-medium">Source</th>
                                <th className="pb-3 font-medium">Category</th>
                                <th className="pb-3 font-medium text-right">Views</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topArticles.map((article, i) => (
                                <tr key={i} className="border-b border-glass-border/50 hover:bg-white/5 transition-colors">
                                    <td className="py-3 text-secondary">{i + 1}</td>
                                    <td className="py-3">
                                        <a href={`/news/${article.slug}`} className="text-white hover:text-accent transition-colors">
                                            {article.title}
                                        </a>
                                    </td>
                                    <td className="py-3 text-secondary">{article.source}</td>
                                    <td className="py-3">
                                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] rounded-full">{article.category}</span>
                                    </td>
                                    <td className="py-3 text-right text-white font-medium">{article.views.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hourly Engagement Heatmap */}
            <div className="bg-white/5 border border-glass-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Comment Activity by Hour (Last 7 Days)</h2>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hourly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                            dataKey="hour"
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(h: any) => `${h}:00`}
                        />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{ background: 'rgba(22,23,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            labelFormatter={(h: any) => `${h}:00 - ${h}:59`}
                        />
                        <Bar dataKey="comments" fill="#34d399" name="Comments" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ContentAnalyticsPage;
