# Robust News Channel Improvement Plan

## 1. Objective

Build a robust News Channel system that is reliable, secure, observable, and scalable under real-world source instability — and is fully deployment-ready with CI/CD, production-hardened infrastructure, and operational tooling.

## 2. Success Metrics

### Backend & Infrastructure

1. 99%+ successful fetch attempts for healthy sources over 7 days.
2. Duplicate article rate below 1%.
3. Mean time to detect a failing source below 5 minutes.
4. Mean time to recover (auto/manual) below 30 minutes.
5. All source configuration changes are auditable.
6. Zero-downtime deployments via CI/CD pipeline.
7. All secrets managed via environment variables — no plaintext in config or logs.
8. Automated backup and restore tested for PostgreSQL and MongoDB.

### Frontend & User Experience

1. First Contentful Paint (FCP) under 1.5 seconds on 4G connection.
2. Lighthouse Performance score above 85.
3. All critical user flows (login, browse, search, source management) functional end-to-end.
4. Zero runtime crashes from missing routes, broken imports, or unhandled errors.
5. Consistent API client layer (single HTTP library across all services).
6. Responsive layout functional on mobile viewports (360px+).

## 3. Current State Audit

### What Exists (Implemented)

- Source health fields on `NewsSource` entity (`HealthStatus`, `ConsecutiveFailures`, `LastSuccessAt`, etc.).
- `SourceFetchJob` entity and `fetch_jobs` table with status tracking.
- Canonical URL helper and ingestion validation helper.
- `FetchMethod` enum (Rss, Api, Scrape) with parser selection.
- DB migrations: `InitialCreate`, `AddUsersTable`, `PhaseAHealthAndFetchJobs`, `PhaseBIngestionQuality`.
- Docker Compose for production, development, and monitoring stacks.
- Prometheus + Grafana + Loki + Promtail monitoring stack with DB exporters.
- Serilog structured logging to Console, File, and Seq.
- JWT authentication with role-based access (Admin, Editor, User).
- Deployment script (`script/deploy.sh`) with validation and health checks.
- DEPLOYMENT.md and QUICK-REFERENCE.md documentation.
- Security headers middleware and exception handling middleware.
- Nginx reverse proxy with SPA routing and API proxy pass.
- Test source endpoint (`POST /api/v1/newssources/test`) for dry-run validation.
- Bulk action endpoint (`POST /api/v1/newssources/bulk-action`).

### What Is Missing (Gaps Found)

#### Infrastructure Gaps

1. **No `.env.example` file** — referenced in `deploy.sh` but does not exist.
2. **No CI/CD workflow** — `.github/workflows/` directory is empty; DEPLOYMENT.md describes a pipeline that has not been created.
3. **No `/metrics` endpoint** — Prometheus scrape jobs for API and MCP are commented out because the app does not expose metrics.
4. **No container health checks** on `api`, `web`, and `mcpserver` in `docker-compose.yml`.
5. **Database ports exposed to host** — `postgres:5432`, `mongodb:27017`, `redis:6379` are all published; production should not expose these.
6. **Nginx missing production hardening** — no gzip, no security headers, no rate limiting, no request size limits.
7. **Seq has no authentication** — `SEQ_FIRSTRUN_NOAUTHENTICATION=true` in production compose.
8. **No `docker-compose.prod.yml`** — DEPLOYMENT.md references it but it doesn't exist.
9. **CORS origin hardcoded** — `appsettings.Production.json` still has `http://localhost:5000`.
10. **No Docker log rotation** — containers can fill disk with unlimited JSON logs.
11. **No backup automation** — backup commands documented but not scripted.
12. **No rollback strategy** — no documented or automated way to roll back a bad deployment.
13. **API container has no resource limits** — `deploy.resources` only set on DB services.
14. **No Prometheus alert rules** — monitoring stack collects metrics but has no alerting.
15. **Redis password visible** in health check command args.

#### Frontend Gaps

1. **Broken import** — `App.tsx:5` imports `NewsSourcesPage` from `./pages/NewsSourcesPage` but the file does not exist. Route `/news-sources` will crash at runtime.
2. **Unused mock data** — `data/newsData.ts` contains hardcoded news articles that are never used. Should be deleted.
3. **Inconsistent HTTP clients** — `api.ts` uses native `fetch`, while `AuthService.ts` and `NewsSourceService.ts` use `axios`. Should standardize on one library.
4. **No error boundary** — React app has no `ErrorBoundary` component; unhandled component errors will white-screen the entire app.
5. **No 404 page** — unrecognized routes show a blank page instead of a helpful "Not Found" message.
6. **No loading skeletons** — page transitions show a simple "Loading..." text instead of skeleton placeholders that match the layout.

---

## 4. Frontend (React) Audit

### 4.1 Working Features (Done)

| #  | Feature                        | Files                                          | Status  | Notes                                                                                    |
| -- | ------------------------------ | ---------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| 1  | App shell layout               | `App.tsx`, `Sidebar.tsx`, `Navbar.tsx`          | Done    | Fixed sidebar (264px) + top navbar + routed content area. Glass-morphism dark theme.      |
| 2  | Home page news feed            | `HomePage.tsx`, `NewsCard.tsx`, `api.ts`        | Done    | Fetches paginated articles from `GET /news/latest`. Grid layout, loading/error states.    |
| 3  | News card component            | `NewsCard.tsx`                                  | Done    | Thumbnail, category badge, source name, date, summary, hover effects.                    |
| 4  | JWT login modal                | `Navbar.tsx`, `AuthService.ts`, `AuthContext.tsx` | Done  | Username/password form, Axios error handling, stores session in localStorage.             |
| 5  | Auth context + role RBAC       | `AuthContext.tsx`                                | Done    | Provides `canManageSources`, `canCreateSources`, `canEditSources`, etc. Auto-logout on token expiry. Token validation on mount. |
| 6  | Auth service (API client)      | `AuthService.ts`                                | Done    | `POST /auth/login`, `GET /auth/validate`, localStorage helpers.                          |
| 7  | News source service (API client) | `NewsSourceService.ts`                        | Done    | Full CRUD + `fetchNow` + `testSource` + `bulkAction` + `getFetchJobStatus`. Auth headers injected. |
| 8  | News source types              | `types/NewsSource.ts`                           | Done    | 7 interfaces including health fields, test result, bulk action, fetch job status.        |
| 9  | Sidebar navigation             | `Sidebar.tsx`                                   | Done    | 3 links (Home, Trending, News Channels) with active route highlighting.                  |
| 10 | Role-aware permission messages | `AuthContext.tsx`                                | Done    | `sourcePermissionMessage` adapts per role (Admin/Editor/Guest).                          |
| 11 | Image fallback handling        | `NewsCard.tsx`                                  | Done    | Local SVG placeholder with gradient background. `onError` handler catches broken image URLs. Replaced external `via.placeholder.com` dependency. |

### 4.2 Not Working / Broken Features

| #  | Feature                     | Issue                                                                                                     | Severity |
| -- | --------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| 1  | **News Sources page**       | `App.tsx:5` imports `NewsSourcesPage` from `./pages/NewsSourcesPage` but the file does not exist. Route `/news-sources` will crash at runtime. | Critical |
| 2  | **Trending page**           | Route `/trending` renders a placeholder ("Coming soon..."). Not connected to any data.                    | Medium   |
| 3  | **Search bar**              | `Navbar.tsx:59-70` renders a search input but it is purely cosmetic — no `onChange`, no API call, no search results. | Medium   |
| 4  | **Notification bell**       | `Navbar.tsx:74-77` renders a bell icon with a dot badge but it is not connected to any notification system. | Low      |
| 5  | **Filter buttons**          | `HomePage.tsx:38-41` renders "All News / Popular / Recent" buttons but they are static — no click handler, no filter logic. | Medium   |
| 6  | **Pagination**              | `HomePage.tsx` fetches page 1 only (`getLatestNews(1, 10)`). No "Load More" or page navigation despite `PagedResult` having `hasNextPage`. | Medium   |
| 7  | **READ MORE button**        | `NewsCard.tsx:47-49` renders a "READ MORE" button but it navigates nowhere — no link, no article detail route. | Medium   |
| 8  | **Premium banner**          | `HomePage.tsx:72-83` "Upgrade to NewsPortal+" banner button has no action.                                | Low      |
| 9  | **News detail route**       | Backend has `GET /news/{slug}` for article detail, but no `/news/:slug` route or detail page exists in React. | Medium   |
| 10 | **Registration UI**         | Backend has `POST /auth/register` endpoint, but there is no register form/page in the frontend.           | Medium   |

### 4.3 Features That Can Be Added

> **Note:** High-level features (bookmarks, reading history, admin dashboard, SEO, etc.) are detailed in **Section 4.5**. This table focuses on UI/UX improvements directly tied to existing code.

| #  | Feature                           | Priority | Description                                                                                                                |
| -- | --------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1  | **News Sources management page**  | Critical | Build `NewsSourcesPage.tsx` with: source list table, create/edit modal, delete confirmation, health badges, fetch button with job polling, test source modal, bulk actions toolbar. The API client (`NewsSourceService.ts`) and types already exist — only the UI is missing. |
| 2  | **Functional search**             | High     | Wire search input to `POST /news/search` (backend endpoint exists). Add debounced query, results dropdown, and full search results page. |
| 3  | **Pagination controls**           | High     | Add "Load More" button or page number controls to `HomePage`. `PagedResult` response already contains `totalPages` and `hasNextPage`. |
| 4  | **Category filtering**            | High     | Add category tabs or sidebar filter using `GET /news/category/{slug}`. Connect "All News / Popular / Recent" filter buttons with actual logic. |
| 5  | **Fetch job status polling**      | Medium   | When user triggers manual fetch, poll `GET /fetchjobs/{jobId}` and show progress toast/modal. `NewsSourceService.getFetchJobStatus` already exists. |
| 6  | **Test source results modal**     | Medium   | After clicking "Test Source", show modal with: sample titles, response time, valid/invalid article counts, issues list. `NewsSourceService.testSource` already exists. |
| 7  | **Toast/notification system**     | Medium   | Add a toast library (react-hot-toast or similar) for success/error feedback on actions like fetch, create, delete. |
| 8  | **Error boundary component**      | High     | Wrap route content in React `ErrorBoundary`. Show friendly error UI with "Go Home" button instead of white screen on component errors. |
| 9  | **404 Not Found page**            | High     | Add catch-all route (`*`) rendering a styled 404 page with navigation back to home. |
| 10 | **Loading skeleton components**   | Medium   | Replace "Loading..." text with skeleton placeholders matching card grid layout. Improves perceived performance. |
| 11 | **Dark/light theme toggle**       | Low      | App is dark-only. Add theme context and CSS variables for light mode. |
| 12 | **Responsive mobile layout**      | Medium   | Sidebar is fixed 264px. Add collapsible hamburger menu for mobile viewports. |
| 13 | **Standardize HTTP client**       | Medium   | Migrate `api.ts` from `fetch` to `axios` (or vice versa) for consistent error handling, interceptors, and auth header injection across all services. |

### 4.4 Frontend Architecture Summary

```text
React 19 + TypeScript + Vite 7 + Tailwind CSS 3

src/
├── App.tsx                        // Router + layout shell
├── components/
│   ├── Navbar.tsx                 // Header + login modal
│   ├── Sidebar.tsx                // Left nav (3 links)
│   └── NewsCard.tsx               // Article card (with image fallback)
├── pages/
│   └── HomePage.tsx               // News grid (only page)
│   (MISSING: NewsSourcesPage.tsx) // BROKEN IMPORT — Critical
├── services/
│   ├── api.ts                     // News API client (fetch-based) ⚠️ inconsistent
│   ├── AuthService.ts             // Auth API client (axios)
│   └── NewsSourceService.ts       // Source CRUD API client (axios)
├── context/
│   └── AuthContext.tsx            // Auth state + RBAC
├── types/
│   └── NewsSource.ts              // 7 interfaces
└── data/
    └── newsData.ts                // Mock data (UNUSED — delete)

Backend API Endpoints Available:
  Auth:     POST login, POST register, GET me, POST change-password, GET validate
  News:     GET latest, GET featured, GET category/{slug}, GET {slug}, POST search
  Sources:  GET all, GET {slug}, POST create, PUT update, DELETE, POST fetch, POST test, POST bulk-action
  Jobs:     GET {externalId}
  Images:   GET {id}
```

#### Technical Debt

| Item | Issue | Fix |
| ---- | ----- | --- |
| `data/newsData.ts` | Unused mock data file, never imported | Delete file |
| `api.ts` vs `AuthService.ts` | Mixed `fetch` and `axios` HTTP clients | Standardize on `axios` with shared instance and interceptors |
| No shared API base URL config | `api.ts` hardcodes base URL, services use different patterns | Create shared `axiosInstance.ts` with base URL, auth interceptor, error handling |
| No TypeScript strict mode | `tsconfig.json` may have lax settings | Enable `strict: true`, `noUncheckedIndexedAccess` |

### 4.5 New Features to Add

Features below are **not yet planned** anywhere in the codebase. They are grouped by domain and ordered by priority within each group.

#### Reader Experience

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Article detail page** | Critical | `GET /news/{slug}` exists. `ViewCount` auto-increments. | Missing page + route | Full article view with content, author, source, publish date, image. Backend returns `NewsArticleDto` with `Content`, `PlainText`, `Author`, `ViewCount`. Wire `READ MORE` button to `/news/:slug`. |
| 2 | **Reading time estimate** | High | `PlainText` field already stored on every article. | Compute on card + detail | Calculate `Math.ceil(plainText.split(/\s+/).length / 200)` min read. Show on `NewsCard` and detail page. No backend change needed. |
| 3 | **Related articles** | High | Add `GET /news/{slug}/related` — query same category, exclude current, order by `PublishedAt DESC`, limit 4. | Sidebar or bottom section on detail page | Keeps readers engaged. Uses existing `CategoryId` FK. |
| 4 | **Bookmarks / saved articles** | High | New `UserBookmark` entity (`UserId`, `ArticleId`, `CreatedAt`). Add `POST/DELETE /api/v1/bookmarks/{articleId}`, `GET /api/v1/bookmarks`. | Bookmark icon on cards + saved articles page | Requires auth. Store per-user. |
| 5 | **Infinite scroll / load more** | High | Already returns `PagedResult` with `hasNextPage`. | Intersection observer or "Load More" button | Replace static page-1 fetch. Append results. |
| 6 | **Article sharing** | Medium | No backend needed. | Share button on detail page | Copy link, native Web Share API (`navigator.share`), Twitter/Facebook/LinkedIn deep links. |
| 7 | **Reading history** | Medium | New `UserReadHistory` entity (`UserId`, `ArticleId`, `ReadAt`). Record on detail page view. `GET /api/v1/reading-history`. | "Recently Read" section in sidebar or profile | Requires auth. Leverage existing `ViewCount` increment point. |
| 8 | **Article reactions** | Low | New `ArticleReaction` entity (`UserId`, `ArticleId`, `ReactionType`). `POST /api/v1/reactions`. | Thumbs up / like button on cards and detail | Lightweight engagement metric beyond ViewCount. |

#### Content Discovery

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Trending articles** | High | Add `GET /api/v1/news/trending` — articles with highest `ViewCount` in last 24/48 hours. | Replace `/trending` placeholder page | Sort by ViewCount within date window. Redis cache with short TTL. |
| 2 | **Category management page** | High | `CategoryService` exists with full CRUD + `GetAllCategoriesAsync` returns article counts. `CategoryDto` has `Icon`, `Color`, `NameBn`. | New `/categories` page or sidebar filter | Show all categories with article counts and colored badges. Allow Admin to create/edit/delete. |
| 3 | **Source-filtered news view** | Medium | `NewsService.GetNewsBySourceAsync(slug)` already exists. | Filter or `/source/:slug` route | Let readers browse articles from a specific source. |
| 4 | **Featured articles section** | Medium | `GET /news/featured` exists. Articles have `IsFeatured` flag. | Hero carousel or featured strip on HomePage | Admin marks articles as featured. Show prominently at top of feed. |
| 5 | **Tag / keyword system** | Medium | New `Tag` entity, `ArticleTag` join table. Extract keywords from `PlainText` or manual tagging. | Tag chips on cards, tag cloud page, filter by tag | Cross-cutting discovery beyond categories. |
| 6 | **Newsletter digest API** | Low | New `GET /api/v1/digest?period=daily` — top articles by category in last 24h. | Email template or digest page | Could integrate with email service later. Backend-only first. |

#### User & Account

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **User registration page** | High | `POST /auth/register` exists with full validation (email, password strength). | Add `/register` route with form | Backend already validates username uniqueness, email format, password rules. |
| 2 | **User profile page** | High | `GET /auth/me` returns `UserDto`. `POST /auth/change-password` exists. | Add `/profile` route | Show user info, role, join date, change password form. |
| 3 | **Category preferences** | Medium | New `UserCategoryPreference` entity (`UserId`, `CategoryId`, `Priority`). `GET/PUT /api/v1/preferences/categories`. | Onboarding or settings page | Personalize home feed ordering by preferred categories. |
| 4 | **Notification center** | Medium | New `Notification` entity (`UserId`, `Type`, `Message`, `ReadAt`, `CreatedAt`). Notify on: fetch failures (Admin), new articles in followed categories. | Bell icon in Navbar wired to notification list | Replace cosmetic bell badge with real data. |
| 5 | **User avatar upload** | Low | Use existing `IImageStorageService.UploadImageAsync`. Add `AvatarImageId` to `User` entity. | Avatar upload in profile page | MongoDB GridFS already handles image storage and thumbnails. |
| 6 | **OAuth / social login** | Low | Add Google/GitHub OAuth providers. Return same `AuthResponseDto`. | Login modal with "Sign in with Google/GitHub" buttons | Reduces registration friction. |

#### Admin & Operations

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Admin dashboard** | High | New `GET /api/v1/admin/stats` — total sources, articles, active/paused/failed sources, articles today, fetch job stats. Aggregate from existing data. | New `/admin/dashboard` page with stat cards and charts | Provides operational visibility. All data already in DB. |
| 2 | **Fetch history log viewer** | High | `NewsFetchLogRepository` has `GetAllAsync`, `GetRecentAsync`, `GetFailedLogsAsync`. `NewsFetchLogDto` exists. | Table/list in admin area with filters | Show fetch logs per source: success/fail, articles fetched, duration, errors. Backend fully ready. |
| 3 | **Article editor / manual create** | Medium | `NewsService.CreateNewsAsync(dto)` exists with full validation, slug generation, image download. | Admin-only article creation form | Allow Admin to manually publish articles (not just fetched ones). |
| 4 | **User management page** | Medium | Add `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/{id}/role`. | Admin-only `/admin/users` page | List users, change roles, deactivate accounts. |
| 5 | **Scraping config editor** | Medium | `ScrapingConfig` entity exists with CSS selectors. Linked to `NewsSource`. | Form within source edit modal | Allow Admin to configure scraping selectors per source without code changes. |
| 6 | **System health page** | Low | Aggregate Hangfire queue stats, DB connection pool, Redis memory, source health counts. | Admin-only `/admin/health` page | Real-time system status overview. Complements Grafana for non-technical admins. |

#### SEO & Public Access

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Dynamic meta tags** | High | No backend change — article data already includes title, summary, image URL. | `react-helmet-async` or `<head>` management | Set `<title>`, `og:title`, `og:description`, `og:image`, `twitter:card` per page for social sharing and search engines. |
| 2 | **Sitemap.xml generation** | High | New `GET /sitemap.xml` endpoint. Query all published article slugs + categories. | None — server-side only | Generate XML sitemap from article slugs. Improves Google indexing. Add to `robots.txt`. |
| 3 | **RSS feed output** | Medium | New `GET /api/v1/feed/rss` — reverse of `RssFeedService`. Generate RSS XML from latest articles. Optional per-category feeds. | RSS link in `<head>` and footer icon | Allows readers to subscribe via RSS readers. Uses existing article data. |
| 4 | **robots.txt** | Medium | Serve from Nginx or new static endpoint. | None | Allow search engine crawling. Block admin routes. |
| 5 | **Schema.org JSON-LD** | Low | No backend change. | Inject `<script type="application/ld+json">` on article detail | `NewsArticle` structured data for rich search results. Use existing title, author, publishedAt, image fields. |
| 6 | **Canonical URL header** | Low | `CanonicalUrl` already stored on every article. | Add `<link rel="canonical">` on detail page | Prevent duplicate content issues in search engines. |

#### Real-Time & Engagement

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Live article count badge** | Medium | New `GET /api/v1/stats/today` — count of articles fetched today. | Badge on sidebar or home page | Shows system activity. Simple count query with Redis cache. |
| 2 | **WebSocket live updates** | Low | Add SignalR hub. Broadcast when new articles are ingested. | Toast or auto-prepend new articles to feed | Real-time "5 new articles" notification. Requires SignalR (.NET) + client subscription. |
| 3 | **Article comments** | Low | New `Comment` entity (`UserId`, `ArticleId`, `Content`, `ParentId` for threading). Moderation flag. | Comment section on article detail page | Community engagement. Requires moderation tooling. |
| 4 | **Email alerts** | Low | Add email service (SMTP or SendGrid). Trigger on: source failure streak, daily digest, new user registration. | Email preferences in profile settings | Operational alerts for admins, digest for readers. |

#### Internationalization & Accessibility

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Bangla language support** | Medium | `CategoryDto` already has `NameBn` field. `NewsSource` has `LanguageCode`. | Language toggle, conditional `NameBn` display | Infrastructure partially exists. Need i18n framework (react-i18next) and translated UI strings. |
| 2 | **RTL layout support** | Low | No backend change. | CSS `dir="rtl"` support, Tailwind RTL plugin | Needed if Bangla or Arabic content is displayed. |
| 3 | **Keyboard navigation** | Medium | No backend change. | Focus management, skip links, ARIA labels | Screen reader support for article cards, modals, navigation. |
| 4 | **High contrast mode** | Low | No backend change. | CSS media query `prefers-contrast` + manual toggle | Accessibility compliance for visually impaired users. |

#### Progressive Web App (PWA)

| #  | Feature | Priority | Backend | Frontend | Description |
| -- | ------- | -------- | ------- | -------- | ----------- |
| 1 | **Service worker + manifest** | Medium | No backend change. | `vite-plugin-pwa`, `manifest.json`, offline fallback page | Installable on mobile home screens. Cache shell for instant loads. |
| 2 | **Offline reading** | Low | No backend change. | Cache recently viewed articles in IndexedDB | Read previously loaded articles without connection. |
| 3 | **Push notifications** | Low | Add web push subscription endpoint. Store push tokens per user. | Push permission prompt + notification display | Notify users of breaking news or new articles in followed categories. |

---

## 5. Priority Roadmap

### Phase 0: Deployment Infrastructure (Prerequisite — Do First)

**Goal:** Make the application deployable with a single `git push` to `main`.

**Status:** Not started — this is the critical blocker before any feature work.

#### 0.1 Environment Configuration

- [ ] Create `.env.example` with all required variables, safe defaults, and inline comments.
- [ ] Add `.env` to `.gitignore` (verify).
- [ ] Update `appsettings.Production.json`: replace `localhost` CORS and placeholder hosts with `USE_ENV_VARIABLE` pattern.

#### 0.2 Docker Compose Production Hardening

- [ ] Create `docker-compose.prod.yml` (override file) that:
  - Removes host port mappings for `postgres`, `mongodb`, `redis`, `seq` (internal-only).
  - Adds `logging` driver config with `max-size` and `max-file` rotation.
  - Adds health checks on `api`, `web`, and `mcpserver` containers.
  - Adds `deploy.resources` limits on `api` (512M), `web` (256M), `mcpserver` (256M), `seq` (512M).
  - Configures `restart: unless-stopped` instead of `restart: always`.
  - Uses image tags from GHCR instead of local `build:` for production.
- [ ] Keep base `docker-compose.yml` for local Docker testing (build from source).

#### 0.3 Nginx Production Hardening

- [ ] Create `nginx.prod.conf` (or update existing) with:
  - Gzip compression for text, JSON, CSS, JS, SVG.
  - Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
  - Client body size limit (`client_max_body_size 10m`).
  - Proxy timeouts (`proxy_read_timeout 30s`, `proxy_connect_timeout 5s`).
  - Static asset caching (`Cache-Control` for `/assets/`).
  - Rate limiting zone for API proxy.
  - Health check endpoint (`/healthz` returning 200).
  - Real IP forwarding headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`).

#### 0.4 CI/CD Pipeline (GitHub Actions)

- [ ] Create `.github/workflows/ci-cd.yml` with:

  **Job 1: Build & Test** (runs on all pushes and PRs to `main`)
  - Checkout, setup .NET 8 SDK, restore, build, run tests.
  - Upload test results as artifacts.

  **Job 2: Docker Build & Push** (runs only on push to `main`)
  - Build `newsportal-api`, `newsportal-web-client`, `newsportal-mcp` images.
  - Tag with `latest` and git SHA.
  - Push to GitHub Container Registry (`ghcr.io`).
  - Use Docker layer caching for speed.

  **Job 3: Deploy to Production** (runs after Job 2, only on `main`)
  - SSH into production server.
  - Write `.env` from GitHub Secrets.
  - Copy `docker-compose.prod.yml`.
  - `docker compose pull && docker compose up -d`.
  - Run health check (`curl /health`).
  - Notify on failure.

  **Job 4: Smoke Test** (runs after Job 3)
  - Hit `/health` endpoint.
  - Hit `/api/v1/newssources` (authenticated).
  - Report pass/fail.

- [ ] Document required GitHub Secrets in `.github/SECRETS.md`.

#### 0.5 Backup Automation

- [ ] Create `script/backup.sh`:
  - PostgreSQL: `pg_dump` to timestamped `.sql.gz` file.
  - MongoDB: `mongodump` to timestamped archive.
  - Retention: keep last 7 daily, 4 weekly.
  - Optional: upload to S3/remote storage.
- [ ] Add cron job example to DEPLOYMENT.md.

#### 0.6 Rollback Strategy

- [ ] Tag every deployment with git SHA image tag.
- [ ] Create `script/rollback.sh` that:
  - Accepts a git SHA or `previous` as argument.
  - Updates `IMAGE_TAG` in `.env`.
  - Runs `docker compose pull && docker compose up -d`.
  - Runs health check; if fail, rolls back again.
- [ ] Document rollback procedure in DEPLOYMENT.md.

**Acceptance:**

1. `git push origin main` triggers build, test, push, deploy, and smoke test.
2. `.env.example` contains every variable needed to run the full stack.
3. Production databases are not accessible from outside the Docker network.
4. Nginx serves gzipped responses with security headers.
5. Backups can be created and restored with a single script invocation.
6. A bad deployment can be rolled back within 5 minutes.

---

### Phase A: Reliability Core (Highest Priority Feature Work)

**Goal:** Stop noisy failures and make fetch execution resilient.

**Status:** Partially implemented (entities and migrations exist; behavior logic needs verification).

Features:

1. Source health state machine (`Active`, `Degraded`, `Paused`, `Disabled`).
2. Failure counters (`consecutive_failures`, `last_error`, `last_success_at`, `next_retry_at`).
3. Retry policy (exponential backoff with jitter and max retries).
4. Circuit breaker per source (auto-pause after threshold).
5. Fetch timeout policy per source (`RequestTimeoutSeconds`).
6. Async fetch job tracking (`Queued`, `Running`, `Completed`, `Failed`, `Cancelled`).

Remaining Work:

- [ ] Verify state machine transitions are enforced in `NewsFetcherService`.
- [ ] Verify exponential backoff calculation populates `NextRetryAt`.
- [ ] Verify circuit breaker logic auto-pauses after `CircuitBreakerThreshold` failures.
- [ ] Add UI polling for fetch job status after manual fetch trigger.
- [ ] Add health status badges to source list cards in React frontend.
- [ ] Add manual "Resume" action button for paused sources.

Deliverables:

1. `fetch_jobs` table and API endpoints to query job status.
2. Fetch button returns `jobId` and UI polls status.
3. Health badges in source cards.
4. Auto-pause logic and manual resume action.

Acceptance:

1. Repeatedly failing sources auto-pause after threshold and do not loop indefinitely.
2. Manual fetch always gives actionable progress or failure reason.

---

### Phase B: Data Quality and Ingestion Stability

**Goal:** Improve article quality and reduce bad/inconsistent ingestions.

**Status:** Partially implemented (helpers exist; DB constraints and parser fallback need verification).

Features:

1. Canonical URL normalization and dedupe key generation.
2. Unique constraints and ingestion guards for duplicates.
3. Parser fallback chain (RSS -> API -> Scrape fallback if enabled).
4. Content normalization (dates, whitespace, encoding cleanup).
5. Validation rules (`title`, `publishedAt`, minimal content quality score).

Remaining Work:

- [ ] Verify `CanonicalUrlHelper` strips tracking params (`utm_*`, `fbclid`, etc.) and normalizes scheme/trailing slash.
- [ ] Verify unique constraint exists on `canonical_url` in `news_articles` table.
- [ ] Verify `NewsArticleIngestionHelper` rejects articles without title or published date.
- [ ] Implement parser fallback chain in `NewsFetcherService` (try RSS, fall back to API, then Scrape).
- [ ] Add structured validation error codes to fetch log entries.
- [ ] Add near-duplicate detection via title similarity (Levenshtein or trigram).

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

Remaining Work:

- [ ] Build React UI modal for test source results (shows sample titles, response time, issues).
- [ ] Build bulk action toolbar in News Channels list page.
- [ ] Add per-source schedule editor with presets (15m, 30m, 1h, 6h, 12h, 24h).
- [ ] Show role-appropriate messages (Viewer sees "Contact admin" instead of disabled buttons).

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

1. Prometheus `/metrics` endpoint on API and MCP services.
2. Application metrics: fetch success rate, fetch latency histogram, article volume counter, retry counter.
3. Grafana alert rules for failure spikes and stale sources.
4. Correlation IDs from UI action through API to Hangfire job logs.
5. Source-level dashboard panels in Grafana.

Remaining Work:

- [ ] Install `prometheus-net.AspNetCore` NuGet package in API and MCP projects.
- [ ] Add `app.UseHttpMetrics()` and `app.MapMetrics()` in `Program.cs`.
- [ ] Add custom metrics in `NewsFetcherService`:
  - `newsportal_fetch_total{source, status}` (counter)
  - `newsportal_fetch_duration_seconds{source}` (histogram)
  - `newsportal_articles_ingested_total{source}` (counter)
  - `newsportal_source_health{source, status}` (gauge)
- [ ] Uncomment API and MCP scrape jobs in `prometheus.yml`.
- [ ] Create Grafana alert rules:
  - `FetchFailureRate > 30%` over 10 minutes.
  - `SourceStale` when `last_success_at > 2 hours ago`.
  - `QueueBacklog > 50` pending jobs.
- [ ] Add correlation ID middleware: generate `X-Correlation-Id` in API, pass to Hangfire job context, include in all Serilog log entries.
- [ ] Build Grafana dashboard with panels: fetch success rate, active sources by health, article ingestion volume, error breakdown by code.

Deliverables:

1. Prometheus metrics from API and MCP.
2. Dashboard panels and alert rules.
3. Correlated structured logs for each fetch cycle.

Acceptance:

1. Team can identify failing sources within minutes via dashboard.
2. Every failed fetch has a traceable root cause via correlation ID.

---

### Phase E: Security and Governance

**Goal:** Protect channel credentials and strengthen access controls.

Features:

1. Secret storage strategy for API keys (encrypted at rest in DB or environment-based).
2. Audit log for source CRUD and manual fetch actions.
3. Hardened RBAC checks in API and UI.
4. Outbound request allowlist and validation.
5. Token/session hardening policy.

Remaining Work:

- [ ] Encrypt `ApiKey` field in `NewsSource` at application level before DB write (AES-256 with key from env var).
- [ ] Create `audit_logs` table: `Id`, `UserId`, `Action`, `EntityType`, `EntityId`, `OldValues`, `NewValues`, `Timestamp`, `IpAddress`.
- [ ] Add audit logging in `NewsSourceService` for create, update, delete, manual fetch, and bulk actions.
- [ ] Create `GET /api/v1/audit-logs` endpoint (Admin only) with filtering.
- [ ] Validate outbound fetch URLs: block private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, `localhost`).
- [ ] Add Seq authentication in production (`SEQ_FIRSTRUN_NOAUTHENTICATION=false`).
- [ ] Set JWT expiration to 12 hours (production) with refresh token flow.
- [ ] Mask `ApiKey` in all API responses and log outputs.
- [ ] Add API rate limiting middleware (AspNetCoreRateLimit or .NET 8 built-in `RateLimiter`):
  - Anonymous: 30 requests/minute.
  - Authenticated: 120 requests/minute.
  - Auth endpoints (login/register): 5 requests/minute per IP (brute-force protection).

Deliverables:

1. `audit_logs` table and query endpoint.
2. Secret handling implementation for source credentials.
3. Security checklist integrated into deployment pipeline.
4. API rate limiting configured and tested.

Acceptance:

1. No plaintext credential leakage in logs or UI.
2. All administrative actions are traceable.
3. Brute-force login attempts are rate-limited.

---

### Phase F: Scale and Performance

**Goal:** Keep system stable as channels and traffic grow.

Features:

1. Queue partitioning by source priority.
2. Worker concurrency controls and rate limiting.
3. Index optimization for source/article/fetch log queries.
4. Cache strategy for hot API routes (Redis).
5. Retention/archival policy for old logs and stale data.

Remaining Work:

- [ ] Add Hangfire queue names (`critical`, `default`, `low`) and assign sources by priority.
- [ ] Configure worker count and concurrency in MCP server (`BackgroundJobServerOptions`).
- [ ] Add DB indexes: `news_articles(canonical_url)`, `news_articles(source_id, published_at DESC)`, `source_fetch_jobs(source_id, started_at DESC)`, `news_articles(category_id, is_featured, published_at DESC)`.
- [ ] Add Redis cache layer for: source list (5 min TTL), article list by category (2 min TTL), source health summary (1 min TTL).
- [ ] Create Hangfire recurring job for log retention: delete `NewsFetchLog` entries older than 30 days, delete completed `SourceFetchJob` entries older than 90 days.
- [ ] Add connection pooling config for PostgreSQL (`Maximum Pool Size=20`).
- [ ] Add response compression middleware (`app.UseResponseCompression()`) for API JSON payloads.
- [ ] Configure Vite build for optimal chunk splitting — vendor, framework, and route-based chunks.

Deliverables:

1. Background worker tuning config.
2. DB index migration package.
3. Retention job for fetch logs and old diagnostics.
4. Frontend bundle under 300KB gzipped (excluding images).

Acceptance:

1. System remains responsive with 10x source load increase.
2. Queue backlog remains within defined SLO.
3. API P95 response time under 200ms for read endpoints.

---

## 6. Detailed Feature Backlog

### 6.1 Source Health Model

Data fields (already in `NewsSource` entity):

1. `HealthStatus` (enum: Active, Paused, Disabled)
2. `ConsecutiveFailures` (int)
3. `LastSuccessAt` (datetime)
4. `LastFailureAt` (datetime)
5. `LastErrorCode` (string) — maps to error taxonomy
6. `LastErrorMessage` (text)
7. `NextRetryAt` (datetime)
8. `CircuitBreakerThreshold` (int, default 5)
9. `MaxRetryAttempts` (int, default 3)
10. `RequestTimeoutSeconds` (int, default 30)

Behavior:

1. `Active -> Degraded` after first failure (update `ConsecutiveFailures`, `LastErrorCode`).
2. `Degraded -> Paused` after `ConsecutiveFailures >= CircuitBreakerThreshold`.
3. `Paused -> Active` after manual resume or successful scheduled retry.
4. `Disabled` is manual-only (Admin action to permanently disable a source).

### 6.2 Fetch Job Tracking

`SourceFetchJob` fields (already in entity):

1. `Id` (int, PK)
2. `ExternalId` (Guid, public-facing identifier)
3. `NewsSourceId` (FK, nullable for bulk runs)
4. `TriggerType` (string: `Manual`, `Manual-Bulk`, `Schedule`, `Retry`)
5. `Status` (enum: Queued, Running, Completed, Failed, Cancelled)
6. `Attempts` (int)
7. `StartedAt`, `FinishedAt` (datetime)
8. `RequestedByUserId` (FK, nullable for scheduler)
9. `ErrorCode`, `ErrorSummary` (string)
10. `ArticlesFetched`, `NewArticles`, `UpdatedArticles`, `SkippedArticles` (int)
11. `HangfireJobId` (string, for correlation)

API:

1. `POST /api/v1/newssources/{id}/fetch` — returns `{ jobId: <externalId> }`
2. `GET /api/v1/fetch-jobs/{externalId}` — returns job status and metrics
3. `GET /api/v1/fetch-jobs?sourceId=&status=&from=&to=&page=&pageSize=`

### 6.3 Error Taxonomy

Standard error codes:

1. `NETWORK_TIMEOUT` — request exceeded `RequestTimeoutSeconds`
2. `DNS_FAILURE` — could not resolve source hostname
3. `HTTP_ERROR` — non-2xx response (include status code in message)
4. `RATE_LIMITED` — 429 response from source
5. `AUTH_FAILED` — 401/403 response from source
6. `PARSER_FAILED` — RSS/HTML/JSON parse error
7. `INVALID_PAYLOAD` — response parsed but content validation failed
8. `DUPLICATE_SKIPPED` — article already exists (informational, not an error)
9. `STORAGE_FAILED` — DB or MongoDB write error
10. `UNKNOWN` — unclassified exception

### 6.4 Dedupe Strategy

1. Normalize URL: lowercase scheme and host, remove tracking params (`utm_*`, `fbclid`, `gclid`, `ref`), remove trailing slash, sort remaining query params.
2. Compute SHA-256 hash of canonical URL as dedupe key.
3. Enforce unique constraint on `(news_source_id, canonical_url_hash)` in DB.
4. Application-level check before insert to provide friendly skip logging.
5. Optional near-duplicate check: compare title trigrams within same source, flag if similarity > 90%.

---

## 7. Delivery Plan by Sprint

### Sprint 0 (Deployment Infrastructure) — Do First

1. Create `.env.example` with all variables.
2. Create `docker-compose.prod.yml` with production hardening.
3. Harden `nginx.conf` for production.
4. Create GitHub Actions CI/CD workflow.
5. Create `script/backup.sh` and `script/rollback.sh`.
6. Verify full stack starts cleanly from `docker compose up`.

### Sprint 1 (Frontend Foundations) — Critical Fixes

1. Fix broken `NewsSourcesPage` import — create the page or remove the route.
2. Add `ErrorBoundary` component wrapping route content.
3. Add 404 Not Found page with catch-all route.
4. Standardize HTTP client (migrate `api.ts` to `axios` with shared instance).
5. Delete unused `data/newsData.ts`.
6. Add loading skeleton components for news card grid.

### Sprint 2 (Core Frontend Features)

1. Build `NewsSourcesPage.tsx` — source list, create/edit modal, delete, health badges, fetch button.
2. Build `ArticleDetailPage.tsx` — full article view via `GET /news/{slug}`.
3. Wire search bar to `POST /news/search` with debounced input.
4. Add pagination (Load More or page numbers) to `HomePage`.
5. Add category filtering with `GET /news/category/{slug}`.

### Sprint 3 (Reliability Foundations)

1. Verify and fix source health state machine transitions.
2. Verify retry/backoff policy populates `NextRetryAt`.
3. Verify circuit breaker auto-pause logic.
4. Add UI job-progress polling for manual fetch.
5. Add health badges to source list cards.

### Sprint 4 (Data Quality)

1. Verify canonical URL dedupe with unique DB constraint.
2. Implement parser fallback chain (RSS -> API -> Scrape).
3. Verify ingestion validation rejects bad articles.
4. Add structured error codes to fetch logs.

### Sprint 5 (User Features)

1. Build user registration page (`/register`).
2. Build user profile page (`/profile`) with change password.
3. Add toast notification system (react-hot-toast).
4. Build trending page with `GET /news/trending` endpoint.
5. Add featured articles section to home page.

### Sprint 6 (Observability)

1. Add Prometheus `/metrics` endpoint to API and MCP.
2. Add custom application metrics (fetch counter, duration histogram).
3. Add correlation ID middleware.
4. Uncomment Prometheus scrape jobs.
5. Build Grafana dashboard and alert rules.

### Sprint 7 (Operations + Security)

1. Create audit log table and endpoints.
2. Encrypt API keys at rest.
3. Add API rate limiting middleware.
4. Add Seq authentication for production.
5. Build bulk action toolbar in React frontend.
6. Validate outbound URLs (block private IPs).

### Sprint 8 (Scale + Polish)

1. Add DB indexes for common query patterns.
2. Add Redis caching for hot routes.
3. Configure Hangfire queue partitioning and worker concurrency.
4. Add log/job retention cleanup job.
5. Add response compression middleware.
6. Optimize Vite bundle splitting.

### Sprint 9 (SEO + Accessibility)

1. Add dynamic meta tags with `react-helmet-async`.
2. Generate `sitemap.xml` and `robots.txt`.
3. Add keyboard navigation and ARIA labels.
4. Add responsive mobile layout with collapsible sidebar.
5. Add Bangla language toggle (if `NameBn` content exists).

---

## 8. Testing Strategy

### 8.1 Backend Tests

| Layer | Framework | Scope | Examples |
| ----- | --------- | ----- | -------- |
| Unit | xUnit + Moq | Service logic, helpers, validators | `CanonicalUrlHelperTests`, `NewsArticleIngestionHelperTests`, `AuthServiceTests` |
| Integration | xUnit + WebApplicationFactory | API endpoints, DB operations, auth flows | `NewsController` CRUD, `AuthController` login/register, pagination |
| Database | xUnit + TestContainers | Migrations, constraints, indexes | Fresh PostgreSQL container per test run, verify migrations apply cleanly |

#### Priority Test Cases (Backend)

- [ ] Health state machine transitions (Active → Degraded → Paused → Active).
- [ ] Circuit breaker auto-pauses at threshold and resets on success.
- [ ] Canonical URL normalization strips tracking params correctly.
- [ ] Duplicate article insert is rejected (DB constraint + app-level).
- [ ] JWT authentication rejects expired/invalid tokens.
- [ ] Role-based authorization (Admin-only endpoints reject Editor/User).
- [ ] Fetch job lifecycle (Queued → Running → Completed/Failed).
- [ ] Parser fallback chain tries methods in correct order.

### 8.2 Frontend Tests

| Layer | Framework | Scope | Examples |
| ----- | --------- | ----- | -------- |
| Unit | Vitest | Utility functions, hooks, services | Date formatting, reading time calculation, API client methods |
| Component | Vitest + React Testing Library | Component rendering, user interaction | `NewsCard` renders with/without image, `LoginModal` validates input |
| E2E | Playwright | Full user flows across pages | Login → browse → search → view article → logout |

#### Priority Test Cases (Frontend)

- [ ] `NewsCard` renders image fallback when `thumbnailUrl` is null.
- [ ] `NewsCard` renders image fallback when image URL fails to load.
- [ ] Login modal shows error on invalid credentials.
- [ ] Auth context provides correct permissions per role.
- [ ] Pagination loads next page when "Load More" is clicked.
- [ ] Search returns results matching query.
- [ ] Error boundary catches component errors and shows fallback UI.
- [ ] 404 page renders for unknown routes.

### 8.3 CI Integration

- [ ] Add `dotnet test` step in GitHub Actions Job 1.
- [ ] Add `npx vitest run` step for frontend unit/component tests.
- [ ] Add Playwright E2E tests as a separate CI job (runs against Docker Compose stack).
- [ ] Enforce test pass as merge requirement on `main` branch.

---

## 9. Risks and Mitigations

| #   | Risk                                         | Likelihood | Impact   | Mitigation                                                                      |
| --- | -------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------- |
| 1   | External sources change markup unexpectedly  | High       | Medium   | Parser fallback chain + per-source test harness + alert on consecutive failures |
| 2   | Worker overload under mass failures          | Medium     | High     | Per-source circuit breaker + queue throttling + worker concurrency limits       |
| 3   | Auth/RBAC drift between API and UI           | Low        | High     | API is source of truth; shared role constants; integration smoke tests          |
| 4   | Log noise without actionable context         | Medium     | Medium   | Structured error codes + correlation IDs + Seq filtering                        |
| 5   | Bad deployment causes downtime               | Medium     | High     | CI/CD smoke tests + rollback script + image tagging by SHA                      |
| 6   | Database loss                                | Low        | Critical | Automated daily backups + tested restore procedure                              |
| 7   | Secret leakage in logs or API responses      | Medium     | Critical | API key masking + encrypted storage + Serilog destructuring policies            |
| 8   | Disk exhaustion from Docker logs             | Medium     | High     | JSON log driver with `max-size: 10m` and `max-file: 3`                          |
| 9   | Broken frontend import crashes entire app    | High       | High     | Error boundary + CI build step + fix `NewsSourcesPage` import immediately       |
| 10  | Frontend bundle size grows uncontrolled      | Medium     | Medium   | Vite chunk splitting + bundle analyzer + CI size budget check                   |
| 11  | Brute-force login attempts                   | Medium     | High     | Rate limiting on auth endpoints (5 req/min per IP) + account lockout policy     |
| 12  | SEO invisible — no indexing                  | High       | Medium   | Dynamic meta tags + sitemap.xml + robots.txt in Sprint 9                        |

---

## 10. Implementation Notes for Current Repository

1. Keep role-protected channel actions (`Admin`, `Editor`) as-is in API controllers.
2. Extend current MCP/Hangfire scheduling with job entity persistence — do not duplicate scheduling in API.
3. Reuse existing logging stack (Seq + Prometheus/Grafana monitoring stack).
4. Keep migration changes additive and backward compatible.
5. Use `prometheus-net.AspNetCore` (not a custom metrics endpoint) for `/metrics`.
6. Base `docker-compose.yml` remains the local testing compose; `docker-compose.prod.yml` extends it for production.
7. GitHub Actions workflow uses `docker compose -f docker-compose.yml -f docker-compose.prod.yml` for production builds.
8. All new environment variables must be added to both `.env.example` and the CI/CD workflow secrets list.
9. Standardize frontend on `axios` with a shared instance (`axiosInstance.ts`) providing base URL, auth interceptor, and error transform.
10. Use `react-helmet-async` for dynamic `<head>` management — do not use SSR at this stage.
11. Frontend routing should use lazy loading (`React.lazy` + `Suspense`) for all page components to enable code splitting.

---

## 11. Production Deployment Checklist

Pre-deployment verification (run before every production release):

### Infrastructure

- [ ] `.env` file contains all variables from `.env.example` with production values.
- [ ] No default/weak passwords remain (`YourSecurePassword123`, etc.).
- [ ] `JWT_SECRET_KEY` is 32+ characters, randomly generated.
- [ ] Database ports (5432, 27017, 6379) are NOT exposed to host in production compose.
- [ ] Docker log rotation is configured (`max-size`, `max-file`).
- [ ] Resource limits are set on all containers.
- [ ] SSL/TLS is configured on the reverse proxy.
- [ ] Seq authentication is enabled.

### Application

- [ ] `ASPNETCORE_ENVIRONMENT=Production` is set.
- [ ] `CORS_ALLOWED_ORIGINS` matches actual production domain(s).
- [ ] `AllowedHosts` in appsettings matches production domain(s).
- [ ] Swagger/OpenAPI UI is disabled (only enabled in Development/Staging).
- [ ] HTTPS redirection and HSTS are enabled.
- [ ] EF Core migrations apply cleanly on fresh database.
- [ ] API rate limiting is configured and tested.

### Frontend

- [ ] Production build completes without TypeScript errors (`npx tsc --noEmit`).
- [ ] No broken imports or missing page components.
- [ ] Bundle size is under budget (300KB gzipped).
- [ ] Error boundary is in place and tested.
- [ ] All routes render correctly (no white screens).
- [ ] API base URL points to production domain (not localhost).

### Monitoring

- [ ] Prometheus scrapes API and MCP `/metrics` endpoints.
- [ ] Grafana dashboards load with data.
- [ ] Alert rules are configured and notification channel is set.
- [ ] Seq receives structured logs from API and MCP.

### Operations

- [ ] Backup script runs successfully and produces valid archives.
- [ ] Restore from backup has been tested on a non-production instance.
- [ ] Rollback script has been tested with a previous image tag.
- [ ] Health check endpoint returns 200.
- [ ] Smoke tests pass against production URL.

---

## 12. Definition of Done

For each feature:

1. Feature completed with migration, API, service logic, and UI updates.
2. Unit and integration tests written and passing.
3. Smoke tests updated for role-protected fetch + job status.
4. Logs include correlation IDs and standardized error codes.
5. Dashboards and alerts include new reliability metrics.
6. Documentation updated with operator runbook and troubleshooting flow.

For deployment readiness:

1. CI/CD pipeline passes end-to-end (build -> test -> push -> deploy -> smoke test).
2. Production checklist above is fully green.
3. Backup and rollback procedures are documented and tested.
4. DEPLOYMENT.md reflects actual infrastructure (no references to non-existent files).
5. All frontend routes load without errors on production build.
6. Lighthouse Performance score meets target (>85).
