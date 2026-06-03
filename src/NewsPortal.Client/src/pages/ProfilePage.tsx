import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { axiosInstance } from '../services/axiosInstance';
import toast from 'react-hot-toast';
import { Avatar, AvatarSelector } from '../utils/avatars';
import ReadingHistory from '../components/ReadingHistory';

interface UserProfile {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    bio: string | null;
    avatarId: number;
}

// Admin Control Panel tiles — surfaced on the dashboard only for Admin/SuperAdmin.
// Routes are already role-gated in App.tsx; this is just the navigation surface.
const ADMIN_TILES: { to: string; title: string; subtitle: string; tint: string; icon: JSX.Element }[] = [
    {
        to: '/admin/dashboard', title: 'Dashboard', subtitle: 'System overview',
        tint: 'bg-accent/10 text-accent',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>,
    },
    {
        to: '/admin/fetch-logs', title: 'Fetch Logs', subtitle: 'Import history',
        tint: 'bg-blue-500/10 text-blue-400',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    },
    {
        to: '/admin/categories', title: 'Categories', subtitle: 'Manage categories',
        tint: 'bg-purple-500/10 text-purple-400',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></svg>,
    },
    {
        to: '/admin/articles', title: 'Articles', subtitle: 'Manage articles',
        tint: 'bg-emerald-500/10 text-emerald-400',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    },
    {
        to: '/admin/analytics', title: 'Analytics', subtitle: 'Content analytics',
        tint: 'bg-amber-500/10 text-amber-400',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
    },
    {
        to: '/admin/users', title: 'User Management', subtitle: 'Manage users & roles',
        tint: 'bg-rose-500/10 text-rose-400',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
];

const ProfilePage = () => {
    const { isAuthenticated, session, authProvider, logout, updateAvatarId, role } = useAuth();
    const isAdmin = role === 'Admin' || role === 'SuperAdmin';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState('');
    const [bio, setBio] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(1);
    const [profileSaving, setProfileSaving] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Fetch user profile from backend
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isAuthenticated) return;
            
            try {
                setProfileLoading(true);
                const response = await axiosInstance.get<UserProfile>('/auth/me');
                setProfile(response.data);
                setBio(response.data.bio || '');
                setSelectedAvatar(response.data.avatarId || 1);
            } catch (error) {
                console.error('Failed to fetch profile:', error);
                toast.error('Failed to load profile information');
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, [isAuthenticated]);

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

    const handleProfileSave = async () => {
        setProfileSaving(true);
        try {
            await axiosInstance.put('/auth/profile', {
                bio: bio.trim() || null,
                avatarId: selectedAvatar,
            });
            updateAvatarId(selectedAvatar);
            setProfile(prev => prev ? { ...prev, bio: bio.trim() || null, avatarId: selectedAvatar } : prev);
            toast.success('Profile updated!');
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { message?: string } } };
                toast.error(axiosError.response?.data?.message || 'Failed to update profile');
            } else {
                toast.error('Failed to update profile');
            }
        } finally {
            setProfileSaving(false);
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
            <div className="p-4 sm:p-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="mb-4 sm:mb-8">
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">My Profile</h1>
                        <p className="text-secondary text-sm">Manage your account settings</p>
                    </div>

                    {/* Profile Info Card */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-4 sm:p-6 mb-6">
                        <div className="flex items-center gap-3 sm:gap-4 mb-6">
                            <Avatar id={selectedAvatar} size="xl" />
                            <div>
                                <h2 className="text-xl font-bold text-white">{profile?.username || session?.username}</h2>
                                <p className="text-sm text-secondary">{profile?.role || session?.role}</p>
                            </div>
                        </div>

                        {profileLoading ? (
                            <div className="space-y-3">
                                <div className="h-4 bg-white/5 rounded animate-pulse"></div>
                                <div className="h-4 bg-white/5 rounded animate-pulse"></div>
                                <div className="h-4 bg-white/5 rounded animate-pulse"></div>
                            </div>
                        ) : profile ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-secondary">Username:</span>
                                    <p className="text-white font-medium">{profile.username}</p>
                                </div>
                                <div>
                                    <span className="text-secondary">Email:</span>
                                    <p className="text-white font-medium">{profile.email}</p>
                                </div>
                                <div>
                                    <span className="text-secondary">Role:</span>
                                    <p className="text-white font-medium">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            profile.role === 'Admin' ? 'bg-red-500/20 text-red-400' :
                                            profile.role === 'Editor' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                            {profile.role}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-secondary">Account Status:</span>
                                    <p className="text-white font-medium">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            profile.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {profile.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-secondary">Registered:</span>
                                    <p className="text-white font-medium">
                                        {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-secondary">Last Login:</span>
                                    <p className="text-white font-medium">
                                        {profile.lastLoginAt
                                            ? new Date(profile.lastLoginAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : 'Never'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <span className="text-secondary">User ID:</span>
                                    <p className="text-white font-medium">#{profile.id}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-secondary text-sm">Failed to load profile information</p>
                        )}
                    </div>

                    {/* Admin Control Panel — only for Admin/SuperAdmin (moved from the sidebar) */}
                    {isAdmin && (
                        <div className="glass-morphism border border-glass-border rounded-2xl p-6 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-bold text-white">Admin Control Panel</h3>
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                                    {role}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {ADMIN_TILES.map((tile) => (
                                    <Link
                                        key={tile.to}
                                        to={tile.to}
                                        aria-label={tile.title}
                                        className="flex flex-col gap-2 min-h-[92px] p-4 rounded-xl bg-white/5 border border-glass-border hover:bg-white/10 hover:border-accent/30 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent group"
                                    >
                                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tile.tint}`}>
                                            {tile.icon}
                                        </span>
                                        <span className="mt-auto">
                                            <span className="block text-sm font-semibold text-white group-hover:text-accent transition-colors leading-tight">{tile.title}</span>
                                            <span className="block text-[11px] text-secondary mt-0.5">{tile.subtitle}</span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Avatar & Bio Card */}
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-white mb-4">Avatar & Bio</h3>

                        <div className="mb-6">
                            <label className="block text-sm text-secondary mb-3">Choose your avatar</label>
                            <AvatarSelector selected={selectedAvatar} onSelect={setSelectedAvatar} />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-secondary mb-1">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about yourself..."
                                className="w-full bg-white/5 border border-glass-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-accent/50 resize-none"
                                rows={3}
                                maxLength={255}
                            />
                            <div className="flex justify-end mt-1">
                                <span className={`text-xs ${bio.length > 240 ? 'text-amber-400' : 'text-secondary'}`}>{bio.length}/255</span>
                            </div>
                        </div>

                        <button
                            onClick={handleProfileSave}
                            disabled={profileSaving}
                            className="w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {profileSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>

                    {/* Change Password Card — only for Local auth users */}
                    {authProvider === 'Local' ? (
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
                    ) : (
                        <div className="glass-morphism border border-glass-border rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Authentication</h3>
                            <div className="flex items-center gap-3 text-sm text-secondary">
                                <svg width="20" height="20" viewBox="0 0 24 24" className="text-green-400">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                <span>Your account is managed by Google. Password changes are handled through your Google account.</span>
                            </div>
                        </div>
                    )}

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

                    {/* Recently Read — moved here from the sidebar */}
                    <div className="mt-6">
                        <ReadingHistory variant="dashboard" />
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
