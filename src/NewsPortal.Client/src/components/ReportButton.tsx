import { useState } from 'react';
import { axiosInstance } from '../services/axiosInstance';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const REASONS = [
    { value: 'incorrect', label: 'Incorrect Information' },
    { value: 'misleading', label: 'Misleading Content' },
    { value: 'duplicate', label: 'Duplicate Article' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
];

interface ReportButtonProps {
    articleId: number;
}

const ReportButton = ({ articleId }: ReportButtonProps) => {
    const { isAuthenticated } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState('incorrect');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [reported, setReported] = useState(false);

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to report articles');
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.post(`/reports/article/${articleId}`, { reason, details: details.trim() || undefined });
            toast.success('Report submitted. Thank you!');
            setReported(true);
            setShowModal(false);
        } catch {
            // Error handled by axios interceptor
        } finally {
            setSubmitting(false);
        }
    };

    if (reported) {
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Reported
            </span>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-glass-border text-secondary hover:text-red-400 hover:border-red-500/30 transition-colors"
                title="Report this article"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                    <line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
                Report
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-glass-border">
                            <h2 className="text-lg font-bold text-white">Report Article</h2>
                            <p className="text-xs text-secondary mt-0.5">Help us maintain content quality</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs text-secondary mb-2">Reason</label>
                                <div className="space-y-2">
                                    {REASONS.map(r => (
                                        <label key={r.value} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={r.value}
                                                checked={reason === r.value}
                                                onChange={e => setReason(e.target.value)}
                                                className="accent-accent"
                                            />
                                            <span className="text-sm text-white">{r.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-secondary mb-1.5">Additional details (optional)</label>
                                <textarea
                                    value={details}
                                    onChange={e => setDetails(e.target.value)}
                                    placeholder="Provide more details about the issue..."
                                    maxLength={500}
                                    rows={3}
                                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder-secondary/50 focus:outline-none focus:border-accent/50 resize-none"
                                />
                                <p className="text-[10px] text-secondary/50 mt-1">{details.length}/500</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-glass-border bg-white/5 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-secondary hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-4 py-2 text-sm bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReportButton;
