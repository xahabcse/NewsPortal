# Robust News Channel Improvement Plan

## 1. Objective
Build a robust News Channel system that is reliable, secure, observable, and scalable under real-world source instability.

## 2. Success Metrics
1. 99%+ successful fetch attempts for healthy sources over 7 days.
2. Duplicate article rate below 1%.
3. Mean time to detect a failing source below 5 minutes.
4. Mean time to recover (auto/manual) below 30 minutes.
5. All source configuration changes are auditable.

## 3. Priority Roadmap

### Phase A: Reliability Core (Highest Priority)
**Goal:** Stop noisy failures and make fetch execution resilient.

Features:
1. Source health state machine (`Active`, `Degraded`, `Paused`, `Disabled`).
2. Failure counters (`consecutive_failures`, `last_error`, `last_success_at`, `next_retry_at`).
3. Retry policy (exponential backoff with jitter and max retries).
4. Circuit breaker per source (auto-pause after threshold).
5. Fetch timeout policy per source.
6. Async fetch job tracking (`Queued`, `Running`, `Succeeded`, `Failed`, `Partial`).

Deliverables:
1. `fetch_jobs` table and API endpoints to query job status.
2. Fetch button returns `jobId` and UI polls status.
3. Health badges in source cards.
4. Auto-pause logic and manual resume action.

Acceptance:
1. Repeatedly failing sources do not loop indefinitely.
2. Manual fetch always gives actionable progress or failure reason.

---

### Phase B: Data Quality and Ingestion Stability
**Goal:** Improve article quality and reduce bad/inconsistent ingestions.

Features:
1. Canonical URL normalization and dedupe key generation.
2. Unique constraints and ingestion guards for duplicates.
3. Parser fallback chain (RSS -> API -> Scrape fallback if enabled).
4. Content normalization (dates, whitespace, encoding cleanup).
5. Validation rules (`title`, `publishedAt`, minimal content quality score).

Deliverables:
1. Canonical URL utility module.
2. Duplicate prevention at application and DB level.
3. Structured validation errors in fetch logs.

Acceptance:
1. Duplicate article creation rate below 1%.
2. Parse failures are categorized and visible in logs.

---

### Phase C: Channel Management UX
**Goal:** Make operations simple and safe for Admin/Editor users.

Features:
1. "Test Source" button before save (dry-run fetch).
2. Source setup wizard with validation hints.
3. Per-source schedule editor (interval presets or cron).
4. Bulk actions (pause/resume/fetch selected sources).
5. Better role-aware UI messaging.

Deliverables:
1. New source-test endpoint + UI modal with result details.
2. Bulk action toolbar in News Channels page.
3. Read-only and permission messages standardized.

Acceptance:
1. Admin/Editor can diagnose source config issues before production fetch.
2. Viewer never sees misleading action failures.

---

### Phase D: Observability and Operations
**Goal:** Detect incidents quickly and support debugging.

Features:
1. Metrics for success rate, latency, article volume, retries.
2. Alerts for failure spikes and stale sources.
3. Correlation IDs from UI action to job execution logs.
4. Source-level dashboards in Grafana/Seq.
5. Daily reliability report summary.

Deliverables:
1. Prometheus metrics from API/MCP.
2. Dashboard panels and alert rules.
3. Correlated structured logs for each fetch cycle.

Acceptance:
1. Team can identify failing sources within minutes.
2. Every failed fetch has a traceable root cause.

---

### Phase E: Security and Governance
**Goal:** Protect channel credentials and strengthen access controls.

Features:
1. Secret storage strategy for API keys (encrypted or managed secret provider).
2. Audit log for source CRUD and manual fetch actions.
3. Hardened RBAC checks in API and UI.
4. Outbound request allowlist and validation.
5. Token/session hardening policy.

Deliverables:
1. `audit_logs` table and query endpoint.
2. Secret handling implementation for source credentials.
3. Security checklist integrated into deployment pipeline.

Acceptance:
1. No plaintext credential leakage in logs/UI.
2. All administrative actions are traceable.

---

### Phase F: Scale and Performance
**Goal:** Keep system stable as channels and traffic grow.

Features:
1. Queue partitioning by source priority.
2. Worker concurrency controls and rate limiting.
3. Index optimization for source/article/fetch log queries.
4. Cache strategy for hot API routes.
5. Retention/archival policy for old logs and stale data.

Deliverables:
1. Background worker tuning config.
2. DB index migration package.
3. Retention job for fetch logs and old diagnostics.

Acceptance:
1. System remains responsive with 10x source load increase.
2. Queue backlog remains within defined SLO.

## 4. Detailed Feature Backlog

### 4.1 Source Health Model
Data fields:
1. `status` (enum)
2. `consecutive_failures` (int)
3. `last_success_at` (datetime)
4. `last_failure_at` (datetime)
5. `last_error_code` (string)
6. `last_error_message` (text)
7. `next_retry_at` (datetime)

Behavior:
1. `Active -> Degraded` after first failure.
2. `Degraded -> Paused` after threshold (example: 5 failures).
3. `Paused -> Active` after manual resume or successful retry.

### 4.2 Fetch Job Tracking
`fetch_jobs` fields:
1. `id` (uuid)
2. `source_id` (nullable for all-sources run)
3. `trigger_type` (`manual`, `schedule`, `retry`)
4. `status`
5. `started_at`, `finished_at`
6. `created_by_user_id` (nullable for scheduler)
7. `error_summary`
8. `metrics_json` (fetched/new/updated/skipped)

API:
1. `POST /api/v1/newssources/{id}/fetch` returns `{ jobId }`
2. `GET /api/v1/fetch-jobs/{jobId}`
3. `GET /api/v1/fetch-jobs?sourceId=&status=&from=&to=`

### 4.3 Error Taxonomy
Standard error codes:
1. `NETWORK_TIMEOUT`
2. `DNS_FAILURE`
3. `RATE_LIMITED`
4. `AUTH_FAILED`
5. `PARSER_FAILED`
6. `INVALID_PAYLOAD`
7. `STORAGE_FAILED`
8. `UNKNOWN`

### 4.4 Dedupe Strategy
1. Normalize URL (scheme, query tracking params, trailing slash).
2. Build canonical hash.
3. Enforce unique constraint per source and optional global check.
4. Fallback near-duplicate checks using title similarity.

## 5. Delivery Plan by Sprint

### Sprint 1 (Reliability Foundations)
1. Add source health fields and migrations.
2. Implement retry/backoff policy.
3. Implement fetch job model and endpoints.
4. Add UI job-progress state for manual fetch.

### Sprint 2 (Data Quality)
1. Canonical URL dedupe implementation.
2. Parser fallback strategy.
3. Validation and error taxonomy.
4. Source-level quality metrics.

### Sprint 3 (Operations + Security)
1. Dashboards and alerts.
2. Audit logging.
3. Secret handling improvements.
4. Bulk channel operations.

## 6. Risks and Mitigations
1. External sources change markup unexpectedly.
Mitigation: parser fallback chain + per-source test harness.

2. Worker overload under mass failures.
Mitigation: per-source circuit breaker + queue throttling.

3. Auth/RBAC drift between API and UI.
Mitigation: keep API as source of truth and use shared policy map in UI.

4. Log noise without actionable context.
Mitigation: structured error codes + correlation IDs.

## 7. Implementation Notes for Current Repository
1. Keep role-protected channel actions (`Admin`, `Editor`) as-is in API.
2. Extend current MCP/Hangfire scheduling with job entity persistence.
3. Reuse existing logging stack (Seq + Prometheus/Grafana monitoring stack).
4. Keep migration changes additive and backward compatible.

## 8. Definition of Done
1. Feature completed with migration, API, service logic, and UI updates.
2. Smoke tests updated for role-protected fetch + job status.
3. Logs include correlation IDs and standardized error codes.
4. Dashboards and alerts include new reliability metrics.
5. Documentation updated with operator runbook and troubleshooting flow.

