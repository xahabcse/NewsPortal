# NewsPortal.Client

React 18 + TypeScript + Vite frontend for the NewsPortal aggregation platform. Mobile-responsive, dark/light themed, PWA-installable, and fully bilingual (Bangla / English).

## Stack

| Layer            | Library                              | Version  |
|------------------|--------------------------------------|----------|
| Framework        | React                                | 18.3.1   |
| Language         | TypeScript                           | 5.7.2    |
| Build            | Vite                                 | 7.2.4    |
| React plugin     | `@vitejs/plugin-react-swc`           | 4.2.2    |
| Routing          | `react-router-dom`                   | 7.13.0   |
| Styling          | Tailwind CSS                         | 3.4.19   |
| HTTP             | `axios`                              | 1.13.3   |
| Realtime         | `@microsoft/signalr`                 | 10.0.0   |
| i18n             | `i18next` + `react-i18next`          | 25 / 16  |
| SEO              | `react-helmet-async`                 | 2.0.5    |
| Charts (admin)   | `recharts`                           | 3.7.0    |
| Toasts           | `react-hot-toast`                    | 2.6.0    |
| PWA              | `vite-plugin-pwa` + `workbox-window` | 1.2 / 7.4 |

## Scripts

```bash
npm install        # install deps
npm run dev        # Vite dev server on http://localhost:5173 (proxies /api -> http://localhost:5016)
npm run build      # type-check (tsc -b) + production bundle into dist/
npm run preview    # serve the production bundle locally
npm run lint       # ESLint over the project
```

## Local Setup

1. Install Node.js 20.x.
2. From this directory: `npm install`.
3. Start the API (see root [README.md](../../README.md) — `cd src/NewsPortal.Api && dotnet run`).
4. `npm run dev` → app at <http://localhost:5173>.

The dev server proxies `/api/*` to the backend at `http://localhost:5016` (configured in [vite.config.ts](vite.config.ts)). Override with `VITE_API_URL` if you need a different backend host.

## Project Structure

```text
src/
├── pages/                  # Top-level routed pages
│   ├── HomePage.tsx
│   ├── ArticleDetailPage.tsx
│   ├── CategoryPage.tsx
│   ├── SearchResultsPage.tsx
│   ├── TrendingPage.tsx
│   ├── TimelinePage.tsx
│   ├── BookmarksPage.tsx
│   ├── NewsSourcesPage.tsx
│   ├── ProfilePage.tsx
│   ├── UserProfilePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── NotFoundPage.tsx
│   └── admin/              # Role-gated admin pages
│       ├── AdminDashboard.tsx
│       ├── ArticleManagementPage.tsx
│       ├── CategoriesPage.tsx
│       ├── ContentAnalyticsPage.tsx
│       ├── FetchLogPage.tsx
│       └── UserManagementPage.tsx
├── components/             # Reusable UI (NewsCard, Navbar, ShareButton, ...)
├── context/                # AuthContext, ThemeContext
├── services/               # axiosInstance, SignalRService, API clients
├── i18n/                   # i18next setup + bn/en translation files
├── types/                  # Shared TypeScript types
├── utils/                  # Helpers (slug, date, format, ...)
├── App.tsx                 # Routes + ProtectedRoute role gating
└── main.tsx                # Vite entry point
```

## Routing

Public routes mount in `App.tsx`. Admin and editor routes are wrapped with `ProtectedRoute` that checks the role on `AuthContext` (`SuperAdmin`, `Admin`, `Editor`, `Reader`).

| Route                    | Page                       | Access      |
|--------------------------|----------------------------|-------------|
| `/`                      | `HomePage`                 | Public      |
| `/news/:slug`            | `ArticleDetailPage`        | Public      |
| `/category/:slug`        | `CategoryPage`             | Public      |
| `/search`                | `SearchResultsPage`        | Public      |
| `/trending`              | `TrendingPage`             | Public      |
| `/timeline`              | `TimelinePage`             | Public      |
| `/sources`               | `NewsSourcesPage`          | Public      |
| `/user/:username`        | `UserProfilePage`          | Public      |
| `/login`, `/register`    | Auth pages                 | Public      |
| `/bookmarks`             | `BookmarksPage`            | Reader+     |
| `/profile`               | `ProfilePage`              | Reader+     |
| `/admin/dashboard`       | `AdminDashboard`           | Admin+      |
| `/admin/articles`        | `ArticleManagementPage`    | Editor+     |
| `/admin/categories`      | `CategoriesPage`           | Editor+     |
| `/admin/analytics`       | `ContentAnalyticsPage`     | Admin+      |
| `/admin/fetch-log`       | `FetchLogPage`             | Admin+      |
| `/admin/users`           | `UserManagementPage`       | Admin+      |

## Cross-cutting Features

- **Auth** — `AuthContext` reads JWT from `localStorage`, refreshes on mount, exposes `user`, `login`, `logout`, role helpers.
- **Theme** — `ThemeContext` toggles a `dark` class on `<html>`; persisted in `localStorage`.
- **Realtime** — `SignalRService` connects to the API's hub for breaking-news ticker and live admin updates; auto-reconnect built in.
- **i18n** — `bn` (default) and `en` translation files under `src/i18n/`. Add new strings to **both** files. Detector reads `localStorage` first, then browser language.
- **SEO** — `react-helmet-async` injects per-page `<title>`, meta, Open Graph, and Schema.org `NewsArticle` JSON-LD on article pages.
- **PWA** — `vite-plugin-pwa` registers a service worker (autoUpdate), precaches static assets, and runtime-caches API responses (`NetworkFirst`, 24h TTL). Manifest: name "NewsPortal", theme `#8b5cf6`, standalone display.
- **Keyboard shortcuts** — `j`/`k` navigate cards, `o` open, `b` bookmark, `s`/`?` search/help, `Esc` close.
- **Mobile** — Tested on 360–430px viewports; collapsible sidebar with hamburger menu.

## Environment Variables

The frontend is config-light. The build reads three vars:

| Variable                | Default                  | Purpose                                              |
|-------------------------|--------------------------|------------------------------------------------------|
| `VITE_API_URL`          | `/api` (proxied in dev)  | Override API host (e.g., the Hono Worker URL)        |
| `VITE_GOOGLE_CLIENT_ID` | —                        | Google OAuth sign-in button                          |
| `VITE_ENABLE_SIGNALR`   | off                      | Legacy SignalR toggle — the live stack uses SSE      |

For backend env vars, see the root [README.md](../../README.md#environment-variables).

## Build & Deploy

Production deploys go to **Cloudflare Pages** via `.github/workflows/deploy-client-pages.yml` (on push to `main`); the Docker/Nginx path below is the legacy self-host option.

Production builds run inside the `web` Docker image (see [Dockerfile](Dockerfile)) which serves the static bundle behind Nginx. Build locally with `npm run build`; output lands in `dist/`.

```bash
npm run build
# dist/ → ready to serve via Nginx, Vercel, Netlify, S3, ...
```

See the root [README.md](../../README.md) for the full Docker / production deployment workflow.
