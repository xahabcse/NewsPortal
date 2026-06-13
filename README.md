# NewsPortal — বাংলা ও আন্তর্জাতিক সংবাদের অ্যাগ্রিগেটর

> Multi-source news aggregation portal — fetch, dedupe, categorize, and read news with AI summaries, translation, bookmarks, comments, reactions, and an admin/analytics suite.
> Trust Slate-Teal editorial UI · bilingual (Bangla + English) · role-gated (SuperAdmin / Admin / Editor / Reader) · PWA.

**Live site:** <https://news.xahabcse.me> (Cloudflare Pages) · **API:** <https://newsportal-api-hono.sujoncep.workers.dev>
**Repo:** <https://github.com/xahabcse/NewsPortal>

---

## Two ways to run

NewsPortal ships **two complete backends** — pick the one that fits your deployment:

| Path | Stack | When |
|------|-------|------|
| **A. Cloudflare serverless** *(live production)* | React/Vite on Cloudflare **Pages** + **Hono** Worker + **D1** (SQLite) + **KV** + Gemini + Cloudinary | Zero-ops, edge, free-tier friendly — what powers `news.xahabcse.me` |
| **B. Docker / .NET self-host** *(original full stack)* | React + **ASP.NET Core 8** + **PostgreSQL** + **MongoDB** + **Redis** + Hangfire + Seq | Self-hosted on your own Linux server with full control |

The same React client (`src/NewsPortal.Client`) serves both — it just points `VITE_API_URL` at whichever API is running.

---

## 🔐 Access Model

JWT auth (bcrypt passwords; Google OAuth optional). New sign-ups default to **Reader**.

**Roles (high → low):** `SuperAdmin` > `Admin` > `Editor` > `Reader`.

| Path | Access |
|------|--------|
| `/`, `/about`, `/login`, `/register` | 🌐 Public |
| `/search`, `/timeline`, `/trending`, `/news-sources`, `/news/:slug`, `/category/:slug`, `/bookmarks`, `/profile`, `/user/:username` | 🔒 Reader+ |
| `/admin/dashboard`, `/admin/fetch-logs`, `/admin/categories`, `/admin/articles`, `/admin/analytics`, `/admin/users` | 🔒 Admin / SuperAdmin |
| `/admin/logs` | 🔒 SuperAdmin only |

Backend gates with `requireAuth` + `requireRole(...)` (Hono) / role attributes (.NET); frontend with `<ProtectedRoute roles={[...]}>`.

**Seed users (dev only):** `superadmin/superadmin`, `admin/admin1`, `editor/editor`, `reader/reader`.

---

## 📁 Repository Structure

```text
NewsPortal/
├── CLAUDE.md                        # 🤖 project conventions for Claude Code (root)
├── .claude/                         # 🤖 Claude Code: agents/ (10) + skills/ (5) + settings.local.json
├── .github/workflows/               # CI/CD
│   ├── ci-dev.yml                   #   push dev → build/typecheck → auto-merge dev→main
│   ├── deploy-api-hono.yml          #   main → D1 migrate + wrangler deploy (Worker)
│   ├── deploy-client-pages.yml      #   main → wrangler pages deploy (frontend)
│   └── ci-cd.yml                    #   ⏸️  legacy .NET Docker pipeline (manual-only)
├── src/
│   ├── NewsPortal.Client/           # ⚛️  React 18 + TS + Vite + Tailwind (serves BOTH backends)
│   │   └── src/  pages/ (+ admin/) · components/ · services/ · context/ · hooks/ · i18n/ · utils/
│   ├── NewsPortal.Api.Hono/         # ☁️  LIVE backend — Hono Worker
│   │   ├── src/  index.ts · routes/ (21) · lib/ (15) · jobs/fetch-news.ts
│   │   ├── migrations/  0001_init.sql · 0002_app_logs.sql
│   │   ├── seed/seed.sql            #   categories + news sources
│   │   └── wrangler.toml            #   D1 (newsportal) + KV (CACHE_KV) + vars + crons
│   ├── NewsPortal.Api/              # 🟪 legacy — ASP.NET Core 8 REST API
│   ├── NewsPortal.McpServer/        # 🟪 legacy — Hangfire background fetch
│   ├── NewsPortal.Scheduler/        # 🟪 legacy — scheduled jobs
│   ├── NewsPortal.Service/          # 🟪 legacy — business logic
│   ├── NewsPortal.Repository/       # 🟪 legacy — data access (EF Core)
│   └── NewsPortal.Core/             # 🟪 legacy — domain models
├── document/                        # implementation status notes
├── monitoring/                      # Prometheus / Grafana / Loki (Docker path)
├── script/                          # deploy / backup / rollback scripts (Docker path)
├── docker-compose.yml               # full stack (Docker path)
├── docker-compose.dev.yml           # DBs only (local .NET dev)
└── docker-compose.prod.yml          # production (Docker path)
```

---

## 🎨 Design System (Trust Slate-Teal)

Professional editorial dark/light UI.

| Group | Tokens |
|-------|--------|
| Base | `background`, `foreground` |
| Brand | `accent` (teal ~`#0E7C86`) |
| Alert | `danger` (crimson ~`#E11D48`) |
| Text / surface | `secondary`, `glass`, `glass-border`, `glass-surface` |

**Fonts:** `font-sans` Inter · `font-serif` **Source Serif 4** (headlines + article body).
**Icons:** lucide-react outline/transparent (no emoji in UI). **Theme:** dark/light via `ThemeContext` (CSS variables auto-flip).

---

## ☁️ Path A — Cloudflare serverless (live production)

### Backend (`src/NewsPortal.Api.Hono/`) — Hono Worker + D1 + KV

Hono + TypeScript on the **Cloudflare Workers runtime** (not Node.js).

- **Data:** D1 (SQLite, binding `DB`, db `newsportal`) + KV (binding `CACHE_KV`, response caching).
- **AI:** Google **Gemini 2.5 Flash Lite** — summarize / translate / sentiment (graceful fallback).
- **Images:** **Cloudinary** (remote-URL upload to CDN).
- **Cron Triggers:** `*/5` `runScheduledFetch` (ingest due sources + inline body) · `*/30` `runBodyBackfill` (fill NULL-body recent articles) — both in `src/jobs/fetch-news.ts`.
- **Realtime:** SSE breaking-news stream at `/api/v1/sse/breaking`.
- **Logging:** central `app_logs` table (`lib/logger.ts`) → SuperAdmin viewer at `/admin/logs`.
- **Vars** (`wrangler.toml`): `ADMIN_EMAIL`, `CORS_ORIGINS`, `PUBLIC_BASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`.
- **Secrets** (`wrangler secret put` — see `/setup-secrets`): `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Migrations:** `migrations/NNNN_*.sql` → `npx wrangler d1 migrations apply newsportal` (`--local` dev / `--remote` prod; CI runs `--remote` on deploy).

### Local development

```bash
# Frontend
cd src/NewsPortal.Client
npm install
npm run dev        # http://localhost:5173

# Backend (Hono Worker)
cd src/NewsPortal.Api.Hono
npm install
npx wrangler dev                                   # local Worker + D1 emulator
npx wrangler d1 migrations apply newsportal --local
```

Point the client at any API via `VITE_API_URL` (e.g. `https://newsportal-api-hono.sujoncep.workers.dev/api`).

### Deploy — git-push-to-deploy

```bash
git add <files> && git commit -m "feat: …" && git push origin dev
```

1. **`ci-dev.yml`** (push `dev`) — typecheck Hono API + build client → auto-create + auto-merge `dev→main` PR.
2. **`deploy-api-hono.yml`** (`main`, `src/NewsPortal.Api.Hono/**`) — `wrangler d1 migrations apply newsportal --remote` → `wrangler deploy --minify`.
3. **`deploy-client-pages.yml`** (`main`, `src/NewsPortal.Client/**`) — `npm run build` → `wrangler pages deploy dist --project-name newsportal-client --branch main`.

Use `/deploy` for the full flow. **GitHub secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_URL`, `GH_PAT` (auto-merge).

---

## 🐳 Path B — Docker / .NET self-host (original full stack)

### Quick start (full stack)

```bash
git clone https://github.com/xahabcse/NewsPortal.git
cd NewsPortal
cp .env.example .env   # or create .env from the template below
docker compose up -d --build
```

- Frontend `http://localhost:5000` · API `http://localhost:8080` · Seq logs `http://localhost:8081`

### Local dev (.NET)

```bash
docker compose -f docker-compose.dev.yml up -d        # databases only
cd src/NewsPortal.Api && dotnet run                   # API → http://localhost:5016
cd src/NewsPortal.Client && npm install && npm run dev # → http://localhost:5173
```

### Services

| Service | Image | Purpose |
|---------|-------|---------|
| `web` | React + Nginx | Frontend SPA |
| `api` | .NET 8 | REST API |
| `mcpserver` | .NET 8 | Background news fetch (Hangfire) |
| `postgres` | PostgreSQL 15 | Relational data (EF Core) |
| `mongodb` | MongoDB 4.4 | Image storage (GridFS) |
| `redis` | Redis 7 | Caching |
| `seq` | Datalust Seq | Structured logging |

### Environment (`.env` at repo root — git-ignored)

**Required:** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_PORT`, `REDIS_PASSWORD`, `REDIS_PORT`, `WEB_PORT`, `ASPNETCORE_ENVIRONMENT`, `CORS_ALLOWED_ORIGINS`, `JWT_SECRET_KEY` (≥ 32 chars).

**Optional:** `SEQ_PORT`, `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`, `NEWS_API_KEY`, `GNEWS_API_KEY`, `GUARDIAN_API_KEY`, `GRAFANA_ADMIN_USER/PASSWORD`, `DOCKER_REGISTRY`, `DOCKER_USERNAME`, `IMAGE_TAG`, `SERVER_HOST`, `SERVER_USER`, `PRODUCTION_URL`.

```bash
# Minimal .env
POSTGRES_USER=newsadmin
POSTGRES_PASSWORD=change_me
POSTGRES_DB=newsportal
POSTGRES_PORT=5432
MONGO_USER=mongouser
MONGO_PASSWORD=change_me
MONGO_PORT=27017
REDIS_PASSWORD=change_me
REDIS_PORT=6379
WEB_PORT=5000
ASPNETCORE_ENVIRONMENT=Production
CORS_ALLOWED_ORIGINS=http://localhost:5000
JWT_SECRET_KEY=replace_with_a_random_32_plus_char_secret
```

**Connection-string rule:** app on host → `localhost`; app in Docker → service names (`postgres`, `mongodb`, `redis`).

### Ports

| Service | Dev | Docker |
|---------|-----|--------|
| API | 5016 | 8080 |
| Frontend | 5173 | 5000 |
| PostgreSQL | 5432 | internal |
| MongoDB | 27017 | internal |
| Redis | 6379 | internal |
| Seq | 5341 | 8081 |

### Production (Linux server)

```bash
ssh user@your-server
git clone https://github.com/xahabcse/NewsPortal.git && cd NewsPortal
nano .env                                  # fill from the template above
docker compose -f docker-compose.prod.yml up -d
sudo certbot --nginx -d yourdomain.com     # optional SSL
```

The `ci-cd.yml` workflow (Build → Test → Docker → GHCR → SSH deploy) is **manual-only** (`workflow_dispatch`). Backup/restore via `./script/backup.sh` and `./script/rollback.sh`.

---

## ✨ Features

**Reader:** infinite-scroll feed with multi-filter bar (source / category / date range) · article detail with reading time, related articles, lazy comments · full-text search · trending · bookmarks · reading history · daily timeline · dark/light theme · text-to-speech (Bengali fallback) · keyboard shortcuts · PWA (installable, offline) · mobile-responsive · dynamic Bangla greeting with Bengali/Hijri/Gregorian dates · location-aware weather widget · public user profiles.

**AI:** article summarization (Gemini 2.5 Flash Lite) · lazy/backfill body scraping · keyword auto-categorization · multi-language translation · comment sentiment analysis.

**Social:** reactions (Like/Love/Informative/Shocking/Sad/Angry) · threaded comments with up/down-vote · share (Copy/Facebook/Twitter/WhatsApp/Telegram/Email) · report/flag.

**Admin:** dashboard with charts (Recharts) · article CRUD + bulk auto-categorize · content analytics · user & category management · fetch-log + news-source management · central log viewer (SuperAdmin).

---

## 🛠️ Tech Stack

| Layer | Cloudflare path | Docker/.NET path |
|-------|-----------------|------------------|
| Frontend | React 18 + TS + Vite + Tailwind (shared) | ← same |
| API | Hono on Cloudflare Workers | ASP.NET Core 8 |
| DB | D1 (SQLite) | PostgreSQL (EF Core) |
| Cache | KV | Redis |
| Images | Cloudinary | MongoDB GridFS |
| Background jobs | Cron Triggers (`fetch-news.ts`) | Hangfire (McpServer) |
| Realtime | SSE | SignalR |
| AI | Gemini 2.5 Flash Lite | Gemini / TF-IDF fallback |
| Logging | `app_logs` (D1) | Seq |
| Hosting | Cloudflare Pages + Workers | Docker / nginx on a server |

---

## 🤖 AI Skills & Agents

Claude Code automation lives under `.claude/`.

### Skills — invoke with `/<name>`

| Skill | Purpose |
|-------|---------|
| `/deploy` | Commit + push `dev` → CI auto-deploys to Cloudflare (monitor + smoke test) |
| `/build-check` | Local client build + Hono API typecheck (no deploy) |
| `/ui-test` | Playwright MCP smoke test of the live site (mobile + desktop) |
| `/setup-secrets` | Set Cloudflare Worker + GitHub Actions secrets (BOM-safe) |
| `/backfill` | Run the article-body backfill job now |

### Agents — delegate via the `Agent` tool

| Group | Agents |
|-------|--------|
| Backend (live) | `hono-api-engineer`, `d1-migration-engineer` |
| Backend (legacy .NET) | `dotnet-api-engineer`, `ef-migration-engineer` |
| Ingestion | `content-fetcher-engineer` |
| Frontend | `react-client-engineer`, `ui-ux-designer`, `bn-en-translator` |
| Ops & QA | `release-engineer`, `ui-tester` |

Definitions: `.claude/agents/*.md` and `.claude/skills/*.md`.

---

## 📋 CLAUDE.md

Project conventions for AI-assisted work — Bangla answers, plan-first workflow, build-local/test-live, no-attribution commits, the Trust Slate-Teal design system, role gate, and the two-stack architecture. See [CLAUDE.md](CLAUDE.md).

---

## 🔖 Versioning

The app version shows in the site footer (`v{version}`) and auto-bumps on every push to `dev`:

- **Minor** change → `+0.1` (`0.9 → 1.0` carries automatically).
- **Major** change → next whole number (e.g. `1.4 → 2.0`) — triggered when any pushed commit is a breaking change (Conventional Commits `type!:` subject or a `BREAKING CHANGE` footer).

Source of truth: [`src/NewsPortal.Client/src/version.json`](src/NewsPortal.Client/src/version.json); bump logic: [`scripts/version-bump.cjs`](scripts/version-bump.cjs); wired into `ci-dev.yml` (the release commit is pushed back with the default token so it never re-triggers CI).

---

## License

For educational and portfolio purposes.

**Last Updated:** June 7, 2026
