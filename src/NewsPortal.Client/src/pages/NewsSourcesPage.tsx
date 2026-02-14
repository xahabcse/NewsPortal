import { useState, useEffect } from 'react';
import type { NewsSource, CreateNewsSourceDto } from '../types/NewsSource';
import { NewsSourceService, NEWS_SOURCE_API_URL } from '../services/NewsSourceService';
import axios from 'axios';

const NewsSourcesPage = () => {
    const [sources, setSources] = useState<NewsSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
    const [formData, setFormData] = useState<CreateNewsSourceDto>({
        name: '',
        baseUrl: '',
        logoUrl: '',
        fetchMethod: 0, // RSS
        rssFeedUrl: '',
        apiEndpoint: '',
        apiKey: '',
        fetchIntervalMinutes: 30
    });

    useEffect(() => {
        loadSources();
    }, []);

    const loadSources = async () => {
        try {
            setLoading(true);
            const data = await NewsSourceService.getAll();
            setSources(data);
        } catch (error) {
            console.error('Failed to load sources', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this news source?')) return;
        try {
            await NewsSourceService.delete(id);
            loadSources();
        } catch (error) {
            console.error('Failed to delete source', error);
            alert('Failed to delete source');
        }
    };

    const handleEdit = (source: NewsSource) => {
        setEditingSource(source);
        setFormData({
            name: source.name,
            baseUrl: source.baseUrl,
            logoUrl: source.logoUrl || '',
            fetchMethod: source.fetchMethod,
            rssFeedUrl: source.rssFeedUrl || '',
            apiEndpoint: source.apiEndpoint || '',
            apiKey: source.apiKey || '',
            fetchIntervalMinutes: source.fetchIntervalMinutes
        });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingSource(null);
        setFormData({
            name: '',
            baseUrl: '',
            logoUrl: '',
            fetchMethod: 0,
            rssFeedUrl: '',
            apiEndpoint: '',
            apiKey: '',
            fetchIntervalMinutes: 30
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSource) {
                await NewsSourceService.update(editingSource.id, formData);
            } else {
                await NewsSourceService.create(formData);
            }
            setIsModalOpen(false);
            loadSources();
        } catch (error) {
            console.error('Failed to save source', error);
            alert('Failed to save source');
        }
    };

    const handleFetch = async (sourceId: number) => {
        try {
            // Call the fetch endpoint for this specific source
            await axios.post(`${NEWS_SOURCE_API_URL}/newssources/${sourceId}/fetch`);
            alert('News fetch started! Check Fetch Logs for progress.');
        } catch (error) {
            console.error('Failed to trigger fetch', error);
            alert('Failed to trigger news fetch');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'fetchMethod' || name === 'fetchIntervalMinutes' ? Number(value) : value
        }));
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">News Channels</h1>
                    <p className="text-secondary text-sm">Manage source domains for news aggregation</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <i className="bi bi-plus-lg"></i>
                    Add Channel
                </button>
            </div>

            {loading ? (
                <div className="text-white text-center">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sources.map(source => (
                        <div key={source.id} className="glass-card hover:bg-white/5 transition-all p-6 rounded-xl border border-glass-border flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                {source.logoUrl ? (
                                    <img src={source.logoUrl} alt={source.name} className="w-10 h-10 rounded-lg object-cover bg-white" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-glass-surface flex items-center justify-center text-xl font-bold text-white">
                                        {source.name[0]}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-white">{source.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${source.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {source.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-secondary flex-grow">
                                <div className="flex justify-between">
                                    <span>Method:</span>
                                    <span className="text-white">{source.fetchMethod === 0 ? 'RSS Feed' : source.fetchMethod === 1 ? 'API' : 'Scrape'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Update Interval:</span>
                                    <span className="text-white">{source.fetchIntervalMinutes} mins</span>
                                </div>
                                <div className="truncate">
                                    <a href={source.baseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">
                                        {source.baseUrl}
                                    </a>
                                </div>
                            </div>
                            <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-glass-border">
                                <button
                                    onClick={() => handleEdit(source)}
                                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-2"
                                    title="Edit Channel"
                                >
                                    <i className="bi bi-pencil"></i>
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(source.id)}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                                    title="Delete Channel"
                                >
                                    <i className="bi bi-trash"></i>
                                    Delete
                                </button>
                                <button
                                    onClick={() => handleFetch(source.id)}
                                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center gap-2"
                                    title="Fetch News Now"
                                >
                                    <i className="bi bi-download"></i>
                                    Fetch
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-glass-surface border border-glass-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {editingSource ? 'Edit News Channel' : 'Add New Channel'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-secondary mb-1">Base URL</label>
                                <input
                                    type="url"
                                    name="baseUrl"
                                    value={formData.baseUrl}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-secondary mb-1">Logo URL</label>
                                <input
                                    type="url"
                                    name="logoUrl"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-secondary mb-1">Fetch Method</label>
                                <select
                                    name="fetchMethod"
                                    value={formData.fetchMethod}
                                    onChange={handleChange}
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                >
                                    <option value={0}>RSS Feed</option>
                                    <option value={1}>API</option>
                                    <option value={2}>Scraping</option>
                                </select>
                            </div>
                            {formData.fetchMethod === 0 && (
                                <div>
                                    <label className="block text-sm text-secondary mb-1">RSS Feed URL</label>
                                    <input
                                        type="url"
                                        name="rssFeedUrl"
                                        value={formData.rssFeedUrl}
                                        onChange={handleChange}
                                        className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                        required
                                    />
                                </div>
                            )}
                            {formData.fetchMethod === 1 && (
                                <>
                                    <div>
                                        <label className="block text-sm text-secondary mb-1">API Endpoint</label>
                                        <input
                                            type="url"
                                            name="apiEndpoint"
                                            value={formData.apiEndpoint}
                                            onChange={handleChange}
                                            className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-secondary mb-1">API Key (Optional)</label>
                                        <input
                                            type="text"
                                            name="apiKey"
                                            value={formData.apiKey}
                                            onChange={handleChange}
                                            className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm text-secondary mb-1">Fetch Interval (Minutes)</label>
                                <input
                                    type="number"
                                    name="fetchIntervalMinutes"
                                    value={formData.fetchIntervalMinutes}
                                    onChange={handleChange}
                                    min="5"
                                    className="w-full bg-black/20 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-secondary hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    {editingSource ? 'Update Channel' : 'Add Channel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewsSourcesPage;
