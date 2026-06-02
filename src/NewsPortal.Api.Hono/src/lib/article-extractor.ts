// Full-article body extractor built on Cloudflare's native HTMLRewriter.
// No DOM library (readability/cheerio/linkedom) — those blow the Worker CPU
// and bundle budget. HTMLRewriter streams the source page once per selector
// and fills closure-state collectors that we assemble into clean HTML.

import { selectorsForSource } from './source-selectors';

export type ExtractResult = { contentHtml: string; plainText: string; images: string[] };

const MIN_CHARS = 200; // below this we treat extraction as failed / wrong selector

// Block-level tags we re-emit. Inline tags (a/strong/em) are flattened to text.
const BLOCK_TAGS = ['p', 'h2', 'h3', 'li', 'blockquote'] as const;

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
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
    blocks: [] as Block[],
    current: null as Block | null,    // currently-open block-level element (p/h2/.../figcaption)
    images: [] as string[],
    // ordered output fragments so images/captions interleave roughly in document order
    fragments: [] as string[],
  };

  const rewriter = new HTMLRewriter();

  for (const tag of BLOCK_TAGS) {
    rewriter.on(`${sel} ${tag}`, {
      element(el) {
        const block: Block = { tag, text: '' };
        state.current = block;
        state.blocks.push(block);
        el.onEndTag(() => {
          const txt = collapse(decode(block.text));
          if (txt) {
            const outTag = block.tag === 'li' ? 'p' : block.tag; // flatten list items to paragraphs
            state.fragments.push(`<${outTag}>${escapeHtml(txt)}</${outTag}>`);
          }
          state.current = null;
        });
      },
      text(t) {
        if (state.current && state.current.tag !== 'figcaption') state.current.text += t.text;
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

  // figcaption reuses the same open-block buffering as block tags, but isn't
  // counted toward plainText (captions aren't body prose). We track it via a
  // separate `current` so its text doesn't bleed into adjacent paragraphs.
  rewriter.on(`${sel} figcaption`, {
    element(el) {
      const block: Block = { tag: 'figcaption', text: '' };
      state.current = block;
      el.onEndTag(() => {
        const txt = collapse(decode(block.text));
        if (txt) state.fragments.push(`<figcaption>${escapeHtml(txt)}</figcaption>`);
        state.current = null;
      });
    },
    text(t) {
      if (state.current && state.current.tag === 'figcaption') state.current.text += t.text;
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
 * Try each candidate selector for a source slug in order; return the first
 * that yields >= MIN_CHARS of text. Null if none do (likely a JS SPA or markup
 * change) so the caller keeps the RSS summary.
 */
export async function extractArticleForSource(
  html: string,
  slug: string,
  baseUrl: string
): Promise<ExtractResult | null> {
  if (!html) return null;
  for (const sel of selectorsForSource(slug)) {
    try {
      const r = await extractOnce(html, sel, baseUrl);
      if (r.plainText.length >= MIN_CHARS) return r;
    } catch {
      // bad selector or rewriter error — try next
    }
  }
  return null;
}
