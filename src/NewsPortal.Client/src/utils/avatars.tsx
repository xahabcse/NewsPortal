import { useNavigate } from 'react-router-dom';

export interface AvatarData {
    id: number;
    emoji: string;
    bg: string;
    label: string;
}

export const AVATARS: AvatarData[] = [
    { id: 0, emoji: '', bg: 'from-accent to-purple-500', label: 'Initials' },
    { id: 1, emoji: '🦊', bg: 'from-orange-500 to-red-500', label: 'Fox' },
    { id: 2, emoji: '🐼', bg: 'from-gray-500 to-gray-700', label: 'Panda' },
    { id: 3, emoji: '🦁', bg: 'from-yellow-500 to-orange-500', label: 'Lion' },
    { id: 4, emoji: '🐸', bg: 'from-green-500 to-emerald-600', label: 'Frog' },
    { id: 5, emoji: '🦉', bg: 'from-amber-600 to-yellow-700', label: 'Owl' },
    { id: 6, emoji: '🐺', bg: 'from-blue-500 to-indigo-600', label: 'Wolf' },
    { id: 7, emoji: '🦄', bg: 'from-pink-500 to-purple-500', label: 'Unicorn' },
    { id: 8, emoji: '🐯', bg: 'from-orange-600 to-amber-500', label: 'Tiger' },
    { id: 9, emoji: '🐲', bg: 'from-red-600 to-orange-600', label: 'Dragon' },
    { id: 10, emoji: '🦅', bg: 'from-sky-500 to-blue-600', label: 'Eagle' },
];

export const getAvatar = (id: number): AvatarData => {
    return AVATARS.find(a => a.id === id) || AVATARS[0];
};

const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-20 h-20 text-4xl',
};

interface AvatarProps {
    id: number;
    size?: keyof typeof sizeMap;
    className?: string;
    clickable?: boolean;
    username?: string;
}

export const Avatar = ({ id, size = 'md', className = '', clickable = false, username }: AvatarProps) => {
    const navigate = useNavigate();
    const avatar = getAvatar(id);

    const handleClick = () => {
        if (clickable && username) {
            navigate(`/user/${username}`);
        }
    };

    // id = 0 renders the username's first initial in a solid accent circle (theme-neutral)
    const initial = (username || '').trim().charAt(0).toUpperCase() || '?';
    const content = avatar.id === 0
        ? <span className="font-bold text-white">{initial}</span>
        : avatar.emoji;

    return (
        <div
            onClick={clickable ? handleClick : undefined}
            className={`bg-gradient-to-tr ${avatar.bg} rounded-full flex items-center justify-center border border-white/20 shadow-lg select-none ${sizeMap[size]} ${clickable ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${className}`}
            title={clickable ? `View ${username}'s profile` : avatar.label}
        >
            {content}
        </div>
    );
};

interface AvatarSelectorProps {
    selected: number;
    onSelect: (id: number) => void;
}

export const AvatarSelector = ({ selected, onSelect }: AvatarSelectorProps) => {
    return (
        <div className="grid grid-cols-5 gap-3">
            {AVATARS.map(avatar => (
                <button
                    key={avatar.id}
                    type="button"
                    onClick={() => onSelect(avatar.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        selected === avatar.id
                            ? 'bg-accent/20 border-2 border-accent scale-105'
                            : 'bg-white/5 border-2 border-transparent hover:bg-white/10 hover:border-glass-border'
                    }`}
                    title={avatar.label}
                >
                    <div className={`bg-gradient-to-tr ${avatar.bg} w-12 h-12 rounded-full flex items-center justify-center text-2xl border border-white/20 shadow-lg`}>
                        {avatar.id === 0 ? <span className="text-white font-bold text-base">Aa</span> : avatar.emoji}
                    </div>
                    <span className="text-[10px] text-secondary">{avatar.label}</span>
                </button>
            ))}
        </div>
    );
};
