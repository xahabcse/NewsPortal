import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../services/LogService';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        // Report to the central log (category=client_error).
        reportClientError(error.message || 'React render error', `${error.stack ?? ''}\n${errorInfo.componentStack ?? ''}`);
    }

    public render() {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        if (hasError) {
            if (fallback) {
                return fallback;
            }

            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center p-8 bg-white/5 rounded-2xl border border-glass-border">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-red-500"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            Something went wrong
                        </h1>

                        <p className="text-secondary text-sm mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page or navigating back to the home page.
                        </p>

                        {error && (
                            <details className="text-left mb-6 p-4 bg-black/20 rounded-lg">
                                <summary className="text-xs font-medium text-secondary cursor-pointer hover:text-white transition-colors">
                                    Error details (for debugging)
                                </summary>
                                <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-40">
                                    {error.toString()}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition-colors"
                            >
                                Refresh Page
                            </button>

                            <a
                                href="/"
                                className="px-6 py-2.5 bg-white/5 border border-glass-border text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                Go Home
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
