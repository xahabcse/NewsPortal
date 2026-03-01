import { useState, useEffect } from 'react';
import { axiosInstance } from '../services/axiosInstance';

interface SentimentData {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    overallSentiment: string;
}

interface SentimentBadgeProps {
    articleId: number;
}

const SentimentBadge = ({ articleId }: SentimentBadgeProps) => {
    const [data, setData] = useState<SentimentData | null>(null);

    useEffect(() => {
        axiosInstance.get(`/ai/sentiment/article/${articleId}`)
            .then(res => setData(res.data))
            .catch(() => {});
    }, [articleId]);

    if (!data || data.total === 0) return null;

    const sentimentConfig = {
        positive: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: '\uD83D\uDE0A' },
        negative: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: '\uD83D\uDE1E' },
        neutral: { color: 'text-secondary', bg: 'bg-white/5 border-glass-border', icon: '\uD83D\uDE10' },
    };

    const config = sentimentConfig[data.overallSentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
    const total = data.total;

    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${config.bg} text-xs`}>
            <span className="text-base">{config.icon}</span>
            <div>
                <span className={`font-semibold capitalize ${config.color}`}>
                    {data.overallSentiment} sentiment
                </span>
                <span className="text-secondary ml-2">
                    ({data.positive} positive, {data.negative} negative, {data.neutral} neutral of {total})
                </span>
            </div>
            {/* Mini bar */}
            <div className="flex h-1.5 w-20 rounded-full overflow-hidden bg-white/10">
                {data.positive > 0 && (
                    <div className="bg-green-400" style={{ width: `${(data.positive / total) * 100}%` }} />
                )}
                {data.neutral > 0 && (
                    <div className="bg-gray-400" style={{ width: `${(data.neutral / total) * 100}%` }} />
                )}
                {data.negative > 0 && (
                    <div className="bg-red-400" style={{ width: `${(data.negative / total) * 100}%` }} />
                )}
            </div>
        </div>
    );
};

export default SentimentBadge;
