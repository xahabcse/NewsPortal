import { useState, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { BookmarkService } from '../services/BookmarkService';

interface BookmarkButtonProps {
    articleId: number;
    /** 'button' = labelled pill (article page); 'icon' = round icon (cards). */
    variant?: 'button' | 'icon';
    /**
     * Query the server for the current bookmark state on mount (one request).
     * Enable on single-article surfaces (article detail); leave OFF on card grids
     * so a page of N cards doesn't fire N check requests.
     */
    checkOnMount?: boolean;
    className?: string;
}

const BookmarkGlyph: FC<{ filled: boolean; size?: number }> = ({ filled, size = 16 }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
);

/**
 * Self-contained Save/Bookmark toggle backed by BookmarkService. Handles auth
 * (prompts sign-in when logged out), optimistic UI with revert on failure, and a
 * confirmation toast.
 */
const BookmarkButton: FC<BookmarkButtonProps> = ({
    articleId,
    variant = 'button',
    checkOnMount = true,
    className = '',
}) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [bookmarked, setBookmarked] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!checkOnMount || !isAuthenticated || !articleId) return;
        let active = true;
        BookmarkService.checkBookmark(articleId)
            .then((r) => { if (active) setBookmarked(r.isBookmarked); })
            .catch(() => { /* non-fatal: keep default state */ });
        return () => { active = false; };
    }, [articleId, checkOnMount, isAuthenticated]);

    const toggle = async (e: React.MouseEvent) => {
        // Cards wrap this in a clickable element — never let it trigger navigation.
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            toast.error(t('article.signInToSave'));
            navigate('/login');
            return;
        }
        if (busy) return;

        const next = !bookmarked;
        setBookmarked(next); // optimistic
        setBusy(true);
        try {
            if (next) {
                await BookmarkService.addBookmark(articleId);
                toast.success(t('article.savedToBookmarks'));
            } else {
                await BookmarkService.removeBookmark(articleId);
                toast.success(t('article.removedFromBookmarks'));
            }
        } catch {
            setBookmarked(!next); // revert
            toast.error(t('article.bookmarkUpdateFailed'));
        } finally {
            setBusy(false);
        }
    };

    const label = bookmarked ? t('article.removeBookmark') : t('article.saveArticle');

    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={toggle}
                disabled={busy}
                title={label}
                aria-label={label}
                aria-pressed={bookmarked}
                className={`w-7 h-7 md:w-8 md:h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors disabled:opacity-60 ${bookmarked ? 'text-accent' : 'text-white'} ${className}`}
            >
                <BookmarkGlyph filled={bookmarked} size={14} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={busy}
            title={label}
            aria-label={label}
            aria-pressed={bookmarked}
            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm transition-all border disabled:opacity-60 ${
                bookmarked
                    ? 'bg-accent/20 border-accent/40 text-white'
                    : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
            } ${className}`}
        >
            <BookmarkGlyph filled={bookmarked} size={14} />
            {bookmarked ? t('article.saved') : t('common.save')}
        </button>
    );
};

export default BookmarkButton;
