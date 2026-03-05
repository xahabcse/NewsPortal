import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { axiosInstance } from '../services/axiosInstance';
import { Avatar } from '../utils/avatars';

interface PublicProfile {
    username: string;
    bio: string | null;
    avatarId: number;
    role: string;
    createdAt: string;
}

const UserProfilePage = () => {
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!username) return;
            try {
                setLoading(true);
                setNotFound(false);
                const res = await axiosInstance.get<PublicProfile>(`/auth/user/${username}`);
                setProfile(res.data);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    const roleBadge = (role: string) => {
        const colors: Record<string, string> = {
            SuperAdmin: 'bg-red-500/20 text-red-400',
            Admin: 'bg-red-500/20 text-red-400',
            Editor: 'bg-blue-500/20 text-blue-400',
            Reader: 'bg-green-500/20 text-green-400',
        };
        return colors[role] || 'bg-gray-500/20 text-gray-400';
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="max-w-md w-full space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
                        <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-white mb-2">User not found</h2>
                <p className="text-secondary text-sm mb-4">The user you're looking for doesn't exist.</p>
                <Link to="/" className="text-accent hover:text-accent/80 text-sm">
                    ← Back to Home
                </Link>
            </div>
        );
    }

    return (
        <>
            <SEO title={`${profile.username}'s Profile`} description={profile.bio || `${profile.username}'s profile on NewsPortal`} />
            <div className="p-4 sm:p-8">
                <div className="max-w-md mx-auto">
                    <div className="glass-morphism border border-glass-border rounded-2xl p-4 sm:p-8">
                        <div className="flex flex-col items-center text-center">
                            <Avatar id={profile.avatarId} size="xl" className="mb-4" />
                            <h1 className="text-2xl font-bold text-white mb-1">{profile.username}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleBadge(profile.role)}`}>
                                {profile.role}
                            </span>

                            {profile.bio && (
                                <p className="mt-4 text-sm text-white/80 leading-relaxed">{profile.bio}</p>
                            )}

                            <div className="mt-6 pt-4 border-t border-glass-border w-full">
                                <p className="text-xs text-secondary">
                                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

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

export default UserProfilePage;
