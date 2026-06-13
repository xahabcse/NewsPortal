import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const NewsletterSignup = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(() => {
        return localStorage.getItem('newsletter_subscribed') === 'true';
    });
    const [frequency, setFrequency] = useState(() => {
        return localStorage.getItem('newsletter_frequency') || 'daily';
    });

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error(t('newsletter.invalidEmail'));
            return;
        }

        localStorage.setItem('newsletter_subscribed', 'true');
        localStorage.setItem('newsletter_email', email);
        localStorage.setItem('newsletter_frequency', frequency);
        setSubscribed(true);
        toast.success(t('newsletter.subscribeSuccess'));
    };

    const handleUnsubscribe = () => {
        localStorage.removeItem('newsletter_subscribed');
        localStorage.removeItem('newsletter_email');
        localStorage.removeItem('newsletter_frequency');
        setSubscribed(false);
        setEmail('');
        toast.success(t('newsletter.unsubscribeSuccess'));
    };

    if (subscribed) {
        const savedEmail = localStorage.getItem('newsletter_email') || '';
        const savedFrequency = localStorage.getItem('newsletter_frequency') || 'daily';
        return (
            <div className="bg-gradient-to-br from-green-500/10 to-accent/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span className="text-sm font-semibold text-green-400">{t('newsletter.subscribed')}</span>
                </div>
                <p className="text-xs text-secondary mb-1">{savedEmail}</p>
                <p className="text-[10px] text-secondary/60 mb-2 capitalize">{t('newsletter.digestLabel', { frequency: savedFrequency })}</p>
                <button
                    onClick={handleUnsubscribe}
                    className="text-[10px] text-secondary hover:text-red-400 transition-colors"
                >
                    {t('newsletter.unsubscribe')}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span className="text-sm font-semibold text-white">{t('newsletter.title')}</span>
            </div>
            <p className="text-[10px] text-secondary mb-3">{t('newsletter.description')}</p>
            <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('newsletter.emailPlaceholder')}
                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-secondary/50 focus:outline-none focus:border-accent/50"
                />
                <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent/50"
                >
                    <option value="daily">{t('newsletter.freqDaily')}</option>
                    <option value="weekly">{t('newsletter.freqWeekly')}</option>
                    <option value="breaking">{t('newsletter.freqBreaking')}</option>
                </select>
                <button
                    type="submit"
                    className="w-full bg-accent text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-accent/80 transition-colors"
                >
                    {t('newsletter.subscribe')}
                </button>
            </form>
        </div>
    );
};

export default NewsletterSignup;
