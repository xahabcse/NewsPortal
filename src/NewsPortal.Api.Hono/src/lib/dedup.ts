// Article-level dedup helpers.
// Two articles are considered duplicates if:
//   (a) they share the same canonical URL OR
//   (b) the title similarity ratio is >= 0.85.

import type { Env } from './env';

/** Token-based Jaccard similarity for titles. */
export function titleSimilarity(a: string, b: string): number {
  const aTokens = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  const bTokens = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersect = 0;
  for (const t of aTokens) if (bTokens.has(t)) intersect++;
  const union = aTokens.size + bTokens.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/** Return existing article id if a duplicate is found, otherwise null. */
export async function findDuplicate(
  env: Env['Bindings'],
  canonicalUrl: string,
  title: string,
  sourceId: number
): Promise<number | null> {
  // 1. Exact canonical match.
  const canonical = await env.DB.prepare(
    'SELECT id FROM news_articles WHERE canonical_url = ? LIMIT 1'
  ).bind(canonicalUrl).first<{ id: number }>();
  if (canonical) return canonical.id;

  // 2. Same source + similar title within the last 48h (cheap window check).
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const candidates = await env.DB.prepare(
    'SELECT id, title FROM news_articles WHERE source_id = ? AND created_at >= ? LIMIT 50'
  ).bind(sourceId, cutoff).all<{ id: number; title: string }>();

  for (const candidate of candidates.results ?? []) {
    if (titleSimilarity(title, candidate.title) >= 0.85) return candidate.id;
  }
  return null;
}
