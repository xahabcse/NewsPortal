import { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { axiosInstance } from '../services/axiosInstance';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ReactionData {
    counts: Record<string, number>;
    total: number;
    userReaction: string | null;
}

const REACTIONS = [
    { type: 'like', emoji: '\uD83D\uDC4D', labelKey: 'article.reactionLike' },
    { type: 'love', emoji: '\u2764\uFE0F', labelKey: 'article.reactionLove' },
    { type: 'informative', emoji: '\uD83D\uDCA1', labelKey: 'article.reactionInformative' },
    { type: 'shocking', emoji: '\uD83D\uDE32', labelKey: 'article.reactionShocking' },
];

interface ArticleReactionsProps {
    articleId: number;
}

const ArticleReactions = ({ articleId }: ArticleReactionsProps) => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const [data, setData] = useState<ReactionData>({ counts: {}, total: 0, userReaction: null });
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        axiosInstance.get(`/reactions/article/${articleId}`)
            .then(res => setData(res.data))
            .catch(() => {});
    }, [articleId]);

    const handleReact = async (type: string) => {
        if (!isAuthenticated) {
            toast.error(t('article.loginToReact'));
            return;
        }
        if (loading) return;
        setLoading(true);
        try {
            const res = await axiosInstance.post(`/reactions/article/${articleId}`, { type });
            setData(res.data);
            setShowPicker(false);
        } catch {
            toast.error(t('article.reactFailed'));
        } finally {
            setLoading(false);
        }
    };

    const userReactionInfo = REACTIONS.find(r => r.type === data.userReaction);

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <button
                    onClick={() => {
                        if (data.userReaction) {
                            handleReact(data.userReaction); // toggle off
                        } else {
                            setShowPicker(!showPicker);
                        }
                    }}
                    onMouseEnter={() => !data.userReaction && setShowPicker(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-sm transition-all border ${
                        data.userReaction
                            ? 'bg-accent/15 border-accent/40 text-white'
                            : 'bg-white/5 border-glass-border text-secondary hover:text-white hover:bg-white/10'
                    }`}
                >
                    {userReactionInfo
                        ? <span className="text-base leading-none">{userReactionInfo.emoji}</span>
                        : <ThumbsUp className="w-4 h-4" strokeWidth={1.75} />}
                    <span>{data.userReaction && userReactionInfo ? t(userReactionInfo.labelKey) : t('article.react')}</span>
                    {data.total > 0 && (
                        <span className="ml-0.5 text-xs opacity-70">{data.total}</span>
                    )}
                </button>

                {showPicker && (
                    <div
                        className="absolute bottom-full left-0 mb-2 flex gap-1 p-1.5 bg-glass-surface border border-glass-border rounded-xl shadow-2xl z-20"
                        onMouseLeave={() => setShowPicker(false)}
                    >
                        {REACTIONS.map(r => (
                            <button
                                key={r.type}
                                onClick={() => handleReact(r.type)}
                                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all hover:bg-white/10 hover:scale-110 ${
                                    data.userReaction === r.type ? 'bg-accent/20' : ''
                                }`}
                                title={t(r.labelKey)}
                            >
                                <span className="text-xl">{r.emoji}</span>
                                <span className="text-[9px] text-secondary">{data.counts[r.type] || 0}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Show reaction breakdown if there are reactions */}
            {data.total > 0 && (
                <div className="flex -space-x-1">
                    {REACTIONS.filter(r => (data.counts[r.type] || 0) > 0).slice(0, 3).map(r => (
                        <span key={r.type} className="text-sm" title={t('article.reactionBreakdown', { label: t(r.labelKey), count: data.counts[r.type] })}>
                            {r.emoji}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ArticleReactions;
