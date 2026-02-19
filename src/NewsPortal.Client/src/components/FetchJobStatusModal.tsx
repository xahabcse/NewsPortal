import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface FetchJobStatus {
    jobId: string;
    sourceId: number;
    sourceName: string;
    status: string;
    triggerType: string;
    attempts: number;
    startedAt?: string;
    finishedAt?: string;
    articlesFetched: number;
    newArticles: number;
    updatedArticles: number;
    errorCode?: string;
    errorSummary?: string;
}

interface FetchJobStatusModalProps {
    isOpen: boolean;
    jobId: string | null;
    sourceName: string;
    onClose: () => void;
}

const FetchJobStatusModal = ({ isOpen, jobId, sourceName, onClose }: FetchJobStatusModalProps) => {
    const [status, setStatus] = useState<FetchJobStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [pollCount, setPollCount] = useState(0);

    useEffect(() => {
        if (!isOpen || !jobId) return;

        const pollStatus = async () => {
            try {
                const response = await fetch(`/api/v1/fetchjobs/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                });
                
                if (response.ok) {
                    const data: FetchJobStatus = await response.json();
                    setStatus(data);
                    setLoading(false);
                    setPollCount(prev => prev + 1);

                    // Stop polling if job is complete
                    if (data.status === 'Completed' || data.status === 'Failed') {
                        if (data.status === 'Completed') {
                            toast.success(`Fetch completed: ${data.articlesFetched} articles (${data.newArticles} new)`);
                        } else {
                            toast.error(`Fetch failed: ${data.errorSummary || 'Unknown error'}`);
                        }
                        return; // Stop polling
                    }
                }
            } catch (error) {
                console.error('Failed to poll job status:', error);
            }

            // Continue polling every 2 seconds if job not complete
            if (pollCount < 150) { // Timeout after 5 minutes (150 * 2s)
                setTimeout(pollStatus, 2000);
            } else {
                toast.error('Job status polling timed out');
                onClose();
            }
        };

        // Start polling
        pollStatus();
    }, [jobId, isOpen, onClose, pollCount]);

    if (!isOpen || !jobId) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'text-yellow-500';
            case 'Running': return 'text-blue-500';
            case 'Completed': return 'text-green-500';
            case 'Failed': return 'text-red-500';
            default: return 'text-secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending':
                return (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            case 'Running':
                return (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            case 'Completed':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'Failed':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-glass-surface border border-glass-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-white">Fetch Progress</h2>
                    <button
                        onClick={onClose}
                        className="text-secondary hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-accent"></div>
                            <span className="text-secondary text-sm">Loading job status...</span>
                        </div>
                    </div>
                ) : status ? (
                    <div className="space-y-4">
                        {/* Source Info */}
                        <div className="text-sm text-secondary">
                            Source: <span className="text-white font-medium">{sourceName}</span>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3">
                            <div className={getStatusColor(status.status)}>
                                {getStatusIcon(status.status)}
                            </div>
                            <span className={`text-lg font-semibold ${getStatusColor(status.status)}`}>
                                {status.status}
                            </span>
                        </div>

                        {/* Progress Stats */}
                        {status.status !== 'Pending' && (
                            <div className="bg-white/5 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-secondary">Total Articles:</span>
                                    <span className="text-white font-medium">{status.articlesFetched}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-secondary">New Articles:</span>
                                    <span className="text-green-400 font-medium">{status.newArticles}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-secondary">Updated:</span>
                                    <span className="text-blue-400 font-medium">{status.updatedArticles}</span>
                                </div>
                                {status.attempts > 1 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Attempts:</span>
                                        <span className="text-yellow-400 font-medium">{status.attempts}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Timing */}
                        {status.startedAt && (
                            <div className="text-xs text-secondary">
                                Started: {new Date(status.startedAt).toLocaleString()}
                            </div>
                        )}
                        {status.finishedAt && (
                            <div className="text-xs text-secondary">
                                Completed: {new Date(status.finishedAt).toLocaleString()}
                            </div>
                        )}

                        {/* Error Info */}
                        {status.errorCode && status.status === 'Failed' && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <div className="text-sm font-medium text-red-400 mb-1">
                                    Error: {status.errorCode}
                                </div>
                                {status.errorSummary && (
                                    <div className="text-xs text-red-300/70">
                                        {status.errorSummary}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Close Button */}
                        {(status.status === 'Completed' || status.status === 'Failed') && (
                            <button
                                onClick={onClose}
                                className="w-full mt-4 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-secondary">
                        Unable to load job status
                    </div>
                )}
            </div>
        </div>
    );
};

export default FetchJobStatusModal;
