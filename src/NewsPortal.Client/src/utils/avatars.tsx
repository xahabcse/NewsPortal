import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface AvatarData {
    id: number;
    /** kept for backward-compat with stored avatarId payloads; unused by the new outline renderer */
    emoji: string;
    /** solid tint token used for the avatar circle background/foreground */
    tint: string;
    label: string;
    icon?: ReactNode;
}

// Shared inline-SVG style: 24x24 viewBox, stroke=currentColor, fill=none, outline look.
const stroke = {
    className: 'w-full h-full',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

const GlyphUser = (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const GlyphGlobe = (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);
const GlyphFeather = (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" /><path d="M16 8 2 22" /><path d="M17.5 15H9" /></svg>
);
const GlyphCompass = (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
);
const GlyphBolt = (
    <svg viewBox="0 0 24 24" {...stroke}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
const GlyphLeaf = (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" /></svg>
);
const GlyphMountain = (
    <svg viewBox="0 0 24 24" {...stroke}><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></svg>
);
const GlyphBook = (
    <svg viewBox="0 0 24 24" {...stroke}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
);
const GlyphPenTool = (
    <svg viewBox="0 0 24 24" {...stroke}><path d="m12 19 7-7 3 3-7 7-3-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="m2 2 7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
);
const GlyphTarget = (
    <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
);

// ── Avatar definitions ──
// IDs and count preserved (0–10). id 0 = initials, 1–10 = outline glyphs on a tinted circle.
export const AVATARS: AvatarData[] = [
    { id: 0, emoji: '', tint: 'accent', label: 'Initials' },
    { id: 1, emoji: '', tint: '14 165 233', label: 'Globe', icon: GlyphGlobe },
    { id: 2, emoji: '', tint: '20 184 166', label: 'Feather', icon: GlyphFeather },
    { id: 3, emoji: '', tint: '99 102 241', label: 'Compass', icon: GlyphCompass },
    { id: 4, emoji: '', tint: '34 197 94', label: 'Leaf', icon: GlyphLeaf },
    { id: 5, emoji: '', tint: '245 158 11', label: 'Bolt', icon: GlyphBolt },
    { id: 6, emoji: '', tint: '139 92 246', label: 'Mountain', icon: GlyphMountain },
    { id: 7, emoji: '', tint: '236 72 153', label: 'Book', icon: GlyphBook },
    { id: 8, emoji: '', tint: '249 115 22', label: 'Pen', icon: GlyphPenTool },
    { id: 9, emoji: '', tint: '225 29 72', label: 'Target', icon: GlyphTarget },
    { id: 10, emoji: '', tint: '6 182 212', label: 'User', icon: GlyphUser },
];

export const getAvatar = (id: number): AvatarData => {
    return AVATARS.find(a => a.id === id) || AVATARS[0];
};

const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
};

const glyphSizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
};

const initialSizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-3xl',
};

interface AvatarProps {
    id: number;
    size?: keyof typeof sizeMap;
    className?: string;
    clickable?: boolean;
    username?: string;
}

// Resolve a tint to an inline color value. 'accent' uses the theme accent var.
const tintColor = (tint: string) =>
    tint === 'accent' ? 'rgb(var(--color-accent))' : `rgb(${tint})`;

export const Avatar = ({ id, size = 'md', className = '', clickable = false, username }: AvatarProps) => {
    const navigate = useNavigate();
    const avatar = getAvatar(id);

    const handleClick = () => {
        if (clickable && username) {
            navigate(`/user/${username}`);
        }
    };

    const initial = (username || '').trim().charAt(0).toUpperCase() || '?';
    const color = tintColor(avatar.tint);

    // id 0 → solid accent circle with the username initial (white).
    // id 1–10 → outline glyph in the tint color on a subtle tinted circle.
    const isInitials = avatar.id === 0;

    return (
        <div
            onClick={clickable ? handleClick : undefined}
            className={`rounded-full flex items-center justify-center select-none ${sizeMap[size]} ${clickable ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${className}`}
            style={
                isInitials
                    ? { backgroundColor: color, border: '1px solid rgba(255,255,255,0.12)' }
                    : { backgroundColor: `rgb(${avatar.tint} / 0.14)`, color, border: `1px solid rgb(${avatar.tint} / 0.30)` }
            }
            title={clickable ? `View ${username}'s profile` : avatar.label}
        >
            {isInitials ? (
                <span className={`font-bold text-white ${initialSizeMap[size]}`}>{initial}</span>
            ) : (
                <span className={`inline-flex ${glyphSizeMap[size]}`}>{avatar.icon}</span>
            )}
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
            {AVATARS.map(avatar => {
                const isInitials = avatar.id === 0;
                const color = tintColor(avatar.tint);
                return (
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
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={
                                isInitials
                                    ? { backgroundColor: color, border: '1px solid rgba(255,255,255,0.12)' }
                                    : { backgroundColor: `rgb(${avatar.tint} / 0.14)`, color, border: `1px solid rgb(${avatar.tint} / 0.30)` }
                            }
                        >
                            {isInitials ? (
                                <span className="text-white font-bold text-base">Aa</span>
                            ) : (
                                <span className="inline-flex w-6 h-6">{avatar.icon}</span>
                            )}
                        </div>
                        <span className="text-[10px] text-secondary">{avatar.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
