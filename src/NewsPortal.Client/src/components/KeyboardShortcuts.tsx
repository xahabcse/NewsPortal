import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SHORTCUTS = [
    { key: '/', description: 'Focus search bar' },
    { key: 's', description: 'Open search page' },
    { key: 'h', description: 'Go to home' },
    { key: 't', description: 'Go to trending' },
    { key: 'b', description: 'Go to bookmarks' },
    { key: 'j', description: 'Next article' },
    { key: 'k', description: 'Previous article' },
    { key: 'o', description: 'Open selected article' },
    { key: 'Escape', description: 'Close modal / go back' },
    { key: '?', description: 'Show this help' },
];

interface KeyboardShortcutsProps {
    onClose?: () => void;
}

export const KeyboardShortcutsModal = ({ onClose }: KeyboardShortcutsProps) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-glass-border flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                    <button onClick={onClose} className="text-secondary hover:text-white transition-colors" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                    {SHORTCUTS.map(s => (
                        <div key={s.key} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-secondary">{s.description}</span>
                            <kbd className="px-2 py-1 bg-white/10 border border-glass-border rounded text-xs font-mono text-white">
                                {s.key === '/' ? '/' : s.key === 'Escape' ? 'Esc' : s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-glass-border bg-white/5 text-center">
                    <p className="text-xs text-secondary">Press <kbd className="px-1.5 py-0.5 bg-white/10 border border-glass-border rounded text-[10px] font-mono">?</kbd> anytime to show this help</p>
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
