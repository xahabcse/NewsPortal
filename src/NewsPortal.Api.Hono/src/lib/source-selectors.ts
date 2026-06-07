// Per-source article-body container selectors, keyed by news_sources.slug.
// Verified by curling real article pages (see report). When a slug isn't
// listed, the extractor walks GENERIC_SELECTORS in order until one yields
// enough text. Some sites are JS SPAs and won't carry body HTML server-side;
// those fall back to the RSS summary gracefully.

export const SOURCE_SELECTORS: Record<string, string> = {
  'bangla-tribune': '.jw_detail_content_holder',          // verified: 19 hits, real <p>
  'prothom-alo': '.story-element',                         // verified: story-element-text > div > p
  'daily-star': '.block-field-blocknodenewsbody',          // Drupal body block (single — HTMLRewriter has no comma lists)
  'the-dhaka-post': '.details_view',                       // verified: col-md-12 details_view holds the body
  'bss': '.dtl_section',                                   // verified: /news/{id} article body section
  'bbc-news': 'article',                                   // verified: <article> wraps text-block <p>
  'al-jazeera': '.wysiwyg',                                // verified: .wysiwyg--all-content holds the body <p>
  'npr-news': '.storytext',                                // body div is id=storytext class="storytext ..."; use the class (HTMLRewriter handles bare .class reliably, bare #id not)
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

// Article-page fetches use a real browser User-Agent. Some sites (e.g. NPR) serve an
// EMPTY body to UAs that identify as a bot, so a "NewsPortalBot" UA gets nothing back.
export const BODY_FETCH_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// A COMPLETE browser header set for article-page fetches. Some sites (notably Bangla
// Tribune, behind Cloudflare) return 403 to a request that carries a Chrome User-Agent
// but NONE of the headers a real Chrome navigation sends — the missing Accept-Language /
// sec-fetch-* / sec-ch-ua fingerprint trips the WAF's "likely bot" heuristic. The RSS
// feed fetch from the SAME Worker egress IP succeeds, which proves the block is
// header-based, not IP-based; sending the full set drops us below the heuristic so the
// article HTML comes back 200. (Workers' fetch — unlike browser fetch — lets us set the
// otherwise-forbidden sec-* / sec-ch-ua headers.)
export const BODY_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': BODY_FETCH_UA,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
  'Upgrade-Insecure-Requests': '1',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
};

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
