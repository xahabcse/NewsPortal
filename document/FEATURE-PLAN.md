# NewsPortal - Feature Implementation Plan

> **Date**: February 28, 2026
> **Based on**: Full UI review + codebase analysis
> **Current State**: 474 articles, 8 sources, 2 users, dark theme UI

---

## Table of Contents

1. [Critical Bug Fixes (Priority 0)](#1-critical-bug-fixes-priority-0)
2. [High-Priority Features (Priority 1)](#2-high-priority-features-priority-1)
3. [Medium-Priority Features (Priority 2)](#3-medium-priority-features-priority-2)
4. [Low-Priority / Nice-to-Have (Priority 3)](#4-low-priority--nice-to-have-priority-3)
5. [Future Vision (Priority 4)](#5-future-vision-priority-4)

---

## 1. Critical Bug Fixes (Priority 0)

These are existing bugs discovered during UI review that must be fixed before adding new features.

### 1.1 Article Detail Page - 500 Error
- **Issue**: Clicking any article "READ MORE" link shows "Article Not Found / Failed to load article"
- **Root Cause**: API endpoint `GET /api/v1/news/{slug}` returns HTTP 500 Internal Server Error
- **Impact**: Core functionality broken — users cannot read any article
- **Files**: `NewsController.cs`, `NewsService.GetNewsDetailAsync()`
- **Effort**: Small (1-2 hours)

### 1.2 SuperAdmin Cannot Access Admin Dashboard
- **Issue**: SuperAdmin role user gets "Access Denied. Admin privileges required." on `/admin/dashboard`
- **Root Cause**: Frontend role check likely only checks for "Admin" role, not "SuperAdmin"
- **Impact**: SuperAdmin cannot see dashboard, fetch logs, or category management
- **Files**: `AdminDashboard.tsx`, `AuthContext.tsx` (role permission checks)
- **Effort**: Small (30 min)

### 1.3 Search Results Count Shows "0" Despite Results
- **Issue**: Search page says "Found 0 articles for 'iran'" but displays matching article cards below
- **Root Cause**: Frontend likely reads `totalCount` from API before results render
- **Files**: `SearchResultsPage.tsx`
- **Effort**: Small (30 min)

### 1.4 Bengali Slug URL Encoding Issues
- **Issue**: Bengali article slugs contain encoded Unicode characters that fail on article detail lookup
- **Root Cause**: Slug generation creates Bengali character slugs; URL decode/encode mismatch between frontend route and backend lookup
- **Files**: `SlugHelper.cs`, `ArticleDetailPage.tsx`
- **Effort**: Medium (2-4 hours)

### 1.5 Incomplete i18n Translations
- **Issue**: Language toggle changes to "বাংলা" but sidebar menu items, greeting text, and most UI strings remain in English
- **Root Cause**: Missing translation keys in `bn/translation.json`
- **Files**: `src/NewsPortal.Client/src/i18n/locales/bn/translation.json`
- **Effort**: Medium (2-3 hours)

### 1.6 Many Articles Show Placeholder Image
- **Issue**: Several news cards display a generic "GENERAL" placeholder icon instead of actual article images
- **Root Cause**: Image fetching from sources may fail or images aren't being downloaded for some sources
- **Files**: `NewsFetcherService.cs`, `MongoImageStorageService.cs`
- **Effort**: Medium (3-5 hours investigation)

### 1.7 Categories All Show "GENERAL"
- **Issue**: All articles display "GENERAL" category badge — no categorization happening
- **Root Cause**: Auto-categorization not implemented or category mapping from sources not working
- **Files**: `NewsService.cs`, category assignment during article ingestion
- **Effort**: Medium (3-5 hours)

---

## 2. High-Priority Features (Priority 1)

Features that significantly improve user experience and fill obvious gaps.

### 2.1 Article Category Sidebar/Navigation
- **What**: Add category-based browsing in the sidebar (Politics, Sports, Business, Technology, Entertainment, etc.)
- **Why**: Currently the sidebar only has Home, Trending, Saved, News Channels. Users have no way to browse by topic.
- **Implementation**:
  - Add dynamic category list in sidebar (fetched from API)
  - Each category links to `/category/{slug}` page
  - Category page with filtered news grid
  - Active category highlighting in sidebar
- **Backend**: Already exists (`GET /api/v1/news/category/{slug}`)
- **Frontend**: New sidebar section + category browse page
- **Effort**: Medium (4-6 hours)

### 2.2 Article Share Functionality
- **What**: Share button on news cards and article detail page
- **Why**: No way to share articles via social media or copy link
- **Implementation**:
  - Share dropdown/modal with options: Copy Link, Facebook, Twitter/X, WhatsApp, Telegram, Email
  - Use Web Share API on mobile for native sharing
  - Short URL or direct article URL
- **Effort**: Small (2-3 hours)

### 2.3 Dark/Light Theme Toggle
- **What**: Allow users to switch between dark mode (current) and light mode
- **Why**: Current UI is dark-only; some users prefer light mode, especially during daytime reading
- **Implementation**:
  - Theme context provider with localStorage persistence
  - Tailwind `dark:` class variants or CSS variables
  - Toggle button in navbar (sun/moon icon)
  - Smooth transition animation between themes
- **Effort**: Medium (6-8 hours)

### 2.4 Article Text-to-Speech (Read Aloud)
- **What**: "Listen" button on article detail page that reads the article content aloud
- **Why**: Accessibility feature + convenience for users who want to listen while multitasking
- **Implementation**:
  - Use Web Speech API (`SpeechSynthesis`)
  - Play/Pause/Stop controls
  - Speech speed control
  - Bengali language TTS support
- **Effort**: Medium (4-6 hours)

### 2.5 Enhanced Admin Dashboard
- **What**: Rich admin dashboard with charts and analytics (currently shows Access Denied for SuperAdmin, and when fixed, is basic)
- **Why**: Admins need visual insights into portal performance
- **Implementation**:
  - Article count chart (daily/weekly/monthly trend line)
  - Source health overview (pie chart)
  - Top performing articles (most viewed)
  - Category distribution chart
  - Recent fetch job status timeline
  - Active users count
  - Use chart library: Recharts or Chart.js
- **Backend**: New endpoints for time-series stats, or extend existing `/admin/stats`
- **Effort**: Large (8-12 hours)

### 2.6 Notification Preferences
- **What**: Let users configure which notifications they want (breaking news, favorite category, favorite source)
- **Why**: Current SignalR notifications are all-or-nothing; users want control
- **Implementation**:
  - Notification settings page/modal
  - Category subscription (follow specific topics)
  - Source subscription (follow specific channels)
  - Push notification opt-in (via Service Worker)
  - Store preferences in user profile (new DB table)
- **Effort**: Large (10-15 hours)

---

## 3. Medium-Priority Features (Priority 2)

Features that enhance the platform but aren't critical gaps.

### 3.1 Article Reactions / Likes
- **What**: Reaction system on articles (Like, Love, Informative, Shocking, etc.)
- **Why**: Lightweight user engagement beyond comments
- **Implementation**:
  - Emoji reactions (similar to Facebook reactions)
  - Reaction count display on news cards
  - One reaction per user per article
  - Backend: New `ArticleReaction` entity + endpoints
- **Effort**: Medium (6-8 hours)

### 3.2 Comment Upvote/Downvote
- **What**: Allow users to upvote/downvote comments
- **Why**: Current comments have no ranking; quality comments should rise
- **Implementation**:
  - Upvote/downvote buttons on each comment
  - Sort comments by: Newest, Most Upvoted, Oldest
  - Backend: New `CommentVote` entity + endpoints
- **Effort**: Medium (4-6 hours)

### 3.3 User Preferences / Personalized Feed
- **What**: "For You" feed based on user's reading history, bookmarks, and category preferences
- **Why**: Personalization increases engagement and time on site
- **Implementation**:
  - Onboarding flow: select preferred categories on first login
  - Algorithm: weight categories by read history + explicit preferences
  - New "For You" tab/section on homepage
  - Backend: recommendation endpoint based on user profile
- **Effort**: Large (12-16 hours)

### 3.4 Newsletter / Email Digest
- **What**: Daily or weekly email digest of top news
- **Why**: Re-engage users who don't visit the portal daily
- **Implementation**:
  - Email subscription form (with or without account)
  - Digest frequency: Daily, Weekly
  - Email template with top articles
  - Background job to compile and send digests
  - Unsubscribe flow
  - Use: SendGrid, Mailgun, or SMTP
- **Effort**: Large (10-14 hours)

### 3.5 Advanced Search with Filters
- **What**: Search with date range, source, category, and sort order filters
- **Why**: Current search is basic text-only with no filtering options
- **Implementation**:
  - Filter sidebar/toolbar on search results page
  - Date range picker (Today, This Week, This Month, Custom)
  - Source filter dropdown
  - Category filter chips
  - Sort: Relevance, Newest, Most Viewed
  - Backend: Extend `SearchNewsAsync` to accept filter params
- **Effort**: Medium (6-8 hours)

### 3.6 Reading Time Estimation on Cards
- **What**: Show estimated reading time on each news card (e.g., "3 min read")
- **Why**: Helps users decide which articles to read based on available time
- **Implementation**:
  - Calculate from article content length (avg 200 words/min)
  - Display on NewsCard component
  - Backend: Include `readingTimeMinutes` in article DTO (or calculate frontend)
- **Effort**: Small (1-2 hours)

### 3.7 Infinite Scroll / Load More Improvements
- **What**: Smooth infinite scroll with skeleton loading states
- **Why**: Homepage has basic infinite scroll but no visual feedback during load
- **Implementation**:
  - Skeleton card shimmer animation while loading
  - "Back to top" floating button after scrolling
  - Remember scroll position when navigating back
  - Pull-to-refresh on mobile
- **Effort**: Small (2-4 hours)

### 3.8 Article Font Size Control
- **What**: Allow readers to increase/decrease font size on article detail page
- **Why**: Accessibility — older users or those with vision impairments need larger text
- **Implementation**:
  - Small/Medium/Large font toggle on article page
  - Persist preference in localStorage
  - Smooth transition when changing size
- **Effort**: Small (1-2 hours)

---

## 4. Low-Priority / Nice-to-Have (Priority 3)

Polish and advanced features.

### 4.1 Offline Reading (PWA Enhancement)
- **What**: Save articles for offline reading
- **Why**: PWA is configured but offline article reading isn't implemented
- **Implementation**:
  - "Save Offline" button on articles
  - Cache article content + images in IndexedDB
  - Offline indicator in UI
  - Sync when back online
- **Effort**: Large (10-14 hours)

### 4.2 Social Login (Google/Facebook/GitHub)
- **What**: OAuth2 login alternatives
- **Why**: Reduces friction for new users; they don't need to create a separate account
- **Implementation**:
  - Google OAuth2 (most common)
  - Optional: Facebook, GitHub
  - Backend: OAuth callback endpoints, user linking
  - Frontend: Social login buttons on login modal
- **Effort**: Large (10-14 hours)

### 4.3 Article Reporting / Flagging
- **What**: Allow users to report inappropriate or incorrect articles
- **Why**: Community moderation; builds trust
- **Implementation**:
  - "Report" option on article cards and detail page
  - Report reasons: Incorrect, Misleading, Duplicate, Inappropriate
  - Admin review queue for reported articles
  - Backend: New `ArticleReport` entity + admin endpoints
- **Effort**: Medium (6-8 hours)

### 4.4 Keyboard Shortcuts
- **What**: Power-user keyboard navigation
- **Why**: Improves efficiency for frequent readers
- **Implementation**:
  - `j/k` - Next/Previous article in list
  - `o` or `Enter` - Open article
  - `b` - Bookmark article
  - `s` - Open search
  - `/` - Focus search bar (already has this hint in UI)
  - `Esc` - Close modal/go back
  - Keyboard shortcut help modal (`?`)
- **Effort**: Medium (4-6 hours)

### 4.5 News Ticker / Breaking News Banner
- **What**: Scrolling ticker bar at the top for breaking news
- **Why**: Real-time breaking news visibility; common feature in news portals
- **Implementation**:
  - Horizontal scrolling text banner below navbar
  - Pulls from articles tagged as "breaking"
  - Auto-updates via SignalR
  - Dismissible by user
- **Effort**: Small (3-4 hours)

### 4.6 Admin Article Management (CRUD)
- **What**: Admin panel to manually create, edit, feature, or hide articles
- **Why**: Currently articles are only auto-fetched; admins can't write original content or manage existing articles
- **Implementation**:
  - Rich text editor (TipTap or Quill)
  - Article create/edit form (title, content, category, image upload, featured toggle)
  - Article list with search, filter, bulk actions (feature, hide, delete)
  - Draft/Published status workflow
- **Effort**: Large (15-20 hours)

### 4.7 Weather Widget
- **What**: Small weather widget in sidebar showing current weather
- **Why**: Common news portal feature; adds utility value
- **Implementation**:
  - Use OpenWeatherMap API (free tier)
  - Show temperature, icon, location
  - Auto-detect location or manual city selection
- **Effort**: Small (2-3 hours)

### 4.8 Live Score / Stock Ticker Widget
- **What**: Live sports scores or stock market ticker in sidebar
- **Why**: Increases daily visits and user engagement
- **Implementation**:
  - Cricket/Football live scores (API: CricAPI or similar)
  - OR Dhaka Stock Exchange ticker
  - Auto-refresh every 60 seconds
- **Effort**: Medium (4-6 hours)

---

## 5. Future Vision (Priority 4)

Strategic features for long-term growth.

### 5.1 AI-Powered Article Summarization
- **What**: One-click AI summary of long articles
- **Why**: Many fetched articles are lengthy; quick summaries increase consumption
- **Implementation**:
  - "Summarize" button on article detail page
  - Use Claude API / OpenAI for summarization
  - Cache summaries to avoid repeated API calls
  - Bullet-point and paragraph summary modes
- **Effort**: Medium (6-8 hours)

### 5.2 AI Auto-Categorization
- **What**: Automatically categorize articles into topics using AI/NLP
- **Why**: Currently all articles show "GENERAL" — no useful categorization exists
- **Implementation**:
  - Run classification on article titles + content during ingestion
  - Pre-defined categories: Politics, Sports, Business, Technology, Entertainment, International, Health, Science, Opinion
  - Use keyword-based classifier (fast) or AI classifier (accurate)
  - Admin can review and override
- **Effort**: Medium (6-10 hours)

### 5.3 Multi-Language Article Translation
- **What**: Auto-translate articles between Bengali and English
- **Why**: Portal has both Bengali and English articles; users may want to read in their preferred language
- **Implementation**:
  - "Translate to English/Bengali" button on articles
  - Use Google Translate API or LibreTranslate (self-hosted)
  - Cache translations
- **Effort**: Medium (6-8 hours)

### 5.4 Mobile App (React Native)
- **What**: Native mobile app for iOS and Android
- **Why**: Better mobile experience, push notifications, offline reading
- **Implementation**:
  - Share API layer with web client
  - React Native or Expo
  - Push notifications via Firebase Cloud Messaging
- **Effort**: Very Large (40+ hours)

### 5.5 Content Analytics Dashboard
- **What**: Publisher-grade analytics showing article performance, user engagement metrics
- **Why**: Understanding what content performs helps editorial decisions
- **Implementation**:
  - Article view trends, bounce rates
  - Most engaged categories/sources
  - Peak reading hours heatmap
  - User retention metrics
  - Geographic distribution (if tracking location)
- **Effort**: Very Large (20-30 hours)

### 5.6 Comment Sentiment Analysis
- **What**: Analyze user comments to gauge public sentiment on news topics
- **Why**: Valuable for understanding public opinion on trending topics
- **Implementation**:
  - NLP sentiment scoring on comments
  - Sentiment badge (Positive/Neutral/Negative) on articles
  - Admin dashboard showing sentiment trends
- **Effort**: Large (10-14 hours)

---

## Implementation Roadmap

### Phase 1: Stabilize (Week 1)
Fix all Priority 0 bugs:
- [ ] Fix article detail 500 error
- [ ] Fix SuperAdmin admin access
- [ ] Fix search count display
- [ ] Fix Bengali slug encoding
- [ ] Complete Bengali translations
- [ ] Fix category assignment
- [ ] Fix article image fetching

### Phase 2: Core Enhancements (Weeks 2-3)
- [ ] Category sidebar navigation
- [ ] Article share functionality
- [ ] Dark/Light theme toggle
- [ ] Enhanced admin dashboard with charts
- [ ] Reading time on cards
- [ ] Infinite scroll improvements

### Phase 3: Engagement Features (Weeks 4-5)
- [ ] Article reactions/likes
- [ ] Comment upvote/downvote
- [ ] Advanced search filters
- [ ] News ticker / breaking news banner
- [ ] Keyboard shortcuts
- [ ] Article font size control

### Phase 4: Personalization & Intelligence (Weeks 6-8)
- [ ] AI auto-categorization
- [ ] Personalized "For You" feed
- [ ] Notification preferences
- [ ] AI article summarization
- [ ] Newsletter / email digest

### Phase 5: Advanced (Weeks 9+)
- [ ] Offline reading (PWA)
- [ ] Social login
- [ ] Admin article management (CRUD)
- [ ] Article reporting
- [ ] Multi-language translation
- [ ] Widgets (weather, scores)

---

## Technical Debt to Address

| Item | Description |
|------|-------------|
| **No unit tests** | Backend has test project placeholder but no real tests |
| **No E2E tests** | No Cypress/Playwright tests for frontend |
| **API error handling** | 500 errors should return meaningful messages |
| **Rate limiting** | Nginx has it but API level doesn't |
| **Input sanitization** | Comments should be sanitized for XSS |
| **Pagination consistency** | Some pages have pagination, some use infinite scroll |
| **Image optimization** | No WebP conversion, no lazy loading srcset |
| **Bundle size** | No code splitting with React.lazy() |
| **Accessibility** | Missing ARIA labels, keyboard navigation, screen reader support |
| **SEO meta tags** | Article detail pages broken so no SEO value currently |

---

## Summary

| Priority | Count | Estimated Effort |
|----------|-------|-----------------|
| P0 - Critical Bugs | 7 | ~15-20 hours |
| P1 - High Priority | 6 | ~35-50 hours |
| P2 - Medium Priority | 8 | ~40-60 hours |
| P3 - Nice to Have | 8 | ~50-70 hours |
| P4 - Future Vision | 6 | ~90-120 hours |
| **Total** | **35 items** | **~230-320 hours** |

---

*Generated by analyzing the running application at `http://localhost:5000` and full codebase review.*
