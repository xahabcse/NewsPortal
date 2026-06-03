import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const NotFoundPage = () => {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8">
            <Helmet>
                <title>Page Not Found - NewsPortal</title>
            </Helmet>
            <div className="max-w-md w-full text-center">
                {/* 404 Animation */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-white/5 border border-glass-border rounded-3xl p-12">
                        <h1 className="font-serif text-8xl font-bold text-accent mb-4">
                            404
                        </h1>
                        <p className="text-secondary text-lg mb-2">Page Not Found</p>
                        <p className="text-secondary/60 text-sm">
                            The page you're looking for doesn't exist or has been moved.
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                    <Link
                        to="/"
                        className="p-4 bg-white/5 border border-glass-border rounded-xl hover:bg-white/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-accent/20 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-accent"
                            >
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-white">Home</span>
                    </Link>

                    <Link
                        to="/news-sources"
                        className="p-4 bg-white/5 border border-glass-border rounded-xl hover:bg-white/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-accent/20 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-accent"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-white">News Sources</span>
                    </Link>

                    <Link
                        to="/trending"
                        className="p-4 bg-white/5 border border-glass-border rounded-xl hover:bg-white/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-orange-500/20 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-orange-500"
                            >
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-white">Trending</span>
                    </Link>

                    <a
                        href="https://github.com/sujoncep/NewsPortal"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 border border-glass-border rounded-xl hover:bg-white/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-green-500/20 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-green-500"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-white">GitHub</span>
                    </a>
                </div>

                {/* Go Home Button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors font-medium text-sm"
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
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
