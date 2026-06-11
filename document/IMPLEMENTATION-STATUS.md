# NewsPortal - Implementation Status

> ⚠️ **Legacy snapshot** — এই document-টা মূল .NET/Docker stack-এর status snapshot (May 24, 2026 পর্যন্ত)। বর্তমান LIVE stack হলো Cloudflare (Hono Worker + D1 + Pages) — SignalR-এর জায়গায় এখন SSE। দেখুন CLAUDE.md ও document/CLOUDFLARE-DEPLOYMENT.md।

> **Project**: NewsPortal - News Aggregation Platform
> **Stack**: ASP.NET Core 8.0 + React 18 + TypeScript + Vite + Tailwind CSS + PostgreSQL + MongoDB + Redis
> **Created**: February 19, 2026
> **Last Updated**: May 24, 2026

---

## Summary

| Priority | Total | Done | Status |
|----------|-------|------|--------|
| P0 - Critical Bug Fixes | 7 | 7 | Complete |
| P1 - High Priority Features | 6 | 6 | Complete |
| P2 - Medium Priority Features | 8 | 8 | Complete |
| P3 - Low Priority / Nice-to-Have | 8 | 8 | Complete |
| P4 - Future Vision | 6 | 5 | 5/6 (Mobile App skipped) |
| Infrastructure (Phase 0) | 6 | 6 | Complete |
| Frontend Foundations (Phase 1) | 6 | 6 | Complete |
| Core Frontend (Phase 2) | 5 | 5 | Complete |
| Engagement (Phase 3) | 5 | 5 | Complete |
| Admin & Operations (Phase 4) | 5 | 5 | Complete |
| SEO & Polish (Phase 5) | 6 | 6 | Complete |
| Advanced Features (Phase 6) | 4 | 4 | Complete |

---

## P0 - Critical Bug Fixes

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 1.1 | Article Detail Page - 500 Error | Done | 2026-02-28 | Fixed `NewsController.cs` + `NewsService.GetNewsDetailAsync()` |
| 1.2 | SuperAdmin Cannot Access Admin Dashboard | Done | 2026-02-28 | Fixed role check to include "SuperAdmin" |
| 1.3 | Search Results Count Shows "0" Despite Results | Done | 2026-02-28 | Fixed `SearchResultsPage.tsx` totalCount binding |
| 1.4 | Bengali Slug URL Encoding Issues | Done | 2026-02-28 | Fixed `SlugHelper.cs` + `ArticleDetailPage.tsx` |
| 1.5 | Incomplete i18n Translations | Done | 2026-02-28 | Completed `bn/translation.json` |
| 1.6 | Many Articles Show Placeholder Image | Done | 2026-02-28 | Fixed image fetching in `NewsFetcherService.cs` |
| 1.7 | Categories All Show "GENERAL" | Done | 2026-02-28 | Implemented auto-categorization in `NewsService.cs` using `ArticleCategorizer` |

---

## P1 - High Priority Features

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 2.1 | Article Category Sidebar/Navigation | Done | 2026-02-28 | Dynamic category list in sidebar, `/category/{slug}` pages |
| 2.2 | Article Share Functionality | Done | 2026-02-28 | `ShareButton.tsx` - Copy Link, Facebook, Twitter/X, WhatsApp, Telegram, Email + Web Share API |
| 2.3 | Dark/Light Theme Toggle | Done | 2026-02-28 | `ThemeContext.tsx` with localStorage persistence, sun/moon toggle in Navbar |
| 2.4 | Article Text-to-Speech | Done | 2026-02-28 | `TextToSpeech.tsx` - Web Speech API with Play/Pause/Stop, speed control, Bengali support |
| 2.5 | Enhanced Admin Dashboard | Done | 2026-02-28 | Charts via Recharts, article trends, source health, category distribution |
| 2.6 | Notification Preferences | Done | 2026-02-28 | Category/source subscriptions via SignalR |

---

## P2 - Medium Priority Features

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 3.1 | Article Reactions / Likes | Done | 2026-03-01 | `ArticleReactions.tsx`, `ReactionsController.cs`, emoji reactions (Like, Love, Informative, Shocking, Sad, Angry) |
| 3.2 | Comment Upvote/Downvote | Done | 2026-03-01 | `CommentVote` entity, upvote/downvote in `CommentsSection.tsx` |
| 3.3 | User Preferences / Personalized Feed | Done | 2026-03-01 | Reading history-based recommendations on HomePage |
| 3.4 | Newsletter / Email Digest | Done | 2026-03-01 | `NewsletterSignup.tsx` signup form in sidebar |
| 3.5 | Advanced Search with Filters | Done | 2026-03-01 | Date range, source, category filters, sort options in `SearchResultsPage.tsx` |
| 3.6 | Reading Time Estimation on Cards | Done | 2026-03-01 | Calculated from content length (200 words/min) on `NewsCard.tsx` |
| 3.7 | Infinite Scroll / Back to Top | Done | 2026-03-01 | `BackToTop.tsx` floating button after scrolling |
| 3.8 | Article Font Size Control | Done | 2026-03-01 | Font size toggle (S/M/L) on article detail page with localStorage persistence |

---

## P3 - Low Priority / Nice-to-Have

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 4.1 | Offline Reading (PWA Enhancement) | Done | 2026-03-01 | `SaveOfflineButton.tsx` - saves article to IndexedDB for offline reading |
| 4.2 | Social Login (Google/Facebook/GitHub) | Done | 2026-03-01 | OAuth2 login buttons on login modal UI |
| 4.3 | Article Reporting / Flagging | Done | 2026-03-01 | `ReportButton.tsx`, `ReportsController.cs`, `ArticleReport` entity with reasons |
| 4.4 | Keyboard Shortcuts | Done | 2026-03-01 | `KeyboardShortcuts.tsx` - j/k navigate, o open, b bookmark, s/? search, Esc close |
| 4.5 | News Ticker / Breaking News Banner | Done | 2026-03-01 | `NewsTicker.tsx` - scrolling horizontal ticker below navbar, auto-updates, dismissible |
| 4.6 | Admin Article Management (CRUD) | Done | 2026-03-01 | `ArticleManagementPage.tsx`, `AdminArticlesController.cs` - create, edit, feature, hide, delete |
| 4.7 | Weather Widget | Done | 2026-03-01 | `WeatherWidget.tsx` in sidebar - temperature, icon, location detection |
| 4.8 | Live Score / Stock Ticker Widget | Done | 2026-03-01 | `StockTicker.tsx` in sidebar - Dhaka Stock Exchange ticker |

---

## P4 - Future Vision

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 5.1 | AI-Powered Article Summarization | Done | 2026-03-01 | `SummarizeButton.tsx`, `AiController.cs` - TF-IDF extractive summarization, bullet/paragraph modes |
| 5.2 | AI Auto-Categorization | Done | 2026-03-01 | `AiController.cs` - keyword-based classifier, single + bulk endpoints, admin "Auto-Categorize" button |
| 5.3 | Multi-Language Article Translation | Done | 2026-03-01 | `TranslateButton.tsx` - 6 languages (Bengali, English, Hindi, Spanish, French, Arabic) via MyMemory API |
| 5.4 | Mobile App (React Native) | Skipped | — | Requires separate project (~40+ hours), out of scope |
| 5.5 | Content Analytics Dashboard | Done | 2026-03-01 | `ContentAnalyticsPage.tsx`, `AnalyticsController.cs` - 6 endpoints, Recharts dashboard with area/pie/bar charts |
| 5.6 | Comment Sentiment Analysis | Done | 2026-03-01 | `SentimentBadge.tsx` - keyword-based sentiment (English + Bengali), visual mini bar |

---

## Infrastructure & Foundation (from Implementation Plan)

### Phase 0 - Deployment Infrastructure

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 0.1 | Environment Configuration | Done | 2026-02-19 | `.env` (root, git-ignored), Docker env vars — variable list inlined in `README.md` |
| 0.2 | Docker Compose Production | Done | 2026-02-19 | `docker-compose.yml` with all services |
| 0.3 | Nginx Production Hardening | Done | 2026-02-19 | `nginx.prod.conf` with gzip, security headers, rate limiting |
| 0.4 | CI/CD Pipeline | Done | 2026-02-19 | GitHub Actions workflows |
| 0.5 | Backup Automation | Done | 2026-02-19 | `script/backup.sh` for PostgreSQL + MongoDB |
| 0.6 | Rollback Strategy | Done | 2026-02-19 | `script/rollback.sh` with SHA-based image tags |

### Phase 1 - Frontend Foundations (Critical Fixes)

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 1.1 | Article Detail Page | Done | 2026-02-19 | `ArticleDetailPage.tsx` with full article view |
| 1.2 | Error Boundary Component | Done | 2026-02-19 | `ErrorBoundary.tsx` wrapping all routes |
| 1.3 | 404 Not Found Page | Done | 2026-02-19 | `NotFoundPage.tsx` with catch-all route |
| 1.4 | Delete Unused Mock Data | Done | 2026-02-19 | Removed `data/newsData.ts` |
| 1.5 | Standardize HTTP Client | Done | 2026-02-19 | `axiosInstance.ts` with interceptors, auth headers |
| 1.6 | Loading Skeleton Components | Done | 2026-02-19 | Skeleton cards matching layout |

### Phase 2 - Core Reader Features

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 2.1 | Functional Search | Done | 2026-02-19 | `SearchResultsPage.tsx` with debounced search |
| 2.2 | Pagination Controls | Done | 2026-02-19 | Infinite scroll with Intersection Observer |
| 2.3 | Category Filtering | Done | 2026-02-19 | Category tabs, sidebar filter, `/category/{slug}` |
| 2.4 | Trending Articles Page | Done | 2026-02-19 | `TrendingPage.tsx` with most-viewed articles |
| 2.5 | Loading Skeleton Components | Done | 2026-02-19 | `SkeletonCard.tsx` matching card layout |

### Phase 3 - Engagement Features

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 3.1 | Bookmarks / Saved Articles | Done | 2026-02-19 | `BookmarksPage.tsx`, `UserBookmark` entity, bookmark icon on cards |
| 3.2 | Reading History | Done | 2026-02-19 | `ReadingHistory.tsx` in sidebar, `UserReadHistory` entity |
| 3.3 | Toast/Notification System | Done | 2026-02-19 | `ToastProvider.tsx` with react-hot-toast |
| 3.4 | Fetch Job Status Polling | Done | 2026-02-19 | `FetchJobStatusModal` with 2s polling |
| 3.5 | Test Source Results Modal | Done | 2026-02-19 | `TestSourceResultsModal` with detailed results |

### Phase 4 - Admin & Operations

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 4.1 | Admin Dashboard | Done | 2026-02-19 | `AdminDashboard.tsx` with stat cards and charts |
| 4.2 | Fetch History Log Viewer | Done | 2026-02-19 | `FetchLogPage.tsx` with filters |
| 4.3 | User Registration Page | Done | 2026-02-19 | `RegisterPage.tsx` with validation |
| 4.4 | User Profile Page | Done | 2026-02-19 | `ProfilePage.tsx` with change password |
| 4.5 | Responsive Mobile Layout | Done | 2026-02-19 | Collapsible sidebar, hamburger menu, mobile-responsive grids |

### Phase 5 - SEO & Polish

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 5.1 | Dynamic Meta Tags | Done | 2026-02-19 | `react-helmet-async` for all pages |
| 5.2 | Sitemap.xml Generation | Done | 2026-02-19 | `GET /sitemap` endpoint |
| 5.3 | RSS Feed Output | Done | 2026-02-19 | `GET /api/v1/feed/rss` with category filtering |
| 5.4 | Related Articles | Done | 2026-02-19 | `GET /news/{slug}/related` on detail page |
| 5.5 | Infinite Scroll | Done | 2026-02-19 | Intersection Observer auto-loading |
| 5.6 | Schema.org JSON-LD | Done | 2026-02-19 | `NewsArticle` structured data |

### Phase 6 - Advanced Features

| # | Feature | Status | Date | Notes |
|---|---------|--------|------|-------|
| 6.1 | WebSocket Live Updates | Done | 2026-02-19 | SignalR Hub with auto-reconnect, breaking news alerts |
| 6.2 | Article Comments | Done | 2026-02-19 | Threaded comments with moderation, `CommentsSection.tsx` |
| 6.3 | PWA Support | Done | 2026-02-19 | `vite-plugin-pwa`, service worker, offline fallback, install prompt |
| 6.4 | Internationalization (i18n) | Done | 2026-02-19 | `react-i18next`, English + Bengali, language toggle |

---

## Key Backend Controllers

| Controller | Endpoints | Purpose |
|------------|-----------|---------|
| `NewsController` | GET latest, featured, trending, category, search, detail | Public news API |
| `AdminController` | GET stats, chart-stats | Admin dashboard data |
| `AdminArticlesController` | GET/POST/PUT/DELETE articles | Article CRUD management |
| `AiController` | POST summarize, categorize, translate; GET sentiment | AI-powered features |
| `AnalyticsController` | GET overview, daily, categories, sources, top, hourly | Content analytics |
| `ReactionsController` | GET/POST/DELETE reactions | Article reactions |
| `ReportsController` | POST report | Article reporting |
| `CommentsController` | GET/POST/DELETE comments | Comment system |
| `BookmarksController` | GET/POST/DELETE bookmarks | Saved articles |
| `AuthController` | POST login/register, GET me/validate | Authentication |

---

## Key Frontend Pages & Components

| Page/Component | Route/Location | Purpose |
|----------------|----------------|---------|
| `HomePage` | `/` | News feed with infinite scroll |
| `ArticleDetailPage` | `/news/:slug` | Full article view with AI features |
| `CategoryPage` | `/category/:slug` | Category-filtered articles |
| `SearchResultsPage` | `/search` | Advanced search with filters |
| `TrendingPage` | `/trending` | Most viewed articles |
| `BookmarksPage` | `/bookmarks` | Saved articles |
| `ProfilePage` | `/profile` | User profile & settings |
| `AdminDashboard` | `/admin/dashboard` | Admin stats & charts |
| `ArticleManagementPage` | `/admin/articles` | Article CRUD |
| `ContentAnalyticsPage` | `/admin/analytics` | Analytics dashboard |
| `SummarizeButton` | Article detail | AI article summarization |
| `TranslateButton` | Article detail | Multi-language translation |
| `SentimentBadge` | Article detail | Comment sentiment analysis |
| `NewsTicker` | Global (below navbar) | Breaking news ticker |
| `KeyboardShortcuts` | Global | Keyboard navigation |
| `BackToTop` | Global | Scroll-to-top button |

---

## News Sources

### Currently Seeded

**Bangladeshi (8 RSS):**

| Source | RSS URL | Status |
|--------|---------|--------|
| Prothom Alo | `https://www.prothomalo.com/feed` | Active |
| bdnews24 | `https://bdnews24.com/topic/rss` | Active |
| Bangla Tribune | `https://www.banglatribune.com/feed` | Active |
| Jagonews24 | `https://www.jagonews24.com/rss` | Active |
| Sun News Bangladesh | `https://en.sunnews24x7.com/rss` | Active |
| BSS | `https://www.bssnews.net/rss` | Active |
| The Dhaka Post | `https://www.thedhakapost.com/rss.xml` | Active |
| Daily Star | `https://www.thedailystar.net/rss` | Active |

**International (idempotent seed, added 2026-05):**

| Source | Type | Notes |
|--------|------|-------|
| The Guardian | API (Open Platform) | Requires `GUARDIAN_API_KEY`; uses custom Guardian parser in `NewsFetcherService` |
| BBC News - World | RSS | `https://feeds.bbci.co.uk/news/world/rss.xml` |
| BBC News - Asia | RSS | `https://feeds.bbci.co.uk/news/world/asia/rss.xml` |
| Al Jazeera | RSS | `https://www.aljazeera.com/xml/rss/all.xml` |
| TechCrunch | RSS | `https://techcrunch.com/feed/` |

### Recommended Additions (Tier 1 - Highly Reliable RSS)

| Source | Feed URL | Category |
|--------|----------|----------|
| BBC News - World | `https://feeds.bbci.co.uk/news/world/rss.xml` | World |
| BBC News - Asia | `https://feeds.bbci.co.uk/news/world/asia/rss.xml` | World |
| Al Jazeera | `https://www.aljazeera.com/xml/rss/all.xml` | World |
| The Guardian | `https://www.theguardian.com/world/rss` | World |
| TechCrunch | `https://techcrunch.com/feed/` | Technology |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` | Technology |
| CNBC - Top News | `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114` | Business |
| ScienceDaily | `https://www.sciencedaily.com/rss/all.xml` | Science |
| BBC Sport - Cricket | `https://feeds.bbci.co.uk/sport/cricket/rss.xml` | Sports |
| ESPN | `https://www.espn.com/espn/rss/news` | Sports |
| NDTV | `https://feeds.feedburner.com/NDTV-LatestNews` | World |
| Dawn | `https://www.dawn.com/feeds/home` | World |

### Free News APIs

| API | Free Tier | Notes |
|-----|-----------|-------|
| The Guardian | 5,000 calls/day | Structured JSON, free API key |
| Hacker News Firebase | Unlimited | No auth needed |
| NASA APIs | 1,000 req/hour | Free key |
| NewsAPI.org | 100 req/day | Dev-only on free plan |
| GNews.io | 100 req/day | 60,000+ sources |
| NewsData.io | 200 credits/day | Supports Bangladesh filter |

---

## Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| No unit tests | Backend test project placeholder but no real tests | Medium |
| API rate limiting | Nginx has it but API level doesn't | Medium |
| Input sanitization | Comments should be sanitized for XSS | Medium |
| Image optimization | No WebP conversion, no lazy loading srcset | Low |
| Bundle size | No code splitting with React.lazy() | Low |
| Accessibility | Missing ARIA labels, screen reader support | Low |

---

## Database Migrations

| Migration | Entity | Status |
|-----------|--------|--------|
| `InitialCreate` | All core entities | Applied |
| `AddUsersTable` | `User` | Applied |
| `PhaseAHealthAndFetchJobs` | `SourceFetchJob`, health fields | Applied |
| `PhaseBIngestionQuality` | Canonical URL, dedupe | Applied |
| `AddUserBookmarks` | `UserBookmark` | Applied |
| `AddUserReadHistory` | `UserReadHistory` | Applied |
| `AddComments` | `Comment` | Applied |
| `AddReactionsAndVotes` | `ArticleReaction`, `CommentVote` | Applied |
| `AddArticleReports` | `ArticleReport` | Applied |
| `AddReaderRole` | `User.Role` (Reader tier) | Applied |
| `AddAuthProvider` | `User.AuthProvider` (Google OAuth) | Applied |
| `AddBioAndAvatar` | `User.Bio`, `User.AvatarEmoji` | Applied |

**Total: 12 migrations** (see `src/NewsPortal.Repository/Migrations/`)

---

## Recent Updates (March – May 2026)

Tracked here so future readers know what landed after the initial phase plan. Use `git log --since=2026-03-01` for the canonical list.

| Date | Area | Change |
|------|------|--------|
| 2026-05 | Security | Hardened seed data, restricted Swagger to Development, tightened CORS, JWT secret enforcement; fixed .NET 8 version mismatch in Dockerfiles |
| 2026-05 | Bug fix | Fixed view-count increment error; hide summary when full content is available |
| 2026-05 | Fetch | Added Guardian Open Platform API support + custom Guardian parser; idempotent international seed (BBC, Al Jazeera, TechCrunch, Guardian) |
| 2026-05 | Monitoring | Redesigned Grafana dashboards (cAdvisor metrics for cross-platform support) |
| 2026-04 | Swagger | Relaxed CSP for Swagger UI; later restricted to Development only |
| 2026-04 | Networking | Auto-detect server IP for monitoring links and Nginx |
| 2026-04 | Content | Lazy content scraping for articles without full content |
| 2026-04 | UI | Removed article popup → direct navigation to detail page; moved weather widget into greeting section |
| 2026-04 | CORS | Allow LAN users to access the app; fixed Loki config |
| 2026-04 | UI | Mobile responsive classes for 360–430px viewports; username in greeting; 403 fix for Reader role |
| 2026-04 | Home | Dynamic Bangla greeting with Bengali, Hijri, and Gregorian calendar dates |
| 2026-04 | Profile | User bio, emoji avatars, public profile page |
| 2026-04 | AI | Integrated Google Gemini 2.5 Flash for article summarization (TF-IDF kept as fallback) |
| 2026-04 | Auth | Added `AuthProvider` field; hardened Google OAuth security |
| 2026-04 | Cache | Invalidate categories cache on article import/create |
| 2026-03 | Auth | Reader role + Google OAuth + route-based access control + protected routes + rate limiting |
| 2026-03 | Filter | Advanced multi-filter bar replaces source chips; classic filter bar on timeline; DateTime Kind fix |
| 2026-03 | Seed | One seed user per role with simple credentials |

---

*Generated from: FEATURE-PLAN.md, IMPLEMENTATION-PLAN.md, reliable-news-sources.md, robust-news-channel-feature-plan.md*
