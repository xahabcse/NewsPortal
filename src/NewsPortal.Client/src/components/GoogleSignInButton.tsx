import { useEffect, useRef } from 'react';

interface Props {
    onCredential: (credential: string) => void;
    disabled?: boolean;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                        auto_select?: boolean;
                    }) => void;
                    renderButton: (
                        element: HTMLElement,
                        options: {
                            theme?: string;
                            size?: string;
                            width?: number;
                            text?: string;
                        }
                    ) => void;
                };
            };
        };
    }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const GoogleSignInButton = ({ onCredential, disabled }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!CLIENT_ID || !window.google || !containerRef.current) return;

        window.google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (response) => {
                if (response.credential) {
                    onCredential(response.credential);
                }
            },
            auto_select: false,
        });

        window.google.accounts.id.renderButton(containerRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: containerRef.current.offsetWidth || 360,
            text: 'continue_with',
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!CLIENT_ID) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={`w-full overflow-hidden rounded-lg ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            style={{ minHeight: '44px' }}
        />
    );
};

export default GoogleSignInButton;
