# NewsPortal.Api.Hono

Hono.js + TypeScript REST API for the NewsPortal aggregation platform, deployed on **Cloudflare Workers**.

This project runs **alongside** the legacy `NewsPortal.Api` (ASP.NET Core 8) — both serve the same domain model from a different data layer. Switch between them via the React client's `VITE_API_URL`.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Hono.js 4 |
| Runtime | Cloudflare Workers |
| Language | TypeScript 5.9 |
| Database | Cloudflare D1 (SQLite-compatible) |
| Cache | Cloudflare KV |
| Image storage | Cloudinary (same account as Portfolio) |
| Auth | JWT (HS256) via `hono/jwt` |
| Deploy | `cloudflare/wrangler-action@v4` on push to `main` |

## Scripts

```bash
npm install              # install deps
npm run dev              # local dev — wrangler dev on http://localhost:8787
npm run typecheck        # tsc --noEmit
npm run deploy           # wrangler deploy (manual deploy)
npm run migrate:local    # apply D1 migrations to local DB
npm run migrate:remote   # apply D1 migrations to remote DB
npm run seed:local       # seed local D1 (categories, sources, users)
npm run seed:remote      # seed remote D1
```

## First-time Setup (per machine)

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create the D1 database (returns a database_id)
npx wrangler d1 create newsportal
# → copy the database_id into wrangler.toml

# 3. Create the KV namespace (returns an id)
npx wrangler kv namespace create CACHE_KV
# → copy the id into wrangler.toml

# 4. Apply migrations to remote DB
npm run migrate:remote

# 5. Seed remote DB
npm run seed:remote

# 6. Set secrets (interactive prompts — never commit these)
npx wrangler secret put JWT_SECRET           # >= 32 chars
npx wrangler secret put GOOGLE_CLIENT_ID      # OAuth client ID
npx wrangler secret put GEMINI_API_KEY        # rotated key
npx wrangler secret put CLOUDINARY_API_SECRET # Cloudinary secret

# 7. Deploy
npm run deploy
```

## Project Structure

```text
src/
├── index.ts                # Hono app entry — CORS + route mounting
├── lib/                    # Shared helpers
│   ├── env.ts              # TypeScript bindings type
│   ├── db.ts               # D1 helpers (nowIso, toDbBool, ...)
│   ├── auth.ts             # JWT middleware + role guards
│   ├── response.ts         # successResult / errorResult / pagedResult
│   ├── cache.ts            # KV wrapper (get/set/invalidate, TTL)
│   ├── slug.ts             # Bengali-safe slug generator
│   ├── password.ts         # bcryptjs wrapper
│   └── cloudinary.ts       # Image upload + delete
├── jobs/
│   └── fetch-news.ts       # Cron handlers — scheduled news fetching
├── routes/                 # Route handlers — one file per controller (21 files)
│   └── auth, news, feed, sitemap, robots, health, bookmarks, comments,
│       reactions, reports, read-history, news-sources, fetch-jobs, admin,
│       admin-articles, user-management, analytics, images, ai, sse, logs
migrations/                 # D1 SQL migrations
├── 0001_init.sql           # Consolidated initial schema
├── 0002_app_logs.sql       # App logs table
├── 0003_dedup_cluster.sql  # Dedup clustering columns
seed/
└── seed.sql                # Categories, news sources, seed users
```

## Migrations

D1 migrations are plain `.sql` files in `migrations/`. Apply them with:

```bash
npm run migrate:local       # for `wrangler dev`
npm run migrate:remote      # for the deployed Worker's D1
```

Schema is intentionally a **consolidated snapshot** of the current PostgreSQL schema (12 EF migrations collapsed into one). Future schema changes add new numbered SQL files.

## Local Development

```bash
# 1. Install
npm install

# 2. Apply local D1 migrations
npm run migrate:local

# 3. Seed local D1
npm run seed:local

# 4. Run dev server — uses a local D1 in `.wrangler/`
npm run dev
# → API at http://localhost:8787
```

For local secrets (only on your machine, never committed) create a `.dev.vars` file:

```ini
JWT_SECRET=local_dev_secret_at_least_32_chars_long
GOOGLE_CLIENT_ID=your_google_client_id
GEMINI_API_KEY=your_gemini_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

## API Compatibility

The Hono API mirrors the legacy ASP.NET Core API path structure (`/api/v1/...`) so the frontend can switch between them by changing `VITE_API_URL`. Response shape is wrapped:

```json
{ "success": true, "data": { ... }, "message": "OK" }
```

## Phase Status

| Phase | Status |
|-------|--------|
| 1 — Pages frontend deploy | ✅ Live in production |
| 2 — Hono scaffold + auth + read-only news | ✅ Live in production |
| 3 — Write endpoints + cache + admin | ✅ Live in production |
| 4 — Cloudinary image handling | ✅ Live in production |
| 5 — Cron Triggers for news fetch | ✅ Live in production |
| 6 — SSE realtime + production cutover | ✅ Live in production |
