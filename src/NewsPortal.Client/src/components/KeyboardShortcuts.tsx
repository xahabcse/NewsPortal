import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SHORTCUTS = [
    { key: '/', descriptionKey: 'shortcuts.focusSearch' },
    { key: 's', descriptionKey: 'shortcuts.openSearch' },
    { key: 'h', descriptionKey: 'shortcuts.goHome' },
    { key: 't', descriptionKey: 'shortcuts.goTrending' },
    { key: 'b', descriptionKey: 'shortcuts.goBookmarks' },
    { key: 'j', descriptionKey: 'shortcuts.nextArticle' },
    { key: 'k', descriptionKey: 'shortcuts.prevArticle' },
    { key: 'o', descriptionKey: 'shortcuts.openArticle' },
    { key: 'Escape', descriptionKey: 'shortcuts.closeModal' },
    { key: '?', descriptionKey: 'shortcuts.showHelp' },
];

interface KeyboardShortcutsProps {
    onClose?: () => void;
}

export const KeyboardShortcutsModal = ({ onClose }: KeyboardShortcutsProps) => {
    const { t } = useTranslation();
    // Render the footer hint from i18n while keeping the <kbd> styling on the key token.
    // Interpolate a unique sentinel for {{key}} and split around it, so the surrounding
    // wording (incl. bn word order) comes entirely from the translation string.
    const KEY_TOKEN = '__KBD_KEY__';
    const [footerBefore, footerAfter] = t('shortcuts.footerHint', { key: KEY_TOKEN }).split(KEY_TOKEN);
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-glass-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">{t('shortcuts.title')}</h2>
                    <button onClick={onClose} className="text-secondary hover:text-white transition-colors" aria-label={t('common.close')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                    {SHORTCUTS.map(s => (
                        <div key={s.key} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-secondary">{t(s.descriptionKey)}</span>
                            <kbd className="px-2 py-1 bg-white/10 border border-glass-border rounded text-xs font-mono text-white">
                                {s.key === '/' ? '/' : s.key === 'Escape' ? 'Esc' : s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-glass-border bg-white/5 text-center">
                    <p className="text-xs text-secondary">{footerBefore}<kbd className="px-1.5 py-0.5 bg-white/10 border border-glass-border rounded text-[10px] font-mono">?</kbd>{footerAfter}</p>
                </div>
            </div>
        </div>
    );
};

const KeyboardShortcuts = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showHelp, setShowHelp] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
            if (e.key === 'Escape') {
                (target as HTMLInputElement).blur();
            }
            return;
        }

        switch (e.key) {
            case '/':
                e.preventDefault();
                const searchInput = document.querySelector('header input[type="text"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
                break;
            case 's':
                if (!e.ctrlKey && !e.metaKey) {
                    navigate('/search');
                }
                break;
            case 'h':
                navigate('/');
                break;
            case 't':
                navigate('/trending');
                break;
            case 'b':
                if (!e.ctrlKey && !e.metaKey) {
                    navigate('/bookmarks');
                }
                break;
            case 'j': {
                // Next article in list
                const cards = document.querySelectorAll('.grid .group');
                if (cards.length > 0) {
                    const next = Math.min(selectedIndex + 1, cards.length - 1);
                    setSelectedIndex(next);
                    cards[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (cards[next] as HTMLElement)?.focus();
                }
                break;
            }
            case 'k': {
                // Previous article in list
                const cardsUp = document.querySelectorAll('.grid .group');
                if (cardsUp.length > 0) {
                    const prev = Math.max(selectedIndex - 1, 0);
                    setSelectedIndex(prev);
                    cardsUp[prev]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    (cardsUp[prev] as HTMLElement)?.focus();
                }
                break;
            }
            case 'o':
            case 'Enter': {
                // Open selected article
                const allCards = document.querySelectorAll('.grid .group');
                if (selectedIndex >= 0 && selectedIndex < allCards.length) {
                    const link = allCards[selectedIndex]?.querySelector('a[href*="/news/"]') as HTMLAnchorElement;
                    const button = allCards[selectedIndex]?.querySelector('button') as HTMLButtonElement;
                    if (link) {
                        link.click();
                    } else if (button) {
                        button.click();
                    }
                }
                break;
            }
            case 'Escape':
                setShowHelp(false);
                // Close any open popups by pressing escape (handled by other components)
                break;
            case '?':
                e.preventDefault();
                setShowHelp(prev => !prev);
                break;
        }
    }, [navigate, selectedIndex]);

    // Reset selected index on page change
    useEffect(() => {
        setSelectedIndex(-1);
    }, [location.pathname]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!showHelp) return null;

    return <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />;
};

export default KeyboardShortcuts;
