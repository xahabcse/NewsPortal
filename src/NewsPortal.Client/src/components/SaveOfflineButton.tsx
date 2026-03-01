import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const DB_NAME = 'newsportal-offline';
const STORE_NAME = 'articles';

interface OfflineArticle {
    slug: string;
    title: string;
    content: string | null;
    summary: string | null;
    imageUrl: string | null;
    sourceName: string;
    categoryName: string | null;
    publishedAt: string;
    savedAt: string;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveArticle(article: OfflineArticle): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(article);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function removeArticle(slug: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(slug);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function isArticleSaved(slug: string): Promise<boolean> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(slug);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getOfflineArticles(): Promise<OfflineArticle[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

interface SaveOfflineButtonProps {
    slug: string;
    title: string;
    content: string | null;
    summary: string | null;
    imageUrl: string | null;
    sourceName: string;
    categoryName: string | null;
    publishedAt: string;
}

const SaveOfflineButton = ({ slug, title, content, summary, imageUrl, sourceName, categoryName, publishedAt }: SaveOfflineButtonProps) => {
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        isArticleSaved(slug).then(setSaved).catch(() => {});
    }, [slug]);

    const handleToggle = async () => {
        setLoading(true);
        try {
            if (saved) {
                await removeArticle(slug);
                setSaved(false);
                toast.success('Removed from offline reading');
            } else {
                await saveArticle({
                    slug,
                    title,
                    content,
                    summary,
                    imageUrl,
                    sourceName,
                    categoryName,
                    publishedAt,
                    savedAt: new Date().toISOString(),
                });
                setSaved(true);
                toast.success('Saved for offline reading');
            }
        } catch {
            toast.error('Failed to update offline storage');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border ${
                saved
                    ? 'bg-green-500/15 border-green-500/40 text-green-400'
                    : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
            } disabled:opacity-50`}
            title={saved ? 'Remove from offline' : 'Save for offline reading'}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {saved ? (
                    <>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </>
                ) : (
                    <>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </>
                )}
            </svg>
            {saved ? 'Saved Offline' : 'Save Offline'}
        </button>
    );
};

export default SaveOfflineButton;
