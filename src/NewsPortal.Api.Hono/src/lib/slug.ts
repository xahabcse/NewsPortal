// Bengali-aware slug generator — TypeScript port of NewsPortal.Core.Helpers.SlugHelper.
// Keeps Bengali characters intact, lowercases ASCII, replaces whitespace and
// most punctuation with a single dash, and trims length to 200.

const MAX_LEN = 200;

export function makeSlug(input: string): string {
  if (!input) return '';

  let slug = input.normalize('NFKC').trim();

  // Replace whitespace / underscores / common punctuation with dashes.
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/[.,!?:;'"<>\\/\[\]{}()=+*&^%$#@~`|]+/g, '-');

  // Drop ASCII control chars.
  slug = slug.replace(/[\x00-\x1F\x7F]/g, '');

  // Lowercase ASCII letters; leave Bengali code points alone.
  slug = slug.replace(/[A-Z]/g, (ch) => ch.toLowerCase());

  // Collapse multiple dashes and trim leading/trailing dashes.
  slug = slug.replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (slug.length > MAX_LEN) {
    slug = slug.slice(0, MAX_LEN).replace(/-+$/, '');
  }

  return slug;
}

/** Append a numeric suffix when collisions occur, e.g. `my-title-2`. */
export function withSuffix(base: string, n: number): string {
  if (!n || n < 2) return base;
  const suffix = `-${n}`;
  if (base.length + suffix.length <= MAX_LEN) return base + suffix;
  return base.slice(0, MAX_LEN - suffix.length).replace(/-+$/, '') + suffix;
}

/**
 * Deterministic short hash (FNV-1a, base36) of an input string. Same input always
 * yields the same 7-char token, so appending it to a slug makes collisions between
 * different articles effectively impossible — no per-insert DB probing needed.
 */
export function shortHash(input: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(0, 7);
}

/** Build a stable, near-unique slug from a title plus a discriminator (e.g. canonical URL). */
export function uniqueSlug(title: string, discriminator: string): string {
  const base = makeSlug(title) || 'article';
  const suffix = `-${shortHash(discriminator)}`;
  if (base.length + suffix.length <= MAX_LEN) return base + suffix;
  return base.slice(0, MAX_LEN - suffix.length).replace(/-+$/, '') + suffix;
}
