---
name: setup-secrets
description: Set the Cloudflare Worker secrets the Hono API needs (BOM-safe) plus the GitHub Actions secrets the CI/CD pipeline needs. Guards against the classic BOM-in-secret bug.
user_invocable: true
---

# Setup Secrets (Cloudflare Worker + GitHub Actions)

NewsPortal needs secrets in two places: the **Cloudflare Worker** (runtime) and **GitHub Actions** (CI/CD). Setting a Worker secret is a **remote/prod mutation on the `sujoncep` account — confirm with the user before each `wrangler secret put`.**

## 1. Worker secrets (runtime)

Set on the `newsportal-api-hono` Worker. **Always pipe with `printf` (no trailing newline / BOM)** — a stray BOM silently breaks JWT signing, OAuth, and API keys.

| Secret | Purpose |
|--------|---------|
| `JWT_SECRET` | HS256 signing key for auth tokens (≥ 32 random chars) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id (optional sign-in) |
| `GEMINI_API_KEY` | Google AI Studio key — AI summarize/translate/sentiment |
| `CLOUDINARY_API_SECRET` | Cloudinary image-upload signing secret |

```bash
cd src/NewsPortal.Api.Hono

# BOM-safe: printf, not echo. Confirm before running (writes to live Worker).
printf '%s' '<value>' | npx wrangler secret put JWT_SECRET --name newsportal-api-hono
printf '%s' '<value>' | npx wrangler secret put GOOGLE_CLIENT_ID --name newsportal-api-hono
printf '%s' '<value>' | npx wrangler secret put GEMINI_API_KEY --name newsportal-api-hono
printf '%s' '<value>' | npx wrangler secret put CLOUDINARY_API_SECRET --name newsportal-api-hono

# Verify (names only, never values):
npx wrangler secret list --name newsportal-api-hono
```

> Non-secret config (`ADMIN_EMAIL`, `CORS_ORIGINS`, `PUBLIC_BASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`) lives in `[vars]` in `wrangler.toml` — **not** here.

## 2. GitHub Actions secrets (CI/CD)

Set on the `xahabcse/NewsPortal` repo so the pipeline can build + deploy.

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | `sujoncep` token with Workers + Pages + D1 edit |
| `CLOUDFLARE_ACCOUNT_ID` | `sujoncep` account id |
| `VITE_API_URL` | `https://newsportal-api-hono.sujoncep.workers.dev/api` |
| `GH_PAT` | PAT with `repo` + `pull_requests` (dev→main auto-merge) |

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo xahabcse/NewsPortal      # paste when prompted
gh secret set CLOUDFLARE_ACCOUNT_ID --repo xahabcse/NewsPortal
gh secret set VITE_API_URL --repo xahabcse/NewsPortal --body 'https://newsportal-api-hono.sujoncep.workers.dev/api'
gh secret set GH_PAT --repo xahabcse/NewsPortal
gh secret list --repo xahabcse/NewsPortal
```

## Guardrails

- ⛔ `wrangler secret put` overwrites a **live** secret instantly (can break auth/AI/images) — confirm first.
- ⛔ Never commit a secret value to the repo or paste it into `wrangler.toml`.
- ✅ `wrangler secret list` / `gh secret list` (names only) are safe.
