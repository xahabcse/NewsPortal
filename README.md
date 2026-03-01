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

| Method | Endpoint                       | Description     |
| ------ | ------------------------------ | --------------- |
| POST   | `/api/v1/auth/login`           | Login           |
| POST   | `/api/v1/auth/register`        | Register        |
| GET    | `/api/v1/auth/me`              | Current user    |
| POST   | `/api/v1/auth/change-password` | Change password |

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
- Article detail with reading time, related articles
- Full-text search with date/source/category filters
- Trending articles, bookmarks, reading history
- Dark/Light theme toggle
- Text-to-Speech (Web Speech API)
- Keyboard shortcuts (j/k navigate, o open, b bookmark, ? help)
- PWA support (installable, offline capable)
- Bilingual UI (English / Bengali)

### AI-Powered

- Article summarization (TF-IDF extractive, bullet/paragraph modes)
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
- Content analytics dashboard (6 chart types)
- User management, category management
- Fetch log viewer, news source management
- News ticker / breaking news banner

---

## Deployment

### Environment Files

| File                     | Purpose                      |
| ------------------------ | ---------------------------- |
| `docker-compose.dev.yml` | Local dev (databases only)   |
| `docker-compose.yml`     | Full stack testing           |
| `docker-compose.prod.yml` | Production deployment       |
| `.env.example`           | Environment variable template |

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
cp .env.example .env
nano .env  # Set strong passwords

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

8 Bangladeshi sources seeded (Prothom Alo, bdnews24, Bangla Tribune, Jagonews24, Sun News, BSS, Dhaka Post, Daily Star). See [IMPLEMENTATION-STATUS.md](document/IMPLEMENTATION-STATUS.md) for recommended international source additions.

---

## License

This project is for educational and portfolio purposes.

**Last Updated:** March 1, 2026
