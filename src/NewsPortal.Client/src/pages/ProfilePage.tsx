import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { axiosInstance } from '../services/axiosInstance';
import toast from 'react-hot-toast';

const ProfilePage = () => {
    const { isAuthenticated, session, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Current password is required';
        }

        if (!formData.newPassword) {
            newErrors.newPassword = 'New password is required';
        } else if (formData.newPassword.length < 6) {
            newErrors.newPassword = 'Password must be at least 6 characters';
        }

        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

        setLoading(true);

        try {
            await axiosInstance.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            toast.success('Password changed successfully');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
                if (axiosError.response?.status === 400) {
                    setGeneralError(axiosError.response.data?.message || 'Invalid current password');
                } else {
                    setGeneralError('Failed to change password');
                }
            } else {
                setGeneralError('Failed to change password');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !session) {
        return null;
    }

    return (
        <>
            <SEO
                title="My Profile"
                description="Manage your NewsPortal account settings and change your password."
            />
            <div className="p-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                        <p className="text-secondary text-sm">Manage your account settings</p>
                    </div>

                    {/* Profile Info Card */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent to-purple-500 border-2 border-glass-border flex items-center justify-center text-white text-2xl font-bold">
                                {session.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{session.username}</h2>
                                <p className="text-sm text-secondary">{session.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 text-sm">
                            <div>
                                <span className="text-secondary">Email:</span>
                                <p className="text-white font-medium">{session.email || 'Not set'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-secondary mb-1">Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className={`form-input ${errors.currentPassword ? 'border-red-500/50' : ''}`}
                                    placeholder="Enter current password"
                                    autoComplete="current-password"
                                />
                                {errors.currentPassword && (
                                    <p className="text-xs text-red-400 mt-1">{errors.currentPassword}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className={`form-input ${errors.newPassword ? 'border-red-500/50' : ''}`}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />
                                {errors.newPassword && (
                                    <p className="text-xs text-red-400 mt-1">{errors.newPassword}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-secondary mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`form-input ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                                    placeholder="Re-enter new password"
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
                                disabled={loading}
                                className="w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    {/* Logout Button */}
                    <div className="mt-6">
                        <button
                            onClick={() => {
                                logout();
                                navigate('/');
                            }}
                            className="w-full py-3 rounded-lg bg-white/5 border border-glass-border text-secondary text-sm font-semibold hover:bg-white/10 hover:text-white transition-colors"
                        >
                            Logout
                        </button>
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

export default ProfilePage;
