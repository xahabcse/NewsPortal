import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

interface ShareButtonProps {
    title: string;
    url?: string;
    summary?: string;
}

const ShareButton = ({ title, url, summary }: ShareButtonProps) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const shareUrl = url || window.location.href;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title, text: summary || '', url: shareUrl });
            } catch {
                // User cancelled sharing
            }
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
        setShowDropdown(false);
    };

    const shareLinks = [
        {
            name: 'Facebook',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            ),
        },
        {
            name: 'X (Twitter)',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
            ),
        },
        {
            name: 'WhatsApp',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
            ),
        },
        {
            name: 'Telegram',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
            ),
        },
        {
            name: 'Email',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
            ),
        },
    ];

    const getShareUrl = (name: string) => {
        switch (name) {
            case 'Facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            case 'X (Twitter)':
                return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
            case 'WhatsApp':
                return `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`;
            case 'Telegram':
                return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
            case 'Email':
                return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${summary || title}\n\n${shareUrl}`)}`;
            default:
                return '#';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    if (typeof navigator.share === 'function') {
                        handleNativeShare();
                    } else {
                        setShowDropdown(!showDropdown);
                    }
                }}
                className="flex items-center gap-2 px-3 py-2 min-h-11 sm:min-h-0 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white hover:bg-white/10 transition-colors text-sm"
                title="Share this article"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 sm:w-52 max-w-[calc(100vw-1rem)] glass-morphism border border-glass-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    <div className="py-1">
                        <button
                            onClick={copyLink}
                            className="w-full px-4 py-2.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy Link
                        </button>
                        <div className="border-t border-glass-border my-1"></div>
                        {shareLinks.map(link => (
                            <a
                                key={link.name}
                                href={getShareUrl(link.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-4 py-2.5 text-left text-sm text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                                onClick={() => setShowDropdown(false)}
                            >
                                <span className="text-secondary">{link.icon}</span>
                                {link.name}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareButton;
