import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { newsApi, type Category } from '../services/api';

const STORAGE_KEY = 'newsportal-notification-prefs';

export interface NotificationPrefs {
    enabled: boolean;
    breakingNews: boolean;
    categories: string[]; // category slugs that are enabled
    sound: boolean;
}

const defaultPrefs: NotificationPrefs = {
    enabled: true,
    breakingNews: true,
    categories: [], // empty = all categories
    sound: false,
};

export function getNotificationPrefs(): NotificationPrefs {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return { ...defaultPrefs, ...JSON.parse(raw) };
        }
    } catch {
        // ignore
    }
    return defaultPrefs;
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function shouldShowNotification(type: 'article' | 'breaking', category?: string): boolean {
    const prefs = getNotificationPrefs();
    if (!prefs.enabled) return false;
    if (type === 'breaking') return prefs.breakingNews;
    // If no categories selected, show all
    if (prefs.categories.length === 0) return true;
    if (!category) return true;
    const slug = category.toLowerCase().replace(/\s+/g, '-');
    return prefs.categories.includes(slug);
}

interface NotificationPreferencesProps {
    onClose: () => void;
}

const NotificationPreferences = ({ onClose }: NotificationPreferencesProps) => {
    const { t } = useTranslation();
    const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        newsApi.getCategories().then(cats => {
            setCategories(cats);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const updatePrefs = (partial: Partial<NotificationPrefs>) => {
        const updated = { ...prefs, ...partial };
        setPrefs(updated);
        saveNotificationPrefs(updated);
    };

    const toggleCategory = (slug: string) => {
        const current = prefs.categories;
        const updated = current.includes(slug)
            ? current.filter(s => s !== slug)
            : [...current, slug];
        updatePrefs({ categories: updated });
    };

    const selectAllCategories = () => {
        updatePrefs({ categories: [] }); // empty = all
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl overflow-hidden">
                <div className="p-5 border-b border-glass-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">{t('notifications.title')}</h2>
                        <p className="text-xs text-secondary mt-0.5">{t('notifications.subtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-secondary hover:text-white transition-colors p-1"
                        aria-label={t('notifications.closeAria')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white">{t('notifications.enable')}</p>
                            <p className="text-xs text-secondary">{t('notifications.enableDesc')}</p>
                        </div>
                        <button
                            onClick={() => updatePrefs({ enabled: !prefs.enabled })}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                prefs.enabled ? 'bg-accent' : 'bg-white/20'
                            }`}
                            role="switch"
                            aria-checked={prefs.enabled}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                                prefs.enabled ? 'translate-x-5' : ''
                            }`} />
                        </button>
                    </div>

                    {prefs.enabled && (
                        <>
                            {/* Breaking News */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        {t('notifications.breakingNews')}
                                    </p>
                                    <p className="text-xs text-secondary">{t('notifications.breakingNewsDesc')}</p>
                                </div>
                                <button
                                    onClick={() => updatePrefs({ breakingNews: !prefs.breakingNews })}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${
                                        prefs.breakingNews ? 'bg-accent' : 'bg-white/20'
                                    }`}
                                    role="switch"
                                    aria-checked={prefs.breakingNews}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                                        prefs.breakingNews ? 'translate-x-5' : ''
                                    }`} />
                                </button>
                            </div>

                            {/* Sound */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">{t('notifications.sound')}</p>
                                    <p className="text-xs text-secondary">{t('notifications.soundDesc')}</p>
                                </div>
                                <button
                                    onClick={() => updatePrefs({ sound: !prefs.sound })}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${
                                        prefs.sound ? 'bg-accent' : 'bg-white/20'
                                    }`}
                                    role="switch"
                                    aria-checked={prefs.sound}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                                        prefs.sound ? 'translate-x-5' : ''
                                    }`} />
                                </button>
                            </div>

                            {/* Category Filters */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-medium text-white">{t('notifications.categoryFilters')}</p>
                                        <p className="text-xs text-secondary">
                                            {prefs.categories.length === 0
                                                ? t('notifications.receivingAll')
                                                : t('notifications.selectedCount', { count: prefs.categories.length })
                                            }
                                        </p>
                                    </div>
                                    {prefs.categories.length > 0 && (
                                        <button
                                            onClick={selectAllCategories}
                                            className="text-xs text-accent hover:text-accent/80 transition-colors"
                                        >
                                            {t('notifications.selectAll')}
                                        </button>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {categories.map(cat => {
                                            const isActive = prefs.categories.length === 0 || prefs.categories.includes(cat.slug);
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        if (prefs.categories.length === 0) {
                                                            // Switching from "all" to specific - select all except this one
                                                            const allSlugs = categories
                                                                .map(c => c.slug)
                                                                .filter(s => s !== cat.slug);
                                                            updatePrefs({ categories: allSlugs });
                                                        } else {
                                                            toggleCategory(cat.slug);
                                                        }
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                                                        isActive
                                                            ? 'bg-accent/15 border-accent/40 text-white'
                                                            : 'bg-white/5 border-glass-border text-secondary hover:bg-white/10'
                                                    }`}
                                                >
                                                    {cat.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-glass-border bg-white/5">
                    <button
                        onClick={onClose}
                        className="w-full btn-primary text-sm"
                    >
                        {t('notifications.done')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationPreferences;
