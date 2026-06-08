import { useState } from 'react';
import { axiosInstance } from '../services/axiosInstance';
import toast from 'react-hot-toast';

interface SummarizeButtonProps {
    articleId: number;
}

const SummarizeButton = ({ articleId }: SummarizeButtonProps) => {
    const [summary, setSummary] = useState<{ text: string; bullets: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'paragraph' | 'bullets'>('bullets');

    const handleSummarize = async () => {
        if (summary) {
            setSummary(null);
            return;
        }
        setLoading(true);
        try {
            const res = await axiosInstance.post(`/ai/summarize/${articleId}?sentences=4&mode=${mode}`);
            setSummary({ text: res.data.summary, bullets: res.data.bullets || [] });
        } catch {
            toast.error('Failed to generate summary');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleSummarize}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm transition-all border ${
                        summary
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                            : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
                    } disabled:opacity-50`}
                    title="AI Summarize"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    {loading ? 'Summarizing...' : summary ? 'Hide Summary' : 'AI Summary'}
                </button>
                {summary && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setMode('bullets')}
                            className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                                mode === 'bullets' ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-glass-border text-secondary'
                            }`}
                        >
                            Bullets
                        </button>
                        <button
                            onClick={() => setMode('paragraph')}
                            className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                                mode === 'paragraph' ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-glass-border text-secondary'
                            }`}
                        >
                            Paragraph
                        </button>
                    </div>
                )}
            </div>

            {summary && (
                <div className="mt-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">AI Summary</span>
                    </div>
                    {mode === 'bullets' && summary.bullets.length > 0 ? (
                        <ul className="space-y-1.5">
                            {summary.bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                                    <span className="text-purple-400 mt-1 flex-shrink-0">&#8226;</span>
                                    <span>{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-white/80 leading-relaxed">{summary.text}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SummarizeButton;
