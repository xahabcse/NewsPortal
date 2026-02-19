import type { NewsSourceTestResult } from '../types/NewsSource';

interface TestSourceResultsModalProps {
    isOpen: boolean;
    result: NewsSourceTestResult | null;
    sourceName: string;
    onClose: () => void;
}

const TestSourceResultsModal = ({ isOpen, result, sourceName, onClose }: TestSourceResultsModalProps) => {
    if (!isOpen || !result) return null;

    const getMethodLabel = (method: number) => {
        const labels: Record<number, string> = { 1: 'RSS', 2: 'API', 3: 'Scrape' };
        return labels[method] || 'Unknown';
    };

    const getSuccessColor = (success: boolean) => {
        return success ? 'text-green-400' : 'text-red-400';
    };

    const getSuccessBg = (success: boolean) => {
        return success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30';
    };

    const getSuccessIcon = (success: boolean) => {
        return success ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        );
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getIssueSeverity = (code: string) => {
        const errorCodes = ['NO_ARTICLES', 'INVALID_PAYLOAD', 'PARSER_FAILED'];
        const warningCodes = ['SLOW_RESPONSE', 'LOW_QUALITY'];
        if (errorCodes.includes(code)) return 'error';
        if (warningCodes.includes(code)) return 'warning';
        return 'info';
    };

    const getIssueColor = (severity: string) => {
        switch (severity) {
            case 'error': return 'text-red-400 border-red-500/30 bg-red-500/10';
            case 'warning': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
            default: return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-glass-surface border border-glass-border rounded-xl p-6 my-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSuccessBg(result.isSuccess)}`}>
                            <div className={getSuccessColor(result.isSuccess)}>
                                {getSuccessIcon(result.isSuccess)}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Test Results</h2>
                            <p className="text-sm text-secondary">{sourceName}</p>
                        </div>
                    </div>
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

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-white">{result.articlesFetched}</div>
                        <div className="text-xs text-secondary">Fetched</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">{result.validArticles}</div>
                        <div className="text-xs text-secondary">Valid</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-400">{result.invalidArticles}</div>
                        <div className="text-xs text-secondary">Invalid</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-accent">{formatDuration(result.durationMs)}</div>
                        <div className="text-xs text-secondary">Duration</div>
                    </div>
                </div>

                {/* Test Details */}
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">Test Details</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-secondary">Primary Method:</span>
                            <span className="text-white font-medium">{getMethodLabel(result.primaryMethod)}</span>
                        </div>
                        {result.successfulMethod !== undefined && result.successfulMethod !== result.primaryMethod && (
                            <div className="flex justify-between">
                                <span className="text-secondary">Successful Method:</span>
                                <span className="text-green-400 font-medium">{getMethodLabel(result.successfulMethod)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-secondary">Used Fallback:</span>
                            <span className={result.usedFallback ? 'text-amber-400' : 'text-secondary'}>
                                {result.usedFallback ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-secondary">Status:</span>
                            <span className={`font-medium ${getSuccessColor(result.isSuccess)}`}>
                                {result.isSuccess ? 'Success' : 'Failed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sample Titles */}
                {result.sampleTitles.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-4 mb-6">
                        <h3 className="text-sm font-semibold text-white mb-3">
                            Sample Titles ({result.sampleTitles.length} shown)
                        </h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {result.sampleTitles.slice(0, 5).map((title, idx) => (
                                <div key={idx} className="text-sm text-secondary/80 flex items-start gap-2">
                                    <span className="text-accent mt-0.5">•</span>
                                    <span className="flex-1">{title}</span>
                                </div>
                            ))}
                            {result.sampleTitles.length > 5 && (
                                <div className="text-xs text-secondary text-center pt-2">
                                    +{result.sampleTitles.length - 5} more titles
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Issues */}
                {result.issues.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-white mb-3">
                            Issues ({result.issues.length})
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {result.issues.map((issue, idx) => {
                                const severity = getIssueSeverity(issue.code);
                                const colorClass = getIssueColor(severity);
                                return (
                                    <div
                                        key={idx}
                                        className={`rounded-lg p-3 border ${colorClass}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="text-xs font-semibold mb-1">
                                                    {issue.code}
                                                    {issue.method && (
                                                        <span className="ml-2 text-[10px] opacity-70">
                                                            ({getMethodLabel(Number(issue.method))})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs opacity-80">{issue.message}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Message */}
                {result.message && (
                    <div className={`rounded-lg p-4 mb-6 ${getSuccessBg(result.isSuccess)}`}>
                        <div className={`text-sm ${getSuccessColor(result.isSuccess)}`}>
                            {result.message}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-glass-border text-secondary text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestSourceResultsModal;
