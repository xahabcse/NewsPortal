// Per-source article-body container selectors, keyed by news_sources.slug.
// Verified by curling real article pages (see report). When a slug isn't
// listed, the extractor walks GENERIC_SELECTORS in order until one yields
// enough text. Some sites are JS SPAs and won't carry body HTML server-side;
// those fall back to the RSS summary gracefully.

export const SOURCE_SELECTORS: Record<string, string> = {
  'bangla-tribune': '.jw_detail_content_holder',          // verified: 19 hits, real <p>
  'prothom-alo': '.story-element',                         // verified: story-element-text > div > p
  'daily-star': '.field--name-body, .block-field-blocknodenewsbody', // Drupal body field
  'bss': '.dtl_section',                                   // verified: /news/{id} article body section
  'bbc-news': 'article',                                   // verified: <article> wraps text-block <p>
  'al-jazeera': '.wysiwyg',                                // verified: .wysiwyg--all-content holds the body <p>
  'npr-news': '#storytext',                                // verified: NPR body lives in #storytext
};

// Tried in order; first selector whose plainText >= MIN_CHARS wins.
export const GENERIC_SELECTORS: string[] = [
  '[itemprop="articleBody"]',
  'article [class*="content"]',
  '.story-element',
  '.content-detail',
  '.jw_detail_content_holder',
  'article',
  'main',
];

// Client-rendered (JS SPA) sources whose article body is NOT in the server HTML —
// the page ships a near-empty shell and hydrates via JS, so HTMLRewriter (server-side,
// no JS execution) can never extract a body. We skip the page fetch + extraction for
// these entirely: it saves one subrequest AND all the HTMLRewriter CPU that would just
// fail across the whole fallback selector list. They stay summary-only (headline + RSS
// summary + lead image), which is the same outcome — minus the wasted work.
// Truly client-rendered sources with no server body AND no JSON-LD articleBody.
// Currently empty: every active source turned out to be server-rendered (BSS at
// /news/{id}, Al Jazeera .wysiwyg, NPR #storytext) or ships JSON-LD (CNN). Kept as a
// hook for future sources that genuinely can't be extracted server-side.
export const SPA_SOURCE_SLUGS: string[] = [];
const SPA_SOURCES = new Set(SPA_SOURCE_SLUGS);

export function isSpaSource(slug: string): boolean {
  return SPA_SOURCES.has(slug);
}

/**
 * Normalise an article URL before fetching its body. Some feeds link to a non-article
 * variant (e.g. BSS RSS points at /subscriber/{id}, a paywall shell, while the real
 * server-rendered article lives at /news/{id}).
 */
export function normalizeArticleUrl(slug: string, url: string): string {
  if (slug === 'bss') return url.replace('/subscriber/', '/news/');
  return url;
}

/** Resolve the ordered list of selectors to try for a given source slug. */
export function selectorsForSource(slug: string): string[] {
  const specific = SOURCE_SELECTORS[slug];
  if (specific) {
    // Specific first, then generic fallbacks (minus the one we already tried).
    return [specific, ...GENERIC_SELECTORS.filter((g) => g !== specific)];
  }
  return GENERIC_SELECTORS;
}
