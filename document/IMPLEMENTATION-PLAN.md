# NewsPortal Implementation Plan

**Generated:** 2026-02-19  
**Status:** Remaining features from Robust News Channel Feature Plan  
**Target:** Production-ready news aggregator with full reader experience

---

## Executive Summary

### Current State
- ✅ **Backend:** 95% complete - All core APIs, health tracking, duplicate detection, CI/CD ready
- ✅ **Infrastructure:** 100% complete - Docker, monitoring, backup/rollback scripts deployed
- ⚠️ **Frontend:** 60% complete - Shell works, but missing critical reader features

### Priority Focus
1. **Critical** - Fix broken UX (detail page, 404, error handling)
2. **High** - Core reader features (search, pagination, trending)
3. **Medium** - Engagement features (bookmarks, history, notifications)
4. **Low** - Polish (PWA, SEO, i18n)

---

## Phase 1: Critical Fixes (Week 1)

### 1.1 Article Detail Page
**Priority:** Critical | **Estimate:** 4 hours | **Dependencies:** None

**Backend:** ✅ Already exists (`GET /news/{slug}`)

**Frontend Tasks:**
- [ ] Create `src/pages/ArticleDetailPage.tsx`
- [ ] Add route in `App.tsx`: `/news/:slug`
- [ ] Wire "READ MORE" button in `NewsCard.tsx` to `/news/{slug}`
- [ ] Display: title, author, publish date, source, image, content
- [ ] Add reading time estimate: `Math.ceil(plainText.split(/\s+/).length / 200)`
- [ ] Add "Back to Home" navigation

**Acceptance Criteria:**
- Article loads with full content
- ViewCount increments on view
- Reading time displays correctly
- Mobile-responsive layout

---

### 1.2 Error Boundary Component
**Priority:** Critical | **Estimate:** 2 hours | **Dependencies:** None

**Tasks:**
- [ ] Create `src/components/ErrorBoundary.tsx` (React Class component)
- [ ] Wrap all route content in `App.tsx` with ErrorBoundary
- [ ] Show friendly error UI with "Go Home" button
- [ ] Log errors to console (future: send to backend)

**Acceptance Criteria:**
- Unhandled component errors show friendly UI
- No white screens
- Error details logged

---

### 1.3 404 Not Found Page
**Priority:** Critical | **Estimate:** 1 hour | **Dependencies:** None

**Tasks:**
- [ ] Create `src/pages/NotFoundPage.tsx`
- [ ] Add catch-all route in `App.tsx`: `*`
- [ ] Style with app theme (glass-morphism dark)
- [ ] Add "Go Home" button

**Acceptance Criteria:**
- Unknown routes show 404 page
- Consistent with app design

---

### 1.4 Delete Unused Mock Data
**Priority:** Low | **Estimate:** 15 min | **Dependencies:** None

**Tasks:**
- [ ] Delete `src/data/newsData.ts`
- [ ] Remove any imports referencing it

---

### 1.5 Standardize HTTP Client
**Priority:** Medium | **Estimate:** 3 hours | **Dependencies:** None

**Tasks:**
- [ ] Create `src/services/axiosInstance.ts`
  - Base URL from env
  - Auth header interceptor
  - Global error handling (401 → logout, 500 → toast)
- [ ] Migrate `api.ts` from `fetch` to `axios`
- [ ] Update `AuthService.ts` to use shared instance
- [ ] Update `NewsSourceService.ts` to use shared instance

**Acceptance Criteria:**
- All API calls use single axios instance
- Auth headers injected automatically
- Consistent error handling

---

## Phase 2: Core Reader Features (Week 2)

### 2.1 Functional Search
**Priority:** High | **Estimate:** 6 hours | **Dependencies:** 1.5 (axiosInstance)

**Backend:** ✅ Already exists (`POST /news/search`)

**Frontend Tasks:**
- [ ] Add debounced search input in `Navbar.tsx` (300ms)
- [ ] Create `src/pages/SearchResultsPage.tsx`
- [ ] Add route: `/search?q={query}`
- [ ] Show search results with NewsCard grid
- [ ] Add "No results" state
- [ ] Add recent searches (localStorage)

**Acceptance Criteria:**
- Search returns relevant results
- Debounced to avoid excessive API calls
- Results page paginated

---

### 2.2 Pagination Controls
**Priority:** High | **Estimate:** 3 hours | **Dependencies:** 1.5 (axiosInstance)

**Tasks:**
- [ ] Add `pageNumber` state to `HomePage.tsx`
- [ ] Add "Load More" button or page number controls
- [ ] Use `PagedResult.hasNextPage` from API response
- [ ] Append results (infinite scroll) OR navigate pages

**Acceptance Criteria:**
- Can load more than page 1
- Smooth UX (no jarring jumps)
- Shows "No more articles" when done

---

### 2.3 Category Filtering
**Priority:** High | **Estimate:** 4 hours | **Dependencies:** 1.5 (axiosInstance)

**Backend:** ✅ Already exists (`GET /news/category/{slug}`)

**Frontend Tasks:**
- [ ] Fetch categories on HomePage mount
- [ ] Add category tabs/chips above news grid
- [ ] Filter news by selected category
- [ ] Update "All News / Popular / Recent" buttons with actual logic
- [ ] Add category badge colors from `CategoryDto.color`

**Acceptance Criteria:**
- Clicking category filters feed
- Active category highlighted
- "All News" clears filter

---

### 2.4 Trending Articles Page
**Priority:** High | **Estimate:** 5 hours | **Dependencies:** None

**Backend Tasks:**
- [ ] Create `GET /api/v1/news/trending`
  - Query: articles with highest `ViewCount` in last 24/48h
  - Cache with Redis (5 min TTL)

**Frontend Tasks:**
- [ ] Replace `/trending` placeholder with real page
- [ ] Fetch from trending endpoint
- [ ] Display with numbered ranking

**Acceptance Criteria:**
- Shows most-viewed articles
- Updates daily
- Mobile-responsive

---

### 2.5 Loading Skeleton Components
**Priority:** Medium | **Estimate:** 2 hours | **Dependencies:** None

**Tasks:**
- [ ] Create `src/components/SkeletonCard.tsx`
- [ ] Match NewsCard layout (image, title lines, meta)
- [ ] Replace "Loading..." text in `HomePage.tsx`
- [ ] Add skeleton to `ArticleDetailPage`

**Acceptance Criteria:**
- Skeletons match content layout
- Improves perceived performance

---

## Phase 3: Engagement Features (Week 3)

### 3.1 Bookmarks / Saved Articles
**Priority:** High | **Estimate:** 8 hours | **Dependencies:** 1.1 (ArticleDetailPage)

**Backend Tasks:**
- [ ] Create `UserBookmark` entity (`UserId`, `ArticleId`, `CreatedAt`)
- [ ] Add `POST /api/v1/bookmarks/{articleId}`
- [ ] Add `DELETE /api/v1/bookmarks/{articleId}`
- [ ] Add `GET /api/v1/bookmarks` (paginated)
- [ ] Add migration

**Frontend Tasks:**
- [ ] Add bookmark icon to `NewsCard.tsx`
- [ ] Create `src/pages/BookmarksPage.tsx`
- [ ] Add route: `/bookmarks` (auth required)
- [ ] Add "Saved" badge on bookmarked articles

**Acceptance Criteria:**
- Users can save/remove articles
- Bookmarks persist across sessions
- Requires auth

---

### 3.2 Reading History
**Priority:** Medium | **Estimate:** 6 hours | **Dependencies:** 1.1 (ArticleDetailPage)

**Backend Tasks:**
- [ ] Create `UserReadHistory` entity (`UserId`, `ArticleId`, `ReadAt`)
- [ ] Record on article detail view (throttled: 1 per article per user)
- [ ] Add `GET /api/v1/reading-history` (last 50 items)

**Frontend Tasks:**
- [ ] Add "Recently Read" section to sidebar or profile
- [ ] Display as compact list

**Acceptance Criteria:**
- History auto-updates on read
- Shows last 50 articles
- Requires auth

---

### 3.3 Toast/Notification System
**Priority:** Medium | **Estimate:** 3 hours | **Dependencies:** 1.5 (axiosInstance)

**Tasks:**
- [ ] Install `react-hot-toast`
- [ ] Create `src/components/ToastProvider.tsx`
- [ ] Wire to axios error interceptor (show error toasts)
- [ ] Add success toasts for actions (bookmark, fetch, etc.)

**Acceptance Criteria:**
- Toasts appear on API errors
- Success feedback on actions
- Auto-dismiss after 3s

---

### 3.4 Fetch Job Status Polling
**Priority:** Medium | **Estimate:** 4 hours | **Dependencies:** 2.5 (ToastProvider)

**Backend:** ✅ Already exists (`GET /fetchjobs/{externalId}`)

**Frontend Tasks:**
- [ ] When user triggers manual fetch, poll job status every 2s
- [ ] Show progress modal/toast
- [ ] Display: status, articles imported, errors
- [ ] Stop polling on terminal status (Completed/Failed)

**Acceptance Criteria:**
- Real-time fetch progress visible
- Shows final results summary

---

### 3.5 Test Source Results Modal
**Priority:** Medium | **Estimate:** 3 hours | **Dependencies:** 2.5 (ToastProvider)

**Backend:** ✅ Already exists (`POST /newssources/test`)

**Frontend Tasks:**
- [ ] After "Test Source", show modal with results
- [ ] Display: response time, valid/invalid counts, sample titles, issues list

**Acceptance Criteria:**
- Clear test results UI
- Shows validation issues

---

## Phase 4: Admin & Operations (Week 4)

### 4.1 Admin Dashboard
**Priority:** High | **Estimate:** 6 hours | **Dependencies:** None

**Backend Tasks:**
- [ ] Create `GET /api/v1/admin/stats`
  - Total sources, articles, active/paused/failed
  - Articles today, fetch job stats

**Frontend Tasks:**
- [ ] Create `src/pages/admin/DashboardPage.tsx`
- [ ] Add route: `/admin/dashboard` (Admin only)
- [ ] Display stat cards
- [ ] Add chart for articles/day (optional: recharts)

**Acceptance Criteria:**
- Shows operational metrics
- Admin-only access

---

### 4.2 Fetch History Log Viewer
**Priority:** High | **Estimate:** 5 hours | **Dependencies:** None

**Backend:** ✅ Already exists (`GetFailedLogsAsync`, `GetRecentAsync`)

**Frontend Tasks:**
- [ ] Create `src/pages/admin/FetchLogPage.tsx`
- [ ] Add route: `/admin/fetch-logs`
- [ ] Table with filters: source, status, date range
- [ ] Show: duration, articles fetched, error details

**Acceptance Criteria:**
- Filterable log viewer
- Shows error details on expand

---

### 4.3 User Registration Page
**Priority:** High | **Estimate:** 4 hours | **Dependencies:** 1.5 (axiosInstance)

**Backend:** ✅ Already exists (`POST /auth/register`)

**Frontend Tasks:**
- [ ] Create `src/pages/RegisterPage.tsx`
- [ ] Add route: `/register`
- [ ] Form: username, email, password, confirm password
- [ ] Backend validation: email format, password strength, uniqueness
- [ ] Redirect to login on success

**Acceptance Criteria:**
- Full registration flow
- Validation errors shown

---

### 4.4 User Profile Page
**Priority:** Medium | **Estimate:** 4 hours | **Dependencies:** 1.5 (axiosInstance)

**Backend:** ✅ Already exists (`GET /auth/me`, `POST /auth/change-password`)

**Frontend Tasks:**
- [ ] Create `src/pages/ProfilePage.tsx`
- [ ] Add route: `/profile` (auth required)
- [ ] Display: username, email, role, join date
- [ ] Add change password form

**Acceptance Criteria:**
- Users can view profile
- Can change password

---

### 4.5 Responsive Mobile Layout
**Priority:** Medium | **Estimate:** 6 hours | **Dependencies:** None

**Tasks:**
- [ ] Add collapsible hamburger menu for mobile (<768px)
- [ ] Sidebar becomes drawer
- [ ] Adjust grid columns: 1 on mobile, 2 on tablet, 3+ on desktop
- [ ] Test on 360px viewport

**Acceptance Criteria:**
- Fully functional on mobile
- Hamburger menu works
- No horizontal scroll

---

## Phase 5: SEO & Polish (Week 5)

### 5.1 Dynamic Meta Tags
**Priority:** High | **Estimate:** 3 hours | **Dependencies:** 1.1 (ArticleDetailPage)

**Tasks:**
- [ ] Install `react-helmet-async`
- [ ] Wrap app with `HelmetProvider`
- [ ] Set `<title>`, `og:title`, `og:description`, `og:image` on:
  - HomePage
  - ArticleDetailPage
  - Category pages
- [ ] Add Twitter Card meta

**Acceptance Criteria:**
- Social sharing shows correct preview
- Each page has unique title/description

---

### 5.2 Sitemap.xml Generation
**Priority:** High | **Estimate:** 3 hours | **Dependencies:** None

**Backend Tasks:**
- [ ] Create `GET /sitemap.xml`
- [ ] Query all published article slugs + categories
- [ ] Generate XML sitemap
- [ ] Add to `robots.txt` (serve from Nginx)

**Acceptance Criteria:**
- Valid XML sitemap
- Includes all articles

---

### 5.3 RSS Feed Output
**Priority:** Medium | **Estimate:** 4 hours | **Dependencies:** None

**Backend Tasks:**
- [ ] Create `GET /api/v1/feed/rss`
- [ ] Generate RSS 2.0 XML from latest 50 articles
- [ ] Optional: per-category feeds `/feed/rss?category={slug}`

**Frontend Tasks:**
- [ ] Add RSS link to footer
- [ ] Add `<link rel="alternate" type="application/rss+xml">` to head

**Acceptance Criteria:**
- Valid RSS feed
- Subscribable in feed readers

---

### 5.4 Related Articles
**Priority:** Medium | **Estimate:** 4 hours | **Dependencies:** 1.1 (ArticleDetailPage)

**Backend Tasks:**
- [ ] Create `GET /news/{slug}/related`
  - Same category, exclude current, order by `PublishedAt DESC`, limit 4

**Frontend Tasks:**
- [ ] Add "Related Articles" section on detail page
- [ ] Display as 4-card grid or list

**Acceptance Criteria:**
- Shows relevant articles
- Keeps readers engaged

---

### 5.5 Infinite Scroll
**Priority:** Medium | **Estimate:** 3 hours | **Dependencies:** 2.2 (Pagination)

**Tasks:**
- [ ] Add Intersection Observer to HomePage
- [ ] Auto-load next page when scrolling near bottom
- [ ] Show loading spinner at bottom

**Acceptance Criteria:**
- Seamless infinite scroll
- No duplicate articles

---

## Phase 6: Advanced Features (Week 6+)

### 6.1 WebSocket Live Updates
**Priority:** Low | **Estimate:** 8 hours

**Backend:**
- [ ] Add SignalR hub
- [ ] Broadcast on new article ingestion

**Frontend:**
- [ ] Subscribe to hub
- [ ] Show "5 new articles" toast
- [ ] Auto-prepend to feed

---

### 6.2 Article Comments
**Priority:** Low | **Estimate:** 10 hours

**Backend:**
- [ ] Create `Comment` entity (threaded with `ParentId`)
- [ ] Add moderation flag
- [ ] CRUD endpoints

**Frontend:**
- [ ] Comment section on detail page
- [ ] Threaded replies

---

### 6.3 PWA Support
**Priority:** Low | **Estimate:** 6 hours

**Tasks:**
- [ ] Install `vite-plugin-pwa`
- [ ] Configure manifest.json
- [ ] Add service worker
- [ ] Offline fallback page
- [ ] Install prompt

---

### 6.4 Internationalization (i18n)
**Priority:** Low | **Estimate:** 8 hours

**Tasks:**
- [ ] Install `react-i18next`
- [ ] Add English + Bangla translation files
- [ ] Language toggle in Navbar
- [ ] Use `NameBn` for categories when Bangla selected

---

## Migration Checklist

| Migration | Entity | Status |
| --------- | ------ | ------ |
| `AddUserBookmarks` | `UserBookmark` | Pending Phase 3.1 |
| `AddUserReadHistory` | `UserReadHistory` | Pending Phase 3.2 |
| `AddComments` | `Comment` | Pending Phase 6.2 |

---

## File Structure After Implementation

```
src/
├── App.tsx                        // Updated with all routes + ErrorBoundary
├── components/
│   ├── Navbar.tsx                 // + functional search
│   ├── Sidebar.tsx                // + mobile hamburger
│   ├── NewsCard.tsx               // + READ MORE link, bookmark icon
│   ├── ErrorBoundary.tsx          // NEW
│   ├── SkeletonCard.tsx           // NEW
│   └── ToastProvider.tsx          // NEW
├── pages/
│   ├── HomePage.tsx               // + pagination, category filter
│   ├── ArticleDetailPage.tsx      // NEW
│   ├── NewsSourcesPage.tsx        // ✅ Already created
│   ├── SearchResultsPage.tsx      // NEW
│   ├── TrendingPage.tsx           // NEW (replace placeholder)
│   ├── BookmarksPage.tsx          // NEW
│   ├── ProfilePage.tsx            // NEW
│   ├── RegisterPage.tsx           // NEW
│   ├── NotFoundPage.tsx           // NEW
│   └── admin/
│       ├── DashboardPage.tsx      // NEW
│       └── FetchLogPage.tsx       // NEW
├── services/
│   ├── axiosInstance.ts           // NEW
│   ├── api.ts                     // Migrated to axios
│   ├── AuthService.ts             // Updated
│   └── NewsSourceService.ts       // Updated
├── context/
│   └── AuthContext.tsx            // + bookmark state
├── types/
│   └── (add Bookmark, History types)
└── data/
    └── newsData.ts                // DELETED
```

---

## Testing Strategy

### Unit Tests (Backend)
- [ ] `TitleSimilarityHelper` tests
- [ ] `CanonicalUrlHelper` tests
- [ ] `FetchErrorClassifier` tests
- [ ] Service layer tests (NewsService, NewsFetcherService)

### Integration Tests (Backend)
- [ ] API endpoint tests (xUnit + TestServer)
- [ ] Repository tests with test DB

### Frontend Tests
- [ ] Component tests (Vitest + React Testing Library)
- [ ] E2E tests (Playwright): login, browse, search, bookmark

---

## Success Metrics (Post-Implementation)

| Metric | Target | Measurement |
| ------ | ------ | ----------- |
| First Contentful Paint | <1.5s | Lighthouse |
| Lighthouse Performance | >85 | Lighthouse CI |
| Duplicate article rate | <1% | Backend analytics |
| Source uptime | 99%+ | Grafana dashboards |
| Mobile usability | 100% | Lighthouse mobile |
| Zero runtime crashes | 0 | Error tracking |

---

## Timeline Summary

| Phase | Duration | Features |
| ----- | -------- | -------- |
| Phase 1 | Week 1 | Critical fixes (detail page, error boundary, 404) |
| Phase 2 | Week 2 | Core reader (search, pagination, trending) |
| Phase 3 | Week 3 | Engagement (bookmarks, history, toasts) |
| Phase 4 | Week 4 | Admin (dashboard, logs, registration) |
| Phase 5 | Week 5 | SEO (meta tags, sitemap, RSS) |
| Phase 6 | Week 6+ | Advanced (WebSocket, comments, PWA, i18n) |

**Total Estimated Time:** 100-120 hours (5-6 weeks full-time)

---

## Next Steps

1. **Start with Phase 1.1** (Article Detail Page) - highest impact
2. **Phase 1.2-1.3** (Error Boundary, 404) - quick wins
3. **Phase 1.5** (Standardize HTTP Client) - foundation for Phase 2
4. **Phase 2** - complete core reader experience
5. **Iterate** based on user feedback

---

**Last Updated:** 2026-02-19  
**Version:** 1.0
