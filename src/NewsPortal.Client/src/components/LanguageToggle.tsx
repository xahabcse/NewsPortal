import { useTranslation } from 'react-i18next';

const LanguageToggle = () => {
    const { i18n } = useTranslation();

    const currentLang = i18n.language || 'en';

    const toggleLanguage = () => {
        const newLang = currentLang === 'en' ? 'bn' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-glass-border text-xs text-secondary hover:text-white hover:bg-white/10 transition-colors"
            title={currentLang === 'en' ? 'Switch to Bangla' : 'Switch to English'}
        >
            {currentLang === 'en' ? 'বাংলা' : 'EN'}
        </button>
    );
};

export default LanguageToggle;
