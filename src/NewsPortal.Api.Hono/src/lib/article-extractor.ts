// Full-article body extractor built on Cloudflare's native HTMLRewriter.
// No DOM library (readability/cheerio/linkedom) — those blow the Worker CPU
// and bundle budget. HTMLRewriter streams the source page once per selector
// and fills closure-state collectors that we assemble into clean HTML.

import { selectorsForSource } from './source-selectors';

export type ExtractResult = { contentHtml: string; plainText: string; images: string[] };

const MIN_CHARS = 200; // below this we treat extraction as failed / wrong selector
// CPU guards (Workers free plan caps active CPU at 10ms/invocation). Each extractOnce
// is a full-page HTMLRewriter parse + JS handler callbacks = real CPU, so we cap how
// many selectors we re-parse with, and refuse oversized pages outright.
const MAX_SELECTOR_ATTEMPTS = 3;
const MAX_HTML_BYTES = 1_500_000;        // HTMLRewriter path: bigger pages spike CPU
const MAX_HTML_BYTES_JSONLD = 6_000_000; // JSON-LD path is cheap, tolerate big SPA pages (e.g. CNN ~4MB)
const MAX_LD_BLOCK = 500_000;            // skip pathologically large ld+json blocks (JSON.parse CPU)

// Block-level tags we re-emit. Inline tags (a/strong/em) are flattened to text.
const BLOCK_TAGS = ['p', 'h2', 'h3', 'li', 'blockquote'] as const;

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Convert a code point to a string, tolerating out-of-range / malformed values. */
function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

// Minimal entity decode for streamed text() chunks (HTMLRewriter gives raw text).
function decode(s: string): string {
  return s
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
    // fromCodePoint (not fromCharCode) so astral chars like emoji decode correctly.
    .replace(/&#(\d+);/g, (_, n) => safeFromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeFromCodePoint(parseInt(n, 16)));
}

function isBadImage(url: string): boolean {
  if (!url) return true;
  if (url.startsWith('data:')) return true;
  if (/\b(spacer|pixel|tracking|1x1|blank|logo|icon|sprite|avatar|placeholder)\b/i.test(url)) return true;
  return false;
}

function firstSrcset(srcset: string): string | null {
  // "url1 320w, url2 640w" -> url1
  const first = srcset.split(',')[0]?.trim().split(/\s+/)[0];
  return first || null;
}

// Run HTMLRewriter once for a single content selector.
async function extractOnce(html: string, sel: string, baseUrl: string): Promise<ExtractResult> {
  type Block = { tag: string; text: string };
  const state = {
    blocks: [] as Block[],             // body blocks only (feeds plainText); excludes figcaption
    stack: [] as Block[],              // currently-open block stack (deepest last)
    images: [] as string[],
    // ordered output fragments so images/captions interleave roughly in document order
    fragments: [] as string[],
  };

  const rewriter = new HTMLRewriter();

  // Open a block on the stack. Block tags nest in real article bodies
  // (blockquote>p, li>p), and a text node inside an inner block also matches the
  // outer block's selector — so we route each text chunk to ONLY the deepest open
  // block whose tag equals the firing handler's tag. That fixes both failure modes
  // of the old single-pointer approach: text after an inner block closed was dropped,
  // and text inside an inner block (matched by two selectors) was appended twice.
  for (const tag of BLOCK_TAGS) {
    rewriter.on(`${sel} ${tag}`, {
      element(el) {
        const block: Block = { tag, text: '' };
        state.stack.push(block);
        state.blocks.push(block);
        el.onEndTag(() => {
          const i = state.stack.lastIndexOf(block);
          if (i !== -1) state.stack.splice(i, 1);
          const txt = collapse(decode(block.text));
          if (txt) {
            const outTag = block.tag === 'li' ? 'p' : block.tag; // flatten list items to paragraphs
            state.fragments.push(`<${outTag}>${escapeHtml(txt)}</${outTag}>`);
          }
        });
      },
      text(t) {
        const top = state.stack[state.stack.length - 1];
        if (top && top.tag === tag) top.text += t.text;
      },
    });
  }

  rewriter.on(`${sel} img`, {
    element(el) {
      let src =
        el.getAttribute('src') ||
        el.getAttribute('data-src') ||
        el.getAttribute('data-lazy-src') ||
        (el.getAttribute('srcset') ? firstSrcset(el.getAttribute('srcset')!) : null) ||
        (el.getAttribute('data-srcset') ? firstSrcset(el.getAttribute('data-srcset')!) : null);
      if (!src) return;
      // Skip 1x1 tracking pixels by explicit width/height attrs.
      const w = el.getAttribute('width');
      const h = el.getAttribute('height');
      if ((w === '1' && h === '1') || isBadImage(src)) return;
      let abs: string;
      try {
        abs = new URL(src, baseUrl).toString();
      } catch {
        return;
      }
      if (isBadImage(abs)) return;
      state.images.push(abs);
      state.fragments.push(`<figure><img src="${escapeAttr(abs)}" loading="lazy"/></figure>`);
    },
  });

  // figcaption reuses the same stack buffering as block tags, but is NOT pushed to
  // state.blocks (captions aren't body prose, so they don't count toward plainText).
  rewriter.on(`${sel} figcaption`, {
    element(el) {
      const block: Block = { tag: 'figcaption', text: '' };
      state.stack.push(block);
      el.onEndTag(() => {
        const i = state.stack.lastIndexOf(block);
        if (i !== -1) state.stack.splice(i, 1);
        const txt = collapse(decode(block.text));
        if (txt) state.fragments.push(`<figcaption>${escapeHtml(txt)}</figcaption>`);
      });
    },
    text(t) {
      const top = state.stack[state.stack.length - 1];
      if (top && top.tag === 'figcaption') top.text += t.text;
    },
  });

  const transformed = rewriter.transform(new Response(html));
  await transformed.text(); // drives the stream

  // Join WITHOUT newlines: the article detail UI runs a legacy plain-text
  // transform (\n\n -> </p><p>, \n -> <br/>) on `content`. Our output is already
  // clean block HTML, so emitting zero newlines makes that transform a no-op and
  // avoids spurious <br/> / malformed <p> nesting.
  const contentHtml = state.fragments.join('');
  const plainText = collapse(state.blocks.map((b) => decode(b.text)).join(' '));
  return { contentHtml, plainText, images: state.images };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Extract the article body. Accepts an explicit contentSelector OR omit it to
 * use only the provided baseUrl with a single selector. Returns null if the
 * extracted text is too short (caller falls back to the RSS summary).
 */
export async function extractArticle(
  html: string,
  opts: { contentSelector?: string; baseUrl: string }
): Promise<ExtractResult | null> {
  if (!html || !opts.contentSelector) return null;
  const result = await extractOnce(html, opts.contentSelector, opts.baseUrl);
  if (result.plainText.length < MIN_CHARS) return null;
  return result;
}

/**
 * Extract the article body from JSON-LD (<script type="application/ld+json"> with an
 * `articleBody` field). Cheap — a regex scan + JSON.parse of one block — and works on
 * SPA pages whose visible HTML is empty but still ship JSON-LD for search engines.
 */
function extractJsonLdBody(html: string): ExtractResult | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.length > MAX_LD_BLOCK) continue;
    let data: any;
    try { data = JSON.parse(raw); } catch { continue; }
    const list: any[] = Array.isArray(data) ? data : (data && data['@graph'] ? data['@graph'] : [data]);
    for (const node of list) {
      const body = node && typeof node === 'object' ? node.articleBody : null;
      if (typeof body === 'string' && body.trim().length >= MIN_CHARS) {
        const paras = decode(body).replace(/\r/g, '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
        const contentHtml = paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
        const plainText = collapse(paras.join(' '));
        if (plainText.length >= MIN_CHARS) return { contentHtml, plainText, images: [] };
      }
    }
  }
  return null;
}

/**
 * Try JSON-LD first, then each candidate selector for a source slug; return the first
 * that yields >= MIN_CHARS of text. Null if none do (true SPA / markup change) so the
 * caller keeps the RSS summary.
 */
export async function extractArticleForSource(
  html: string,
  slug: string,
  baseUrl: string
): Promise<ExtractResult | null> {
  if (!html || html.length > MAX_HTML_BYTES_JSONLD) return null;

  // 1) JSON-LD articleBody — most news sites (incl. JS-SPA ones like CNN) embed a
  //    <script type="application/ld+json"> NewsArticle with the full body for SEO. This
  //    is server-rendered and cheap to read (regex + JSON.parse, no HTMLRewriter), so it
  //    works even on huge SPA pages where a streaming parse would blow the CPU budget.
  const ld = extractJsonLdBody(html);
  if (ld) return ld;

  // 2) HTMLRewriter selector path — only for reasonably sized pages (CPU guard). A full
  //    re-parse per selector is the dominant CPU cost, so cap the fallback attempts.
  if (html.length > MAX_HTML_BYTES) return null;
  for (const sel of selectorsForSource(slug).slice(0, MAX_SELECTOR_ATTEMPTS)) {
    try {
      const r = await extractOnce(html, sel, baseUrl);
      if (r.plainText.length >= MIN_CHARS) return r;
    } catch {
      // bad selector or rewriter error — try next
    }
  }
  return null;
}

/**
 * Extract a body from feed-supplied HTML (an RSS <content:encoded> payload).
 *
 * Pure regex over a small, already-clean fragment — no HTMLRewriter, no page
 * fetch — so it is CPU-cheap and lets the fetcher skip the expensive article-page
 * fetch + parse entirely when the feed already ships the full body. Returns null
 * when the fragment yields less than MIN_CHARS so the caller can fall back.
 */
export function extractFromFeedHtml(html: string, baseUrl: string): ExtractResult | null {
  if (!html) return null;

  // Drop non-content blocks before reading text.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  const fragments: string[] = [];
  const plainParts: string[] = [];
  const images: string[] = [];

  // Collect images (absolute-resolved, tracking pixels filtered out).
  for (const m of cleaned.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcMatch =
      /\bsrc=["']([^"']+)["']/i.exec(tag) ||
      /\bdata-src=["']([^"']+)["']/i.exec(tag);
    if (!srcMatch) continue;
    let absolute: string;
    try {
      absolute = new URL(decode(srcMatch[1]), baseUrl).toString();
    } catch {
      continue;
    }
    if (isBadImage(absolute)) continue;
    images.push(absolute);
  }

  // Collect block-level text in document order.
  const blockRegex = /<(p|h2|h3|h4|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of cleaned.matchAll(blockRegex)) {
    const tag = m[1].toLowerCase();
    const text = collapse(decode(m[2].replace(/<[^>]+>/g, ' ')));
    if (!text) continue;
    const outTag = tag === 'li' ? 'p' : tag; // flatten list items to paragraphs
    fragments.push(`<${outTag}>${escapeHtml(text)}</${outTag}>`);
    plainParts.push(text);
  }

  // Fallback: no recognised block tags — treat the whole fragment as one paragraph.
  if (fragments.length === 0) {
    const text = collapse(decode(cleaned.replace(/<[^>]+>/g, ' ')));
    if (text.length < MIN_CHARS) return null;
    return { contentHtml: `<p>${escapeHtml(text)}</p>`, plainText: text, images };
  }

  const plainText = collapse(plainParts.join(' '));
  if (plainText.length < MIN_CHARS) return null;
  return { contentHtml: fragments.join(''), plainText, images };
}
