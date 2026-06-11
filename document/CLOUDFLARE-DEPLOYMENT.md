# Cloudflare Deployment Guide

This guide is the **one-time setup** to deploy NewsPortal's Cloudflare stack alongside the existing .NET Docker stack. After this, every push to `main` redeploys automatically.

The .NET API and Docker workflow continue to work exactly as before — Cloudflare is an additional deployment target, not a replacement.

---

## What gets deployed

| Component | Where | Source |
|-----------|-------|--------|
| React Client | Cloudflare Pages — `newsportal-client.pages.dev` | `src/NewsPortal.Client/` |
| Hono API | Cloudflare Workers — `newsportal-api-hono.<account>.workers.dev` | `src/NewsPortal.Api.Hono/` |
| Relational data | Cloudflare D1 (`newsportal` database) | `src/NewsPortal.Api.Hono/migrations/*.sql` |
| Cache | Cloudflare KV (`CACHE_KV` namespace) | runtime only |
| Images (Phase 4) | Cloudinary (shared with Portfolio project) | runtime only |

---

## Step 1 — One-time setup (CLI on your machine)

```bash
cd src/NewsPortal.Api.Hono

# 1.1 Install deps
npm install

# 1.2 Login to Cloudflare (same account as Portfolio)
npx wrangler login

# 1.3 Create the D1 database
npx wrangler d1 create newsportal
# → Copy the printed database_id and paste it into wrangler.toml
#   under [[d1_databases]] → database_id

# 1.4 Create the KV namespace
npx wrangler kv namespace create CACHE_KV
# → Copy the printed id and paste it into wrangler.toml
#   under [[kv_namespaces]] → id

# 1.5 Apply migrations to the remote D1
npm run migrate:remote

# 1.6 Seed remote D1 with categories + news sources
npm run seed:remote

# 1.7 Set Worker secrets (interactive prompts; values never logged)
npx wrangler secret put JWT_SECRET            # >= 32 chars; same value as legacy API ideally
npx wrangler secret put GOOGLE_CLIENT_ID      # Same Google OAuth Client ID
npx wrangler secret put GEMINI_API_KEY        # Phase 5 — can defer
npx wrangler secret put CLOUDINARY_API_SECRET # Phase 4 — can defer

# 1.8 First deploy
npm run deploy
# → Note the deployed URL, e.g. https://newsportal-api-hono.<account>.workers.dev
```

After Step 1.8, hit `https://<your-worker-url>/health` to confirm it responds with `{ success: true, data: { status: "healthy", ... } }`.

---

## Step 2 — Cloudflare Pages project (one-time)

The Pages project is created the first time the deploy workflow runs, but the `production_branch` PATCH the workflow makes requires the project to exist already. Easiest path: create it once via dashboard.

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Direct Upload
2. Name: **`newsportal-client`**
3. Production branch: **`main`**
4. Skip the initial upload (the workflow does it).

Or via CLI:

```bash
cd src/NewsPortal.Client
npm install
npm run build
npx wrangler pages deploy dist --project-name newsportal-client --branch main
```

---

## Step 3 — GitHub Secrets

Add these to **Repository Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Token from Cloudflare → My Profile → API Tokens → Create — needs Workers Scripts:Edit, Pages:Edit, D1:Edit, Workers KV:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar (`6b96972c79485e10ed298946c8af5e0b` for the Portfolio account) |
| `VITE_API_URL` | The Worker URL from Step 1.8, e.g. `https://newsportal-api-hono.sujoncep.workers.dev` |

---

## Step 4 — Verify the deploy pipeline

```bash
# Make any small change in src/NewsPortal.Client or src/NewsPortal.Api.Hono
git push origin dev
# → ci-dev.yml runs typecheck + build on the dev branch

# After it passes, merge to main (manually for now)
git checkout main && git merge dev && git push origin main
# → deploy-api-hono.yml runs (if Hono changed) → applies migrations → deploys Worker
# → deploy-client-pages.yml runs (if Client changed) → builds Vite → deploys Pages
```

---

## Local development

```bash
# Terminal 1 — Hono API
cd src/NewsPortal.Api.Hono
npm run dev               # http://localhost:8787

# Terminal 2 — React Client (proxies /api to legacy .NET API by default)
cd src/NewsPortal.Client
npm run dev               # http://localhost:5173
```

To point the dev client at the **local Hono API** instead of the .NET API, run:

```bash
VITE_API_URL=http://localhost:8787 npm run dev
```

For local-only secrets, create `src/NewsPortal.Api.Hono/.dev.vars` (git-ignored):

```ini
JWT_SECRET=local_dev_secret_at_least_32_chars_long
GOOGLE_CLIENT_ID=your_google_client_id
GEMINI_API_KEY=optional_for_phase_2
CLOUDINARY_API_SECRET=optional_for_phase_4
```

---

## Phase status

> ℹ️ এই guide-টা প্রথম setup-এর সময়ের। বর্তমানে সব phase live — দেখুন CLAUDE.md।

| Phase | Status | What works |
|-------|--------|-----------|
| 1 — Pages frontend | ✅ Wired | React client deploys to Pages, supports SPA routing, optimized chunks |
| 2 — Hono API (read-only + auth) | ✅ Wired | `/api/v1/auth/*`, `/api/v1/news/*`, `/api/v1/feed/rss`, `/sitemap`, `/robots.txt` |
| 3 — Write endpoints + admin | ✅ Done | Admin CRUD, bookmarks, comments, reactions, reports, analytics — live since cutover |
| 4 — Cloudinary image handling | ✅ Done | Image upload + delivery — live since cutover |
| 5 — Cron Triggers for news fetch | ✅ Done | Replaces Hangfire — live since cutover |
| 6 — SSE realtime + production cutover | ✅ Done | Replaces SignalR — live since cutover |

---

## What you still need to do (manual)

1. **Run the CLI commands in Step 1** — I can't do these because they need your Cloudflare login session.
2. **Paste the returned `database_id` and `id` into `wrangler.toml`** (look for the `REPLACE_AFTER_RUNNING_*` placeholders).
3. **Set the 4 Worker secrets** (Step 1.7).
4. **Add the 3 GitHub secrets** (Step 3).
5. **Create initial admin user** — register via `POST /api/v1/auth/register`, then connect to D1 once to flip their `role` to `SuperAdmin`:
   ```bash
   npx wrangler d1 execute newsportal --remote --command="UPDATE users SET role='SuperAdmin' WHERE username='yourusername'"
   ```

---

## What I built locally (already pushed-ready)

```text
src/NewsPortal.Api.Hono/      (NEW — Hono on Cloudflare Workers)
  package.json, tsconfig.json, wrangler.toml, README.md
  migrations/0001_init.sql    (consolidated schema — 13 tables)
  seed/seed.sql               (10 categories + 11 news sources)
  src/index.ts                (Hono app + CORS + route mounting)
  src/lib/                    (env, db, auth, cache, response, password, slug)
  src/routes/
    health.ts, auth.ts, news.ts, feed.ts, sitemap.ts, robots.ts

src/NewsPortal.Client/        (existing — minor tweaks for Pages)
  public/_headers, public/_redirects  (NEW — Pages SPA routing + security headers)
  vite.config.ts                       (UPDATED — chunk splitting)

.github/workflows/            (NEW)
  ci-dev.yml                  (typecheck + build on dev push)
  deploy-api-hono.yml         (Hono → Workers on main push)
  deploy-client-pages.yml     (React → Pages on main push)
```

The .NET solution is **completely unchanged** — `dotnet build` still passes with 0 errors, and `docker compose up` works as before.
