// Minimal RSS / Atom feed parser implemented with regex.
// Workers don't ship a DOM parser, and a full XML parser is overkill here —
// the feeds we ingest are well-formed and we only care about a handful of fields.

export type FeedItem = {
  title: string;
  link: string;
  description: string | null;
  /** Raw <content:encoded> HTML (CDATA-unwrapped), when the feed ships the full body. */
  contentEncoded: string | null;
  publishedAt: Date | null;
  author: string | null;
  imageUrl: string | null;
  guid: string | null;
};

/** Convert a code point to a string, tolerating out-of-range / malformed values. */
function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    // Hex numeric entities (the previous parser silently dropped these).
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => safeFromCodePoint(parseInt(n, 16)))
    // Decimal numeric entities — fromCodePoint handles astral chars (emoji) correctly.
    .replace(/&#(\d+);/g, (_, n) => safeFromCodePoint(parseInt(n, 10)));
}

function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractTagContent(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(block);
  return m ? decodeEntities(m[1]).trim() : null;
}

/** Like extractTagContent but keeps the inner markup intact (only unwraps CDATA). */
function extractRawTagContent(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(block);
  if (!m) return null;
  const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return raw || null;
}

function extractAttr(block: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*\\/?>`, 'i');
  const m = re.exec(block);
  return m ? decodeEntities(m[1]) : null;
}

function extractImage(block: string): string | null {
  // Common image carriers in RSS/Atom: <enclosure url=>, <media:content url=>, <media:thumbnail url=>, <image><url>, <img src=> in description
  let url =
    extractAttr(block, 'enclosure', 'url') ||
    extractAttr(block, 'media:content', 'url') ||
    extractAttr(block, 'media:thumbnail', 'url');
  if (url) return url;

  const imgInImage = extractTagContent(block, 'image\\s*>\\s*<url');
  if (imgInImage) return imgInImage;

  const desc = extractTagContent(block, 'description') ?? extractTagContent(block, 'content:encoded') ?? '';
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(desc);
  if (m) return m[1];

  return null;
}

export function parseFeed(xml: string): FeedItem[] {
  if (!xml) return [];

  // Try RSS 2.0 first, then Atom.
  const isAtom = /<feed[\s>]/i.test(xml);
  const itemRegex = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;

  const items: FeedItem[] = [];
  for (const match of xml.matchAll(itemRegex)) {
    const block = match[0];

    const title = stripTags(extractTagContent(block, 'title') ?? '');
    let link: string | null;
    if (isAtom) {
      link = extractAttr(block, 'link', 'href');
    } else {
      // Prefer the text-node <link>; fall back to an Atom-style href attribute
      // (some RSS 2.0 items carry the article URL only as <link href="...">).
      link = extractTagContent(block, 'link') || extractAttr(block, 'link', 'href');
    }
    if (!title || !link) continue;

    const description =
      extractTagContent(block, 'description') ||
      extractTagContent(block, 'summary') ||
      extractTagContent(block, 'content') ||
      null;

    const pubStr = extractTagContent(block, 'pubDate') || extractTagContent(block, 'published') || extractTagContent(block, 'updated');
    const publishedAt = pubStr ? new Date(pubStr) : null;

    const author =
      extractTagContent(block, 'dc:creator') ||
      stripTags(extractTagContent(block, 'author') ?? '') ||
      null;

    items.push({
      title,
      link: link.trim(),
      description: description ? stripTags(description).slice(0, 1000) : null,
      contentEncoded: extractRawTagContent(block, 'content:encoded'),
      publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
      author,
      imageUrl: extractImage(block),
      guid: extractTagContent(block, 'guid') || extractTagContent(block, 'id'),
    });
  }
  return items;
}

/** Normalise a URL into a canonical form for dedup. */
// Tracking / campaign params to strip before keying. Denylist (prefix + known
// keys) rather than a fixed allowlist, so outlet-specific params like Guardian's
// CMP or BBC's at_* don't defeat exact-URL dedup.
const TRACKING_PARAM_PREFIX = /^(utm_|at_|mc_|pk_|piwik_)/i;
const TRACKING_PARAM_KEYS = new Set([
  'fbclid', 'gclid', 'igshid', 'cmp', 'ref', 'ref_src', 'ocid', 'cmpid', 'spm', 'mc_cid', 'mc_eid',
]);

export function canonicalize(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAM_PREFIX.test(key) || TRACKING_PARAM_KEYS.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    u.hash = '';
    // Drop trailing slash on path (except root).
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    // Lowercase the whole URL for a stable dedup key (matches existing stored keys).
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
