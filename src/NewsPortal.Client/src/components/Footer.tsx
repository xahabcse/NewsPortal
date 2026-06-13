import { useTranslation } from 'react-i18next';
import versionData from '../version.json';

/**
 * Global site footer. Shows the brand tagline and the current app version
 * (auto-bumped on every push — see scripts/version-bump.cjs + ci-dev.yml).
 * The version is read from src/version.json, the single source of truth.
 */
const Footer = () => {
    const { t } = useTranslation();
    const year = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t border-glass-border px-4 sm:px-8 py-5">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary">
                <p className="text-center sm:text-left">
                    © {year} NewsPortal · {t('app.tagline')}
                </p>
                <span
                    className="inline-flex items-center gap-1.5 font-mono shrink-0"
                    title={`NewsPortal v${versionData.version}`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    v{versionData.version}
                </span>
            </div>
        </footer>
    );
};

export default Footer;
