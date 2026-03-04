import { useState } from 'react';
import { axiosInstance } from '../services/axiosInstance';
import toast from 'react-hot-toast';

interface TranslateButtonProps {
    articleId: number;
    originalTitle: string;
    originalSummary: string | null;
}

const LANGUAGES = [
    { code: 'bn', label: 'Bengali', flag: '\uD83C\uDDE7\uD83C\uDDE9' },
    { code: 'en', label: 'English', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
    { code: 'hi', label: 'Hindi', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
    { code: 'es', label: 'Spanish', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
    { code: 'fr', label: 'French', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
    { code: 'ar', label: 'Arabic', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
];

const TranslateButton = ({ articleId, originalTitle: _originalTitle, originalSummary: _originalSummary }: TranslateButtonProps) => {
    const [translation, setTranslation] = useState<{ title: string; summary: string | null; targetLang: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleTranslate = async (targetLang: string) => {
        setShowDropdown(false);
        if (translation && translation.targetLang === targetLang) {
            setTranslation(null);
            return;
        }
        setLoading(true);
        try {
            const res = await axiosInstance.post(`/ai/translate/${articleId}?target=${targetLang}`);
            setTranslation({
                title: res.data.title,
                summary: res.data.summary,
                targetLang
            });
            const langLabel = LANGUAGES.find(l => l.code === targetLang)?.label || targetLang;
            toast.success(`Translated to ${langLabel}`);
        } catch {
            toast.error('Translation failed');
        } finally {
            setLoading(false);
        }
    };

    const activeLang = translation ? LANGUAGES.find(l => l.code === translation.targetLang) : null;

    return (
        <div>
            <div className="relative inline-block">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border ${
                        translation
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                            : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
                    } disabled:opacity-50`}
                    title="Translate article"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 8l6 6" />
                        <path d="M4 14l6-6 2-3" />
                        <path d="M2 5h12" />
                        <path d="M7 2h1" />
                        <path d="M22 22l-5-10-5 10" />
                        <path d="M14 18h6" />
                    </svg>
                    {loading ? 'Translating...' : translation ? `${activeLang?.flag || ''} ${activeLang?.label || ''}` : 'Translate'}
                </button>

                {showDropdown && (
                    <div className="absolute top-full mt-1 left-0 bg-glass-surface border border-glass-border rounded-lg shadow-xl z-50 py-1 min-w-[160px] animate-fade-in">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleTranslate(lang.code)}
                                className="w-full px-3 py-1.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                            >
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                            </button>
                        ))}
                        {translation && (
                            <button
                                onClick={() => { setTranslation(null); setShowDropdown(false); }}
                                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-glass-border"
                            >
                                Show Original
                            </button>
                        )}
                    </div>
                )}
            </div>

            {translation && (
                <div className="mt-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                            {activeLang?.flag} Translation ({activeLang?.label})
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{translation.title}</h3>
                    {translation.summary && (
                        <p className="text-sm text-white/80 leading-relaxed">{translation.summary}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TranslateButton;
