import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    twitterCard?: string;
}

const SEO = ({
    title,
    description = 'Stay updated with the latest headlines from trusted news sources worldwide. Real-time news aggregation with smart categorization and personalized reading experience.',
    image = '/og-image.jpg',
    url = typeof window !== 'undefined' ? window.location.href : 'https://newsportal.com',
    type = 'website',
    siteName = 'NewsPortal',
    twitterCard = 'summary_large_image',
}: SEOProps) => {
    const fullTitle = title ? `${title} - ${siteName}` : siteName;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta property="twitter:card" content={twitterCard} />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Additional SEO */}
            <meta name="application-name" content={siteName} />
            <meta name="theme-color" content="#8b5cf6" />
        </Helmet>
    );
};

export default SEO;
