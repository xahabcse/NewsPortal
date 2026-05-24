# NewsPortal

A full-featured news aggregation portal built with React + ASP.NET Core 8.0. Fetches, categorizes, and displays news from multiple sources with AI-powered features.

**Stack:** React 18 + TypeScript + Vite | ASP.NET Core 8.0 | PostgreSQL + MongoDB + Redis | Docker

---

## Quick Start

### Prerequisites

- Docker Desktop (or Docker Engine + Compose V2 on Linux)
- .NET 8.0 SDK (for local development)
- Node.js 20.x (for frontend development)

### Option 1: Docker (Full Stack)

```bash
git clone https://github.com/sujoncep/NewsPortal.git
cd NewsPortal
docker compose up -d --build
```

- Frontend: `http://localhost:5000`
- API: `http://localhost:8080`
- Seq Logs: `http://localhost:8081`

### Option 2: Local Development

```bash
# Start databases only
docker compose -f docker-compose.dev.yml up -d

# Run API (terminal 1)
cd src/NewsPortal.Api && dotnet run

# Run frontend (terminal 2)
cd src/NewsPortal.Client && npm install && npm run dev
```

- API: `http://localhost:5016`
- Frontend: `http://localhost:5173`

---

## Architecture

```text
User Browser <--> React Frontend <--> ASP.NET Core API <--> PostgreSQL / MongoDB / Redis
                                                  |
                                        MCP Server (Background Jobs)
                                                  |
                                        External News Sources (RSS/API)
```

### Services

| Service      | Image          | Purpose                          |
| ------------ | -------------- | -------------------------------- |
| `web`        | React + Nginx  | Frontend SPA                     |
| `api`        | .NET 8         | REST API                         |
| `mcpserver`  | .NET 8         | Background news fetching (Hangfire) |
| `postgres`   | PostgreSQL 15  | Relational data                  |
| `mongodb`    | MongoDB 4.4    | Image storage (GridFS)           |
| `redis`      | Redis 7        | Caching                          |
| `seq`        | Datalust Seq   | Structured logging               |

---

## Project Structure

```text
NewsPortal/
├── src/
│   ├── NewsPortal.Client/       # React frontend
│   ├── NewsPortal.Api/          # REST API
│   ├── NewsPortal.McpServer/    # Background job service
│   ├── NewsPortal.Scheduler/    # Hangfire jobs
│   ├── NewsPortal.Service/      # Business logic
│   ├── NewsPortal.Repository/   # Data access
│   └── NewsPortal.Core/         # Domain models
├── document/                    # Implementation status
├── monitoring/                  # Prometheus, Grafana, Loki
├── script/                      # Deploy, backup, rollback scripts
├── docker-compose.yml           # Full stack
├── docker-compose.dev.yml       # DBs only (local dev)
└── docker-compose.prod.yml      # Production
```

---

## API Endpoints

### Authentication

| Method | Endpoint                       | Description          |
| ------ | ------------------------------ | -------------------- |
| POST   | `/api/v1/auth/login`           | Login (JWT)          |
| POST   | `/api/v1/auth/register`        | Register             |
| POST   | `/api/v1/auth/google`          | Google OAuth login   |
| GET    | `/api/v1/auth/me`              | Current user         |
| POST   | `/api/v1/auth/change-password` | Change password      |

**Roles:** SuperAdmin, Admin, Editor, Reader
**Seed users:** `superadmin/superadmin`, `admin/admin1`, `editor/editor`, `reader/reader`

### News

| Method | Endpoint                       | Description                 |
| ------ | ------------------------------ | --------------------------- |
| GET    | `/api/v1/news/latest`          | Latest articles (paginated) |
| GET    | `/api/v1/news/category/{slug}` | Articles by category        |
| GET    | `/api/v1/news/{slug}`          | Article detail              |
| POST   | `/api/v1/news/search`          | Search articles             |
| GET    | `/api/v1/news/trending`        | Trending articles           |
| GET    | `/api/v1/news/{slug}/related`  | Related articles            |

### AI Features

| Method | Endpoint                            | Description                |
| ------ | ----------------------------------- | -------------------------- |
| POST   | `/api/v1/ai/summarize/{id}`         | AI article summarization   |
| POST   | `/api/v1/ai/categorize/{id}`        | Auto-categorize article    |
| POST   | `/api/v1/ai/translate/{id}?target=en` | Translate article        |
| GET    | `/api/v1/ai/sentiment/article/{id}` | Comment sentiment analysis |

### Analytics (Admin)

| Method | Endpoint                                 | Description            |
| ------ | ---------------------------------------- | ---------------------- |
| GET    | `/api/v1/analytics/overview`             | Dashboard overview     |
| GET    | `/api/v1/analytics/articles/daily`       | Daily article trend    |
| GET    | `/api/v1/analytics/categories/performance` | Category stats       |
| GET    | `/api/v1/analytics/articles/top`         | Top performing articles |

### Other

| Method          | Endpoint                         | Description         |
| --------------- | -------------------------------- | ------------------- |
| POST/DELETE     | `/api/v1/bookmarks/{articleId}`  | Bookmark management |
| GET/POST/DELETE | `/api/v1/comments`               | Comment system      |
| POST/DELETE     | `/api/v1/reactions`              | Article reactions   |
| GET             | `/sitemap`                       | XML sitemap         |
| GET             | `/api/v1/feed/rss`               | RSS feed            |

---

## Features

### Reader

- Infinite scroll news feed with category filtering
- Article detail with reading time, related articles, lazy-loaded comments
- Full-text search with date/source/category filters
- Advanced multi-filter bar (source, category, date range)
- Trending articles, bookmarks, reading history
- Daily news timeline page with category-based grouping
- Dark/Light theme toggle
- Text-to-Speech with Bengali voice fallback (Web Speech API)
- Keyboard shortcuts (j/k navigate, o open, b bookmark, ? help)
- PWA support (installable, offline capable)
- Mobile responsive design (360px–430px viewports optimized)
- Dynamic Bangla greeting with Bengali, Hijri, and Gregorian calendar dates
- Weather widget (Dhaka) in greeting section
- User profile with bio, emoji avatars, and public profile page
- Collapsible sidebar with semantic icons

### AI-Powered

- Article summarization via Google Gemini 2.5 Flash
- Lazy content scraping — full article fetched on first view from source URL
- Auto-categorization (keyword-based classifier)
- Multi-language translation (6 languages via MyMemory API)
- Comment sentiment analysis with visual badge

### Social

- Article reactions (Like, Love, Informative, Shocking, Sad, Angry)
- Threaded comments with upvote/downvote
- Share button (Copy Link, Facebook, Twitter, WhatsApp, Telegram, Email)
- Article reporting/flagging

### Admin

- Dashboard with charts (Recharts)
- Article CRUD management with bulk auto-categorize
- Content analytics dashboard (6 chart types, full-width layout)
- User management (Admin+ access), category management
- Fetch log viewer, news source management
- News ticker / breaking news banner
- System tool links (Seq, Grafana, etc.)
- LAN access support (dynamic CORS for private network IPs)

---

## Deployment

### Environment Files

| File                       | Purpose                     |
| -------------------------- | --------------------------- |
| `docker-compose.dev.yml`   | Local dev (databases only)  |
| `docker-compose.yml`       | Full stack testing          |
| `docker-compose.prod.yml`  | Production deployment       |

### Environment Variables

Create a `.env` file in the project root before running `docker compose up`. The file is read by all `docker-compose.*.yml` stacks and the deploy scripts.

> **Note:** `.env` is git-ignored. Never commit real secrets.

#### Required

| Variable                   | Used By                            | Example / Notes                                                              |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `POSTGRES_USER`            | postgres, api, mcpserver           | `newsadmin`                                                                  |
| `POSTGRES_PASSWORD`        | postgres, api, mcpserver           | Strong password                                                              |
| `POSTGRES_DB`              | postgres                           | `newsportal`                                                                 |
| `POSTGRES_PORT`            | postgres                           | `5432`                                                                       |
| `MONGO_USER`               | mongodb, api                       | `mongouser`                                                                  |
| `MONGO_PASSWORD`           | mongodb, api                       | Strong password                                                              |
| `MONGO_PORT`               | mongodb                            | `27017`                                                                      |
| `REDIS_PASSWORD`           | redis, api                         | Strong password                                                              |
| `REDIS_PORT`               | redis                              | `6379`                                                                       |
| `WEB_PORT`                 | web                                | `5000`                                                                       |
| `ASPNETCORE_ENVIRONMENT`   | api, mcpserver                     | `Production` \| `Staging` \| `Development`                                   |
| `CORS_ALLOWED_ORIGINS`     | api                                | Comma-separated URLs, e.g. `http://localhost:5000,http://192.168.0.109:5000` |
| `JWT_SECRET_KEY`           | api                                | **≥ 32 chars.** Generate via `openssl rand -base64 48`                       |

#### Optional

| Variable                   | Used By                            | Purpose                                                                      |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `SEQ_PORT`                 | seq (dev)                          | `5341` (Seq UI)                                                              |
| `GOOGLE_CLIENT_ID`         | api (frontend OAuth)               | Google OAuth Client ID — leave blank to disable Google sign-in               |
| `GEMINI_API_KEY`           | api                                | Google AI Studio key — leave blank to fall back to TF-IDF summarization      |
| `NEWS_API_KEY`             | mcpserver                          | NewsAPI.org key (background fetch)                                           |
| `GNEWS_API_KEY`            | mcpserver                          | GNews.io key                                                                 |
| `BING_SEARCH_API_KEY`      | mcpserver                          | Bing News Search key                                                         |
| `GUARDIAN_API_KEY`         | mcpserver                          | The Guardian Open Platform key                                               |
| `GRAFANA_ADMIN_USER`       | grafana (monitoring stack)         | `admin`                                                                      |
| `GRAFANA_ADMIN_PASSWORD`   | grafana                            | Strong password                                                              |
| `DOCKER_REGISTRY`          | CI/CD                              | `ghcr.io`                                                                    |
| `DOCKER_USERNAME`          | CI/CD                              | GitHub username                                                              |
| `IMAGE_TAG`                | CI/CD, docker-compose.prod         | `latest` or commit SHA                                                       |
| `SERVER_HOST`              | CI/CD deploy                       | Prod server hostname/IP                                                      |
| `SERVER_USER`              | CI/CD deploy                       | SSH user (e.g. `ubuntu`)                                                     |
| `PRODUCTION_URL`           | CI/CD post-deploy health check     | `https://yourdomain.com`                                                     |

#### Quick template

```bash
# Save as `.env` in project root, then fill in values
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

### Connection String Rule

- **App on host** (local dev): use `localhost`
- **App in Docker** (prod): use service names (`postgres`, `mongodb`, `redis`)

### Port Reference

| Service    | Dev Port | Docker Port   |
| ---------- | -------- | ------------- |
| API        | 5016     | 8080          |
| Frontend   | 5173     | 5000          |
| PostgreSQL | 5432     | Internal only |
| MongoDB    | 27017    | Internal only |
| Redis      | 6379     | Internal only |
| Seq        | 5341     | 8081          |

### Production (Linux Server)

```bash
# 1. SSH to server
ssh user@your-server

# 2. Clone and configure
git clone https://github.com/sujoncep/NewsPortal.git
cd NewsPortal
nano .env  # Create using the template in the Environment Variables section above

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d

# 4. Setup SSL (optional)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### CI/CD (GitHub Actions)

Push to `main` triggers automatic: Build > Test > Docker Build > Push to GHCR > Deploy to server

Required GitHub Secrets: `SSH_PRIVATE_KEY`, `SERVER_HOST`, `SERVER_USER`, `POSTGRES_PASSWORD`, `MONGO_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET_KEY`, `CORS_ALLOWED_ORIGINS`

### Backup & Restore

```bash
# Backup
./script/backup.sh

# Restore PostgreSQL
gunzip -c backups/daily/postgres/pg_backup.sql.gz | \
  docker exec -i newsportal-db psql -U newsadmin newsportal

# Rollback deployment
./script/rollback.sh previous
```

---

## Troubleshooting

| Problem                  | Fix                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Can't connect to DB      | `docker compose ps` then `docker compose restart postgres`                               |
| Port already in use      | `sudo lsof -i :5432` then `sudo kill -9 <PID>`                                          |
| Image not updating       | `docker compose build --no-cache && docker compose up -d --force-recreate`               |
| CI/CD failed             | Check GitHub Actions logs, verify secrets, SSH to server and check `docker compose logs`  |
| Permission denied (logs) | `sudo chown -R $USER:$USER logs/ && chmod -R 755 logs/`                                  |

### Health Checks

```bash
curl http://localhost:8080/health                          # API
docker compose exec postgres pg_isready -U newsadmin       # PostgreSQL
docker compose exec redis redis-cli ping                   # Redis
```

---

## News Sources

8 Bangladeshi RSS sources seeded (Prothom Alo, bdnews24, Bangla Tribune, Jagonews24, Sun News, BSS, Dhaka Post, Daily Star) plus **The Guardian Open Platform API** (international, optional via `GUARDIAN_API_KEY`). See [IMPLEMENTATION-STATUS.md](document/IMPLEMENTATION-STATUS.md) for recommended international source additions.

---

## License

This project is for educational and portfolio purposes.

**Last Updated:** May 24, 2026
