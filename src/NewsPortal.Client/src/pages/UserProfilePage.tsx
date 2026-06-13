import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, BadgeCheck, UserX, ArrowLeft } from 'lucide-react';
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
    const { t } = useTranslation();
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
            SuperAdmin: 'bg-danger/15 text-danger border-danger/30',
            Admin: 'bg-danger/15 text-danger border-danger/30',
            Editor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            Reader: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
        return colors[role] || 'bg-white/5 text-secondary border-glass-border';
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-8 flex justify-center">
                <div className="w-full max-w-md">
                    <div className="glass-morphism border border-glass-border rounded-2xl p-6 sm:p-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
                            <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                            <div className="h-4 w-20 bg-white/5 rounded-full animate-pulse" />
                            <div className="h-3 w-48 bg-white/5 rounded animate-pulse mt-2" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (notFound || !profile) {
        return (
            <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <span className="w-16 h-16 rounded-2xl bg-white/5 border border-glass-border flex items-center justify-center mb-4">
                    <UserX className="w-7 h-7 text-secondary" strokeWidth={1.75} />
                </span>
                <h2 className="font-serif text-2xl font-bold text-white mb-1">{t('profile.userNotFound')}</h2>
                <p className="text-secondary text-sm mb-5">{t('profile.userNotFoundDesc')}</p>
                <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors">
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> {t('search.backHome')}
                </Link>
            </div>
        );
    }

    return (
        <>
            <SEO title={t('profile.publicSeoTitle', { username: profile.username })} description={profile.bio || t('profile.publicSeoDescription', { username: profile.username })} />
            <div className="p-4 sm:p-8">
                <div className="max-w-md mx-auto">
                    <div className="glass-morphism border border-glass-border rounded-2xl overflow-hidden">
                        {/* Accent banner */}
                        <div className="h-20 sm:h-24 bg-gradient-to-br from-accent/25 to-accent/5 border-b border-glass-border" />

                        <div className="px-5 sm:px-8 pb-6 sm:pb-8 -mt-12 sm:-mt-14 flex flex-col items-center text-center">
                            <span className="rounded-full ring-4 ring-background bg-background">
                                <Avatar id={profile.avatarId} size="xl" />
                            </span>
                            <h1 className="font-serif text-2xl font-bold text-white mt-3 break-words max-w-full">{profile.username}</h1>
                            <span className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${roleBadge(profile.role)}`}>
                                <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} /> {profile.role}
                            </span>

                            {profile.bio && (
                                <p className="mt-4 text-sm text-white/80 leading-relaxed break-words">{profile.bio}</p>
                            )}

                            <div className="mt-6 pt-4 border-t border-glass-border w-full">
                                <p className="inline-flex items-center gap-1.5 text-xs text-secondary">
                                    <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                                    {t('profile.memberSinceDate', { date: new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> {t('search.backHome')}
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserProfilePage;
