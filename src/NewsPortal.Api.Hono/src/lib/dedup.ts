// Article-level dedup helpers.
//
// A new feed item is treated as a duplicate of an existing article when EITHER:
//   (a) its canonical URL exactly matches an already-stored canonical URL, OR
//   (b) it comes from the same source and its title is at least
//       TITLE_MATCH_THRESHOLD similar (token Jaccard) to a recently-stored title.
//
// To stay within Cloudflare's per-invocation subrequest budget, the fetch loop
// loads the comparison data for a whole source in just TWO D1 reads
// (loadDedupContext) and then runs the pure, in-memory isDuplicate() check per
// item — instead of issuing 1-2 D1 queries for every single feed item.

import type { Env } from './env';

/** Title Jaccard score at/above which two same-source titles are "the same story". */
export const TITLE_MATCH_THRESHOLD = 0.85;

/** How far back to look for same-source title matches, and how many rows to compare. */
const RECENT_TITLE_WINDOW_HOURS = 48;
const RECENT_TITLE_LIMIT = 50;

/**
 * Split a title into a set of comparable word tokens.
 *
 * Unicode-aware: the `u` flag + `\p{L}\p{N}` class means Bangla (and any other
 * script) tokenizes correctly. The previous `\W+` split — without the `u` flag —
 * classified every Bengali code point as a separator, so Bangla titles produced
 * an empty token set and fuzzy dedup never fired for the Bangla sources.
 */
export function tokenizeTitle(title: string): Set<string> {
  return new Set(
    (title ?? '')
      .normalize('NFC')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 1)
  );
}

/** Token-based Jaccard similarity between two titles (0..1). */
export function titleSimilarity(a: string, b: string): number {
  const aTokens = tokenizeTitle(a);
  const bTokens = tokenizeTitle(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) if (bTokens.has(token)) intersection++;

  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Preloaded comparison data for deduping one source's batch of feed items. */
export type DedupContext = {
  /** Canonical URLs that already exist in the DB (global match). */
  existingCanonicalUrls: Set<string>;
  /** Recent titles from this source, for fuzzy same-source matching. */
  recentSourceTitles: string[];
};

/**
 * Load everything needed to dedup a batch of feed items for one source in exactly
 * TWO D1 reads:
 *   1. which of the candidate canonical URLs already exist (a single `IN (...)` query), and
 *   2. the most recent titles from this source (for the fuzzy title check).
 *
 * Both reads count toward the per-invocation subrequest budget, so the caller is
 * expected to decrement its budget by 2.
 */
export async function loadDedupContext(
  env: Env['Bindings'],
  candidateCanonicalUrls: string[],
  sourceId: number
): Promise<DedupContext> {
  const existingCanonicalUrls = new Set<string>();

  if (candidateCanonicalUrls.length > 0) {
    const placeholders = candidateCanonicalUrls.map(() => '?').join(',');
    const existingRows = await env.DB.prepare(
      `SELECT canonical_url FROM news_articles WHERE canonical_url IN (${placeholders})`
    ).bind(...candidateCanonicalUrls).all<{ canonical_url: string }>();
    for (const row of existingRows.results ?? []) existingCanonicalUrls.add(row.canonical_url);
  }

  const cutoffIso = new Date(Date.now() - RECENT_TITLE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const titleRows = await env.DB.prepare(
    `SELECT title FROM news_articles
     WHERE source_id = ? AND created_at >= ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(sourceId, cutoffIso, RECENT_TITLE_LIMIT).all<{ title: string }>();

  return {
    existingCanonicalUrls,
    recentSourceTitles: (titleRows.results ?? []).map((row) => row.title),
  };
}

/** Pure, in-memory duplicate check against a preloaded DedupContext. */
export function isDuplicate(context: DedupContext, canonicalUrl: string, title: string): boolean {
  if (context.existingCanonicalUrls.has(canonicalUrl)) return true;
  for (const existingTitle of context.recentSourceTitles) {
    if (titleSimilarity(title, existingTitle) >= TITLE_MATCH_THRESHOLD) return true;
  }
  return false;
}
