---
name: deploy
description: Deploy NewsPortal to production — normally via git push to dev (CI auto-deploys the Hono Worker + Cloudflare Pages), or manually via wrangler as a fallback.
user_invocable: true
---

# Deploy to Production (Cloudflare)

NewsPortal uses a **git-push-to-deploy** pipeline. Manual `wrangler` deploys are a fallback only.

## Normal Flow (recommended)

```bash
# 1. Stage specific files — never `git add -A` / `git add .`
git add <files>

# 2. Conventional-commit message (NO AI attribution)
git commit -m "feat/fix/docs: short description"

# 3. Push to dev — triggers the pipeline
git push origin dev
```

CI then runs automatically:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci-dev.yml` | push to `dev` | Typecheck `src/NewsPortal.Api.Hono` + build `src/NewsPortal.Client` → create PR `dev→main` → auto-merge |
| `deploy-api-hono.yml` | merge to `main`, paths `src/NewsPortal.Api.Hono/**` | `wrangler d1 migrations apply newsportal --remote` → `wrangler deploy --minify` |
| `deploy-client-pages.yml` | merge to `main`, paths `src/NewsPortal.Client/**` | `npm run build` (with `VITE_API_URL`) → `wrangler pages deploy dist --project-name newsportal-client --branch main` |

A deploy only runs if its path changed — backend-only and frontend-only pushes deploy independently.

## Monitor (don't walk away)

```bash
# Watch CI-Dev to completion
gh run watch "$(gh run list --workflow 'CI - Dev (build + auto-merge to main)' --branch dev --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status

# Confirm the deploy(s) on main
gh run list --branch main --limit 4 --json workflowName,status,conclusion
```

Only call it done when each relevant run is `conclusion: success`.

## GitHub Secrets required

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | `sujoncep` account API token (Workers + Pages + D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | `sujoncep` account ID |
| `VITE_API_URL` | `https://newsportal-api-hono.sujoncep.workers.dev/api` |
| `GH_PAT` | GitHub PAT with `repo` + `pull_requests` (for dev→main auto-merge) |

## Production URLs / Smoke Test

```bash
curl -s https://newsportal-api-hono.sujoncep.workers.dev/health          # API health
curl -s -o /dev/null -w "%{http_code}\n" https://news.xahabcse.me/        # → 200
```

- **App:** <https://news.xahabcse.me> · **API:** <https://newsportal-api-hono.sujoncep.workers.dev>
- **PWA:** after deploy, hard-reload / clear SW + caches before trusting a live UI check (then use `/ui-test`).

## Manual Deploy (fallback only — remote/prod mutation, confirm first)

```bash
# API (Worker)
cd src/NewsPortal.Api.Hono && npm ci
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> npx wrangler d1 migrations apply newsportal --remote
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> npx wrangler deploy --minify

# Frontend (Pages)
cd src/NewsPortal.Client && npm ci
VITE_API_URL=https://newsportal-api-hono.sujoncep.workers.dev/api npm run build
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> \
  npx wrangler pages deploy dist --project-name newsportal-client --branch main
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| CI-Dev never merges | `GH_PAT` missing/expired | Re-add `GH_PAT` with `repo` + `pull_requests` |
| API deploy fails on migrate | bad/duplicate migration | Fix via `d1-migration-engineer`; migrations are forward-only |
| CORS error from the site | origin not in `CORS_ORIGINS` | Add it to `[vars] CORS_ORIGINS` in `wrangler.toml` and redeploy |
| Live shows old build | PWA service worker cache | Unregister SW + clear caches / cache-bust before testing |
| Legacy `ci-cd.yml` triggered | manual dispatch | It's the Docker/.NET path — not part of normal Cloudflare deploys |
