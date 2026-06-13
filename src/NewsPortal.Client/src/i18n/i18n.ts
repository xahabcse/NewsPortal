import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationBN from './locales/bn/translation.json';

const resources = {
    en: {
        translation: translationEN
    },
    bn: {
        translation: translationBN
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: ['en', 'bn'],
        debug: false,
        interpolation: {
            escapeValue: false // React already escapes
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

// Keep <html lang> in sync with the active language (accessibility + SEO).
const applyHtmlLang = (lng: string) => {
    if (typeof document !== 'undefined') document.documentElement.lang = lng;
};
applyHtmlLang(i18n.language || 'en');
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
