---
name: backfill
description: Run the article body-backfill job now — visit the source links of current/recent articles that have a link but no body, and fill the body. The same job also runs automatically every 30 minutes via cron.
user_invocable: true
---

# Backfill Article Bodies (run now)

Some articles arrive with a title + link but **no body** (the `*/5` fetch couldn't extract it cheaply). The **`runBodyBackfill`** job visits those source links and fills the body. It runs automatically on the `*/30 * * * *` cron — this skill triggers it **on demand**.

What it does: picks NULL-body articles (today first, then the last few days), fetches each source URL, extracts the body (`lib/article-extractor.ts` — JSON-LD / `content:encoded` fast-path, HTMLRewriter fallback), and updates the row. It has its own subrequest/extraction budget and logs extraction failures to `app_logs`.

## Option A — Admin UI (easiest)

1. Sign in as **Admin** (or SuperAdmin).
2. Go to **News Sources** (`/news-sources`) → click **"Backfill bodies"**.
3. The toast reports how many articles were filled.

## Option B — API call (Admin JWT required)

`POST /api/v1/newssources/backfill` — role-gated to Admin+.

```bash
# 1. Get an Admin token
TOKEN=$(curl -s -X POST https://newsportal-api-hono.sujoncep.workers.dev/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin1"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 2. Trigger the backfill
curl -s -X POST https://newsportal-api-hono.sujoncep.workers.dev/api/v1/newssources/backfill \
  -H "Authorization: Bearer $TOKEN"
# → { "message": "Body backfill complete", "filled": N, ... }
```

## Notes

- The job is **idempotent** — articles that already have a body are skipped; safe to run repeatedly.
- It does **not** re-categorize or change anything but the body field.
- It writes an `audit` log entry (`action: backfill.run`) and extraction-failure logs visible at `/admin/logs` (SuperAdmin).
- The automatic `*/30` cron means you rarely need this manually — use it to fill bodies immediately after adding a source or debugging extraction.
