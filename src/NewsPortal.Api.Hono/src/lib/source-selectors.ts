// Per-source article-body container selectors, keyed by news_sources.slug.
// Verified by curling real article pages (see report). When a slug isn't
// listed, the extractor walks GENERIC_SELECTORS in order until one yields
// enough text. Some sites are JS SPAs and won't carry body HTML server-side;
// those fall back to the RSS summary gracefully.

export const SOURCE_SELECTORS: Record<string, string> = {
  'bangla-tribune': '.jw_detail_content_holder',          // verified: 19 hits, real <p>
  'prothom-alo': '.story-element',                         // verified: story-element-text > div > p
  'daily-star': '.field--name-body, .block-field-blocknodenewsbody', // Drupal body field
  'bss': '.headline_content_block',                        // verified: real <p> inside
  'bbc-news': 'article',                                   // verified: <article> wraps text-block <p>
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

/** Resolve the ordered list of selectors to try for a given source slug. */
export function selectorsForSource(slug: string): string[] {
  const specific = SOURCE_SELECTORS[slug];
  if (specific) {
    // Specific first, then generic fallbacks (minus the one we already tried).
    return [specific, ...GENERIC_SELECTORS.filter((g) => g !== specific)];
  }
  return GENERIC_SELECTORS;
}
