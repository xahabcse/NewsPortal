---
name: build-check
description: Run the local production build + typecheck for the React client and the Hono API, and report size/warnings — without deploying.
user_invocable: true
---

# Build Check (no deploy)

Catch type/build errors locally before pushing. **Does not deploy.**

## Frontend (React client)

```bash
npm --prefix src/NewsPortal.Client run build    # tsc -b && vite build
```

Report: build pass/fail, any TypeScript errors, and the bundle sizes / Vite warnings from the output. (The PWA precache step running is normal.)

## Backend (Hono API)

```bash
npm --prefix src/NewsPortal.Api.Hono run typecheck    # tsc --noEmit
```

Report: typecheck pass/fail and any errors. (The Worker isn't "built" locally beyond typecheck; `wrangler deploy --minify` bundles it in CI.)

## Optional — local Worker + D1 smoke

```bash
cd src/NewsPortal.Api.Hono
npx wrangler d1 migrations apply newsportal --local   # safe, local emulator
npx wrangler dev                                       # local Worker on :8787
```

## What to report

- ✅/❌ for client build and API typecheck.
- Any errors verbatim (file:line).
- Client bundle sizes + notable Vite/Rollup warnings.
- Do **not** commit, push, or deploy — that's `/deploy`.
