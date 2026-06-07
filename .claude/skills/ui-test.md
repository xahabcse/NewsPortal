---
name: ui-test
description: Playwright MCP smoke test of the LIVE NewsPortal site — home, article, search, category, trending, bookmarks, login, theme, i18n — at mobile / tablet / desktop widths, with PWA cache cleared first. Read-only; reports pass/fail + screenshots.
user_invocable: true
---

# UI Test (live Playwright smoke)

Drive a real browser against the **live** site and report what works. Read-only — never edits code or deploys. For a full run, delegate to the **`ui-tester`** agent; this skill is the checklist.

## Target

- **App:** <https://news.xahabcse.me> (default; or a dev/preview URL if given).
- Test at **375×812** (mobile), **768×1024** (tablet), **1280×900** (desktop) via `browser_resize`.

## Step 0 — clear the PWA cache (always)

```js
// browser_evaluate, then re-navigate (a ?v=... cache-bust confirms a clean load)
async () => {
  if ('serviceWorker' in navigator) { const r = await navigator.serviceWorker.getRegistrations(); for (const x of r) await x.unregister(); }
  if (window.caches) { const k = await caches.keys(); for (const c of k) await caches.delete(c); }
  return 'cleared';
}
```

## Checklist (per width)

1. **Home `/`** — greeting + weather widget render; article cards load; infinite scroll fires; "All News" + filter buttons sit on one row (wrap cleanly on mobile).
2. **Article `/news/:slug`** — open a card → title/body, reading time, related articles, lazy comments; back navigation restores scroll.
3. **Search `/search`** — query returns results; source/category/date filters apply.
4. **Category `/category/:slug`** + **Trending `/trending`** — lists render.
5. **Auth** — `/login` with a seed account (`reader/reader`); `/register` defaults to Reader.
6. **Bookmarks `/bookmarks`** — save/unsave reflects (after login).
7. **Theme toggle** — dark ↔ light flips, text stays readable (WCAG contrast).
8. **i18n toggle** — bn ↔ en swaps strings; no missing keys / raw key names.
9. After each navigation, check `browser_console_messages` (errors) — ignore the known Cloudflare Insights beacon noise; flag anything else.

## Output

- Save screenshots + console logs under `.playwright-mcp/`.
- Return a pass/fail table; for each failure: steps, expected vs actual, screenshot, console error, and which agent should fix it (`react-client-engineer` / `ui-ux-designer` / `hono-api-engineer` / `bn-en-translator`).

## Rules

- Seed/dev accounts only — never real users. No destructive admin actions on live data. Never auto-pick a mail address.
