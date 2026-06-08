// Article-level dedup helpers.
//
// A new feed item is treated as a duplicate of an existing article when EITHER:
//   (a) its canonical URL exactly matches an already-stored canonical URL, OR
//   (b) it comes from the same source and its title is at least
//       TITLE_MATCH_THRESHOLD similar (token Jaccard) to a recently-stored title.
//
// To stay within Cloudflare's per-invocation subrequest budget, the fetch loop
// loads the comparison data for a whole source in just THREE D1 reads
// (loadDedupContext) and then runs the pure, in-memory isDuplicate() check per
// item — instead of issuing 1-2 D1 queries for every single feed item.

import type { Env } from './env';

/** Title Jaccard score at/above which two same-source titles are "the same story". */
export const TITLE_MATCH_THRESHOLD = 0.85;

/** Cross-source clustering is stricter than same-source dedup (a higher bar avoids
 *  merging two genuinely different stories that share a few headline words). */
const CLUSTER_MATCH_THRESHOLD = 0.9;

/** How far back to look for same-source title matches, and how many rows to compare. */
const RECENT_TITLE_WINDOW_HOURS = 48;
const RECENT_TITLE_LIMIT = 50;

/** Window + cap for the cross-source primary pool (the rows a new item is clustered against). */
const RECENT_PRIMARY_WINDOW_HOURS = 48;
const RECENT_PRIMARY_LIMIT = 250;

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
export function titleSimilarity(titleA: string, titleB: string): number {
  return jaccardSets(tokenizeTitle(titleA), tokenizeTitle(titleB));
}

/** Jaccard over two precomputed token sets. */
function jaccardSets(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) if (tokensB.has(token)) intersection++;
  return intersection / (tokensA.size + tokensB.size - intersection);
}

/**
 * Strip wire-service code prefixes that one outlet keeps and another drops — e.g. BSS copy
 * runs "BSS-24 ..." / "BFF-16 ..." / "ZCZC BSS-22 ..." while Daily Star republishes the bare
 * headline. Without stripping, those 1-2 prefix tokens drag the cross-source Jaccard below
 * threshold.
 */
function stripWireServicePrefix(title: string): string {
  return (title ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/^\s*(?:zczc\s+)?(?:[a-z]{2,6}-\d{1,5}\s+)+/i, ' ');
}

/**
 * Tokenize a title for CROSS-SOURCE clustering. Same as tokenizeTitle, but first strips
 * wire-service code prefixes (see stripWireServicePrefix) so republished copy still clusters.
 */
export function clusterTokensFromTitle(title: string): Set<string> {
  return new Set(stripWireServicePrefix(title).split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1));
}

/** Preloaded comparison data for deduping one source's batch of feed items. */
export type DedupContext = {
  /** Canonical URLs that already exist in the DB (global match). */
  existingCanonicalUrls: Set<string>;
  /** Recent titles from this source as precomputed token sets, for fuzzy same-source
   *  matching (tokenized once at load, so isDuplicate never re-tokenizes them per item). */
  recentSourceTitles: Set<string>[];
  /** Recent PRIMARY articles across ALL sources (duplicate_of IS NULL), for cross-source
   *  clustering: a new item that matches one of these is tagged as its duplicate. */
  recentPrimaries: { id: number; tokens: Set<string> }[];
};

/**
 * Load everything needed to dedup a batch of feed items for one source in exactly
 * THREE D1 reads:
 *   1. which of the candidate canonical URLs already exist (a single `IN (...)` query),
 *   2. the most recent titles from this source (for the fuzzy same-source title check), and
 *   3. the recent cross-source PRIMARY articles (for cross-source clustering).
 *
 * All three reads count toward the per-invocation subrequest budget, so the caller is
 * expected to decrement its budget by 3.
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

  // Recent primaries across ALL sources, for cross-source clustering. Same-cycle earlier
  // sources are already committed, so their primaries are included here.
  const primaryCutoffIso = new Date(Date.now() - RECENT_PRIMARY_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const primaryRows = await env.DB.prepare(
    `SELECT id, title FROM news_articles
     WHERE duplicate_of IS NULL AND is_active = 1 AND created_at >= ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(primaryCutoffIso, RECENT_PRIMARY_LIMIT).all<{ id: number; title: string }>();

  return {
    existingCanonicalUrls,
    recentSourceTitles: (titleRows.results ?? []).map((row) => tokenizeTitle(row.title)),
    recentPrimaries: (primaryRows.results ?? []).map((row) => ({ id: row.id, tokens: clusterTokensFromTitle(row.title) })),
  };
}

/** Pure, in-memory duplicate check against a preloaded DedupContext. */
export function isDuplicate(context: DedupContext, canonicalUrl: string, title: string): boolean {
  if (context.existingCanonicalUrls.has(canonicalUrl)) return true;
  // Tokenize the new title ONCE, then compare against the source's precomputed token sets.
  const titleTokens = tokenizeTitle(title);
  for (const existingTokens of context.recentSourceTitles) {
    if (jaccardSets(titleTokens, existingTokens) >= TITLE_MATCH_THRESHOLD) return true;
  }
  return false;
}

/**
 * Cross-source clustering: if `title` is the same story as a recent PRIMARY article from
 * any source (cluster-token Jaccard >= CLUSTER_MATCH_THRESHOLD), return that primary's id
 * so the caller can store this item as its duplicate. Returns null when it's a new story.
 * Very short titles (< 3 tokens) are never clustered — too little signal, too risky.
 */
export function findClusterPrimary(context: DedupContext, title: string): number | null {
  const tokens = clusterTokensFromTitle(title);
  if (tokens.size < 3) return null;
  for (const primary of context.recentPrimaries) {
    if (jaccardSets(tokens, primary.tokens) >= CLUSTER_MATCH_THRESHOLD) return primary.id;
  }
  return null;
}
