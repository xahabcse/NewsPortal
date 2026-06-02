import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import axios from 'axios';
import { axiosInstance } from '../services/axiosInstance';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, googleLogin } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState('');

    // Already logged in — redirect via effect (not during render; hooks must run first).
    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    if (isAuthenticated) return null;

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError('');

        const newErrors = validate();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);

        try {
            await axiosInstance.post('/auth/register', {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
            });

            // Registration successful, redirect to login
            navigate('/login?registered=true');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const data = err.response?.data as { message?: string; errors?: Record<string, string[]> };

                if (status === 400 && data?.errors) {
                    // Validation errors
                    const formattedErrors: Record<string, string> = {};
                    Object.entries(data.errors).forEach(([key, messages]) => {
                        formattedErrors[key] = messages[0];
                    });
                    setErrors(formattedErrors);
                } else if (status === 409) {
                    setGeneralError('Username or email already exists');
                } else {
                    setGeneralError(data?.message || 'Registration failed');
                }
            } else {
                setGeneralError('Registration failed');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleCredential = async (credential: string) => {
        setGeneralError('');
        setSubmitting(true);
        try {
            await googleLogin(credential);
            navigate('/', { replace: true });
        } catch {
            setGeneralError('Google sign-in failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <SEO
                title="Create Account"
                description="Register for a NewsPortal account to save articles, track reading history, and personalize your news experience."
            />
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-white">N</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                        <p className="text-secondary text-sm">
                            Join NewsPortal to save articles and track your reading history
                        </p>
                    </div>

                    {/* Form */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className={`form-input ${errors.username ? 'border-red-500/50' : ''}`}
                                    placeholder="Choose a username"
                                    autoComplete="username"
                                />
                                {errors.username && (
                                    <p className="text-xs text-red-400 mt-1">{errors.username}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`form-input ${errors.email ? 'border-red-500/50' : ''}`}
                                    placeholder="your@email.com"
                                    autoComplete="email"
                                />
                                {errors.email && (
                                    <p className="text-xs text-red-400 mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`form-input ${errors.password ? 'border-red-500/50' : ''}`}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`form-input ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                />
                                {errors.confirmPassword && (
                                    <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>
                                )}
                            </div>

                            {generalError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                    {generalError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>

                        {/* Google sign-in — only when client id configured */}
                        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                            <div className="mt-4 pt-4 border-t border-glass-border">
                                <p className="text-xs text-secondary text-center mb-3">Or sign up with</p>
                                <GoogleSignInButton onCredential={handleGoogleCredential} disabled={submitting} />
                            </div>
                        )}

                        {/* Login Link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-secondary">
                                Already have an account?{' '}
                                <Link to="/login" className="text-accent hover:text-accent/80 transition-colors font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/"
                            className="text-sm text-secondary hover:text-white transition-colors"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RegisterPage;
