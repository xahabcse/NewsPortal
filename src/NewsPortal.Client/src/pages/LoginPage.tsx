import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SEO from '../components/SEO';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, login, googleLogin } = useAuth();

    const params = new URLSearchParams(location.search);
    const justRegistered = params.get('registered') === 'true';
    const redirectTo = (() => {
        const r = params.get('redirect') || '/';
        return r.startsWith('/') ? r : '/';
    })();

    // Already logged in — redirect immediately
    if (isAuthenticated) {
        navigate(redirectTo, { replace: true });
        return null;
    }

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password) {
            setError('Please enter your username and password.');
            return;
        }

        setSubmitting(true);
        try {
            await login(username.trim(), password);
            navigate(redirectTo, { replace: true });
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                if (status === 401) {
                    setError('Invalid username or password.');
                } else if (status === 429) {
                    setError('Too many login attempts. Please wait a moment and try again.');
                } else {
                    const msg = err.response?.data?.message;
                    setError(typeof msg === 'string' && msg ? msg : 'Login failed. Please try again.');
                }
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleCredential = async (credential: string) => {
        setError('');
        setSubmitting(true);
        try {
            await googleLogin(credential);
            navigate(redirectTo, { replace: true });
        } catch {
            setError('Google sign-in failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <SEO
                title="Sign In"
                description="Sign in to your NewsPortal account to access bookmarks, reading history, and personalised news."
            />
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-white">N</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
                        <p className="text-secondary text-sm">Sign in to your NewsPortal account</p>
                    </div>

                    {/* Registered banner */}
                    {justRegistered && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            Account created! Please sign in.
                        </div>
                    )}

                    {/* Form card */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="form-input"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    autoFocus
                                    disabled={submitting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="form-input pr-10"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        disabled={submitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Signing in…' : 'Sign In'}
                            </button>
                        </form>

                        {/* Google sign-in — only when client id configured */}
                        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                            <div className="mt-4 pt-4 border-t border-glass-border">
                                <p className="text-xs text-secondary text-center mb-3">Or continue with</p>
                                <GoogleSignInButton onCredential={handleGoogleCredential} disabled={submitting} />
                            </div>
                        )}

                        {/* Register link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-secondary">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-accent hover:text-accent/80 transition-colors font-medium">
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Back to home */}
                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-secondary hover:text-white transition-colors">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
