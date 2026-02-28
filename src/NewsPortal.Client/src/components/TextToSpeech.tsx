import { useState, useEffect, useCallback } from 'react';

interface TextToSpeechProps {
    text: string;
    title?: string;
}

const TextToSpeech = ({ text, title }: TextToSpeechProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        setIsSupported('speechSynthesis' in window);
    }, []);

    const cleanText = useCallback((): string => {
        const div = document.createElement('div');
        div.innerHTML = text;
        const cleaned = div.textContent || div.innerText || '';
        return (title ? title + '. ' : '') + cleaned;
    }, [text, title]);

    const detectLanguage = useCallback((): string => {
        const bengaliRegex = /[\u0980-\u09FF]/;
        return bengaliRegex.test(text) ? 'bn-BD' : 'en-US';
    }, [text]);

    const play = () => {
        if (isPaused) {
            speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText());
        utterance.lang = detectLanguage();
        utterance.rate = speed;
        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };
        utterance.onerror = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };
        speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setIsPaused(false);
    };

    const pause = () => {
        speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
    };

    const stop = () => {
        speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    const changeSpeed = (newSpeed: number) => {
        setSpeed(newSpeed);
        if (isPlaying || isPaused) {
            speechSynthesis.cancel();
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(cleanText());
                utterance.lang = detectLanguage();
                utterance.rate = newSpeed;
                utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
                utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); };
                speechSynthesis.speak(utterance);
                setIsPlaying(true);
                setIsPaused(false);
            }, 100);
        }
    };

    useEffect(() => {
        return () => { speechSynthesis.cancel(); };
    }, []);

    if (!isSupported) return null;

    const speeds = [0.75, 1, 1.25, 1.5, 2];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {!isPlaying && !isPaused ? (
                <button
                    onClick={play}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white hover:bg-white/10 transition-colors text-sm"
                    title="Listen to article"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    Listen
                </button>
            ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
                    <button
                        onClick={isPlaying ? pause : play}
                        className="text-accent hover:text-accent/80 transition-colors"
                        title={isPlaying ? 'Pause' : 'Resume'}
                    >
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={stop}
                        className="text-secondary hover:text-white transition-colors"
                        title="Stop"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                        </svg>
                    </button>
                    <div className="flex items-center gap-1 ml-1 border-l border-accent/30 pl-2">
                        {speeds.map(s => (
                            <button
                                key={s}
                                onClick={() => changeSpeed(s)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                    speed === s
                                        ? 'bg-accent text-white'
                                        : 'text-secondary hover:text-white'
                                }`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TextToSpeech;
