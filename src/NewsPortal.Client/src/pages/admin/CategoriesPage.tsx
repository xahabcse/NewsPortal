import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import { CategoryService, type Category, type CreateCategoryDto } from '../../services/CategoryService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CategoriesPage = () => {
    const { role } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CreateCategoryDto>({
        name: '',
        nameBn: '',
        description: '',
        icon: '',
        color: '#8b5cf6',
        sortOrder: 0
    });
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = role === 'Admin' || role === 'SuperAdmin';

    useEffect(() => {
        if (isAdmin) {
            fetchCategories();
        }
    }, [isAdmin]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await CategoryService.getAll();
            setCategories(data);
        } catch (error) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                nameBn: category.nameBn || '',
                description: category.description || '',
                icon: category.icon || '',
                color: category.color || '#8b5cf6',
                sortOrder: category.sortOrder || 0
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                nameBn: '',
                description: '',
                icon: '',
                color: '#8b5cf6',
                sortOrder: categories.length
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            nameBn: '',
            description: '',
            icon: '',
            color: '#8b5cf6',
            sortOrder: 0
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingCategory) {
                await CategoryService.update(editingCategory.id, formData);
                toast.success('Category updated successfully');
            } else {
                await CategoryService.create(formData);
                toast.success('Category created successfully');
            }
            closeModal();
            fetchCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await CategoryService.delete(id);
            toast.success('Category deleted successfully');
            fetchCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-8">
                <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-secondary text-sm mb-6">Only administrators can manage categories.</p>
                    <Link to="/admin/dashboard" className="text-accent hover:text-accent/80 transition-colors">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <SEO
                title="Category Management"
                description="Manage news categories for the NewsPortal."
            />
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Category Management</h1>
                        <p className="text-secondary text-sm">Create, edit, and organize news categories</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition-colors"
                    >
                        + Add Category
                    </button>
                </div>

                {/* Categories Table */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center p-12 bg-white/5 rounded-2xl border border-dashed border-glass-border">
                        <p className="text-secondary">No categories found. Create your first category!</p>
                    </div>
                ) : (
                    <div className="glass-morphism border border-glass-border rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                        Icon
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                        Color
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                        Articles
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                        Order
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-secondary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-glass-border">
                                {categories.map((category) => (
                                    <tr key={category.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-white">{category.name}</div>
                                                {category.nameBn && (
                                                    <div className="text-xs text-secondary">{category.nameBn}</div>
                                                )}
                                                {category.description && (
                                                    <div className="text-xs text-secondary mt-1">{category.description}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {category.icon ? (
                                                <span className="text-xl">{category.icon}</span>
                                            ) : (
                                                <span className="text-xs text-secondary">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-4 h-4 rounded"
                                                    style={{ backgroundColor: category.color }}
                                                ></div>
                                                <span className="text-xs text-secondary">{category.color}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-white">{category.articleCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-secondary">{category.sortOrder ?? '—'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(category)}
                                                    className="px-3 py-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.id, category.name)}
                                                    className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingCategory ? 'Edit Category' : 'Add Category'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-secondary hover:text-white transition-colors text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="form-input"
                                    placeholder="e.g., Technology"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Name (Bangla)</label>
                                <input
                                    type="text"
                                    value={formData.nameBn}
                                    onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                                    className="form-input"
                                    placeholder="e.g., প্রযুক্তি"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="form-input"
                                    rows={3}
                                    placeholder="Category description..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-secondary mb-1">Icon</label>
                                    <input
                                        type="text"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="form-input"
                                        placeholder="📱"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-secondary mb-1">Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-10 h-10 rounded cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="form-input flex-1"
                                            placeholder="#8b5cf6"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Sort Order</label>
                                <input
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                    className="form-input"
                                    min={0}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-secondary hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default CategoriesPage;
