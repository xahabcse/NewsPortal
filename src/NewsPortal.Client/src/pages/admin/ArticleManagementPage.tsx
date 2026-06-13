import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../../services/axiosInstance';
import { newsApi, type Category } from '../../services/api';
import { NewsSourceService } from '../../services/NewsSourceService';
import type { NewsSource } from '../../types/NewsSource';
import toast from 'react-hot-toast';

interface AdminArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    author: string | null;
    publishedAt: string | null;
    viewCount: number;
    isFeatured: boolean;
    isActive: boolean;
    sourceName: string | null;
    categoryName: string | null;
    categoryId: number | null;
    sourceId: number;
}

interface ArticleForm {
    title: string;
    summary: string;
    content: string;
    author: string;
    sourceUrl: string;
    sourceId: number | '';
    categoryId: number | '' | null;
    isFeatured: boolean;
}

const emptyForm: ArticleForm = { title: '', summary: '', content: '', author: '', sourceUrl: '', sourceId: '', categoryId: '', isFeatured: false };

const ArticleManagementPage = () => {
    const [articles, setArticles] = useState<AdminArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [sources, setSources] = useState<NewsSource[]>([]);

    // Editor state
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<ArticleForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        newsApi.getCategories().then(setCategories).catch(() => {});
        NewsSourceService.getAll().then(s => setSources(s.filter(x => x.isActive))).catch(() => {});
    }, []);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: '15' });
            if (search) params.append('search', search);
            if (statusFilter) params.append('status', statusFilter);
            const res = await axiosInstance.get(`/admin/articles?${params}`);
            setArticles(res.data.items);
            setTotalPages(res.data.totalPages);
            setTotalCount(res.data.totalCount);
        } catch {
            // Handled by interceptor
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleToggleFeatured = async (id: number) => {
        try {
            await axiosInstance.put(`/admin/articles/${id}/feature`);
            fetchArticles();
        } catch { /* interceptor */ }
    };

    const handleDelete = async (id: number, title: string) => {
        if (!confirm(`Hide article "${title}"?`)) return;
        try {
            await axiosInstance.delete(`/admin/articles/${id}`);
            toast.success('Article hidden');
            fetchArticles();
        } catch { /* interceptor */ }
    };

    const handleEdit = async (id: number) => {
        try {
            const res = await axiosInstance.get(`/admin/articles/${id}`);
            const a = res.data;
            setForm({
                title: a.title || '',
                summary: a.summary || '',
                content: a.content || '',
                author: a.author || '',
                sourceUrl: a.sourceUrl || '',
                sourceId: a.sourceId || '',
                categoryId: a.categoryId || '',
                isFeatured: a.isFeatured,
            });
            setEditingId(id);
            setShowEditor(true);
        } catch { /* interceptor */ }
    };

    const handleCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { toast.error('Title is required'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await axiosInstance.put(`/admin/articles/${editingId}`, {
                    title: form.title,
                    summary: form.summary,
                    content: form.content,
                    author: form.author,
                    categoryId: form.categoryId || null,
                    isFeatured: form.isFeatured,
                });
                toast.success('Article updated');
            } else {
                if (!form.sourceId) { toast.error('Source is required'); setSaving(false); return; }
                await axiosInstance.post('/admin/articles', {
                    title: form.title,
                    summary: form.summary,
                    content: form.content,
                    author: form.author,
                    sourceUrl: form.sourceUrl,
                    sourceId: form.sourceId,
                    categoryId: form.categoryId || null,
                    isFeatured: form.isFeatured,
                });
                toast.success('Article created');
            }
            setShowEditor(false);
            fetchArticles();
        } catch { /* interceptor */ } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Article Management</h1>
                    <p className="text-sm text-secondary">{totalCount} articles total</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={async () => {
                            try {
                                const res = await axiosInstance.post('/adminarticles/auto-categorize');
                                toast.success(`Categorized ${res.data.updated} of ${res.data.processed} articles`);
                                fetchArticles();
                            } catch { toast.error('Bulk categorize failed'); }
                        }}
                        className="btn-secondary flex items-center gap-2"
                    >
                        Auto-Categorize
                    </button>
                    <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Article
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6 flex-wrap">
                <input
                    type="text"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search articles..."
                    className="form-input max-w-xs"
                />
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="form-input max-w-[160px]"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="featured">Featured</option>
                    <option value="hidden">Hidden</option>
                </select>
            </div>

            {/* Article List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            ) : articles.length === 0 ? (
                <div className="bg-white/5 border border-glass-border rounded-xl px-4 py-10 text-center text-secondary text-sm">No articles found</div>
            ) : (
                <>
                    {/* Mobile: stacked cards (avoids the cramped/truncated table on small screens) */}
                    <div className="space-y-3 md:hidden">
                        {articles.map(a => (
                            <div key={a.id} className="bg-white/5 border border-glass-border rounded-xl p-4">
                                <div className="flex items-start gap-2">
                                    {a.isFeatured && <span className="w-2 h-2 mt-1.5 rounded-full bg-accent shrink-0" title="Featured"></span>}
                                    {!a.isActive && <span className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" title="Hidden"></span>}
                                    <p className="text-sm font-medium text-white line-clamp-2 min-w-0">{a.title}</p>
                                </div>
                                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-secondary mt-2">
                                    <span>{a.sourceName}</span>
                                    <span aria-hidden>·</span>
                                    <span>{a.categoryName || 'Uncategorized'}</span>
                                    <span aria-hidden>·</span>
                                    <span>{a.viewCount.toLocaleString()} views</span>
                                    {a.publishedAt && <><span aria-hidden>·</span><span>{new Date(a.publishedAt).toLocaleDateString()}</span></>}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button onClick={() => handleEdit(a.id)} className="bulk-btn flex-1 min-h-[36px]" title="Edit">Edit</button>
                                    <button onClick={() => handleToggleFeatured(a.id)} className={`bulk-btn flex-1 min-h-[36px] ${a.isFeatured ? 'text-accent' : ''}`} title="Toggle featured">
                                        {a.isFeatured ? 'Unfeature' : 'Feature'}
                                    </button>
                                    <button onClick={() => handleDelete(a.id, a.title)} className="bulk-btn flex-1 min-h-[36px] text-red-400" title="Hide">Hide</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden md:block bg-white/5 border border-glass-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-glass-border text-left">
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase">Title</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase">Category</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase hidden lg:table-cell">Views</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase hidden lg:table-cell">Date</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-secondary uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articles.map(a => (
                                    <tr key={a.id} className="border-b border-glass-border/50 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {a.isFeatured && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" title="Featured"></span>}
                                                {!a.isActive && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Hidden"></span>}
                                                <span className="text-sm text-white line-clamp-1">{a.title}</span>
                                            </div>
                                            <span className="text-[10px] text-secondary">{a.sourceName}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-secondary">{a.categoryName || '-'}</td>
                                        <td className="px-4 py-3 text-xs text-secondary hidden lg:table-cell">{a.viewCount.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-xs text-secondary hidden lg:table-cell">
                                            {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleEdit(a.id)} className="bulk-btn" title="Edit">Edit</button>
                                                <button onClick={() => handleToggleFeatured(a.id)} className={`bulk-btn ${a.isFeatured ? 'text-accent' : ''}`} title="Toggle featured">
                                                    {a.isFeatured ? 'Unfeature' : 'Feature'}
                                                </button>
                                                <button onClick={() => handleDelete(a.id, a.title)} className="bulk-btn text-red-400" title="Hide">Hide</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary disabled:opacity-50">Previous</button>
                    <span className="text-sm text-secondary">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary disabled:opacity-50">Next</button>
                </div>
            )}

            {/* Article Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditor(false)}>
                    <div className="w-full max-w-2xl bg-glass-surface border border-glass-border rounded-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-glass-border flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Article' : 'Create Article'}</h2>
                            <button onClick={() => setShowEditor(false)} className="text-secondary hover:text-white transition-colors" aria-label="Close">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="p-5 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs text-secondary mb-1">Title *</label>
                                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input" placeholder="Article title" />
                            </div>
                            <div>
                                <label className="block text-xs text-secondary mb-1">Summary</label>
                                <textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className="form-input resize-none" rows={3} placeholder="Brief summary" />
                            </div>
                            <div>
                                <label className="block text-xs text-secondary mb-1">Content (HTML)</label>
                                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="form-input resize-none font-mono text-xs" rows={8} placeholder="<p>Article content...</p>" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-secondary mb-1">Author</label>
                                    <input value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="form-input" placeholder="Author name" />
                                </div>
                                <div>
                                    <label className="block text-xs text-secondary mb-1">Source URL</label>
                                    <input value={form.sourceUrl} onChange={e => setForm({...form, sourceUrl: e.target.value})} className="form-input" placeholder="https://..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-secondary mb-1">Source *</label>
                                    <select value={form.sourceId} onChange={e => setForm({...form, sourceId: e.target.value ? Number(e.target.value) : ''})} className="form-input">
                                        <option value="">Select source</option>
                                        {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-secondary mb-1">Category</label>
                                    <select value={form.categoryId ?? ''} onChange={e => setForm({...form, categoryId: e.target.value ? Number(e.target.value) : null})} className="form-input">
                                        <option value="">No category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({...form, isFeatured: e.target.checked})} className="accent-accent" />
                                <span className="text-sm text-white">Featured article</span>
                            </label>
                        </div>
                        <div className="p-4 border-t border-glass-border bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setShowEditor(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleManagementPage;
