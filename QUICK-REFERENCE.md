# NewsPortal - Quick Reference Guide

Visual workflow cheat sheet for development → docker → CI/CD → production

---

## 🔄 Complete Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NEWSPORTAL DEPLOYMENT FLOW                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Local Dev      │────▶│  Docker Testing  │────▶│  Production Linux    │
│  (VS + Docker)  │     │  (Full Stack)    │     │  (CI/CD Automated)   │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
        │                       │                          │
        ▼                       ▼                          ▼
   localhost              Service Names              Service Names
   Fast Debug             Production Sim             Auto Deploy
```

---

## 📋 Environment Comparison

| Aspect | Local Dev | Docker Mode | Production |
|--------|-----------|-------------|------------|
| **App Location** | Visual Studio (Host) | Docker Container | Docker Container |
| **DBs Location** | Docker Containers | Docker Containers | Docker Containers |
| **Connection** | `localhost:5432` | `postgres:5432` | `postgres:5432` |
| **Environment** | `Development` | `Production` | `Production` |
| **Use Case** | Daily coding, debugging | Integration testing | Live deployment |
| **Command** | `docker compose -f docker-compose.dev.yml up -d` + F5 | `docker compose up -d` | GitHub Actions auto |

---

## 🎯 Quick Commands

### 1️⃣ Local Development Mode

```bash
# Start infrastructure only
docker compose -f docker-compose.dev.yml up -d

# Check status
docker compose -f docker-compose.dev.yml ps

# View logs
docker compose -f docker-compose.dev.yml logs -f postgres

# Stop
docker compose -f docker-compose.dev.yml down
```

**Then:** Run app from Visual Studio (F5) or `dotnet run`

**Connection Strings:** Uses `localhost`

---

### 2️⃣ Docker Mode (Full Stack)

```bash
# Build and start all services
docker compose up -d --build

# View all logs
docker compose logs -f

# Check API health
curl http://localhost:8080/health

# Check frontend
curl http://localhost:5000

# Stop everything
docker compose down

# Nuclear option (remove volumes)
docker compose down -v
```

**Connection Strings:** Uses Docker service names (`postgres`, `mongodb`, `redis`)

---

### 3️⃣ Production Deployment

```bash
# Automatic (via Git Push)
git add .
git commit -m "Your changes"
git push origin main
# ✅ GitHub Actions automatically builds and deploys!

# Manual (on Linux server)
cd ~/newsportal
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# View status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f api
```

**Connection Strings:** Uses Docker service names + environment variables

---

## 🔐 Connection String Rules (Golden Rule)

```
┌──────────────────────────────────────────────────────────────┐
│  IF App runs on HOST → use localhost                         │
│  IF App runs in DOCKER → use service name (postgres, mongo)  │
└──────────────────────────────────────────────────────────────┘
```

### Examples:

**Visual Studio Development:**
```json
"PostgreSQL": "Host=localhost;Port=5432;Database=newsportal;..."
```

**Docker/Production:**
```json
"PostgreSQL": "Host=postgres;Port=5432;Database=newsportal;..."
```

---

## 🌐 Port Mapping Reference

### Local Development Mode

| Service | Container Port | Host Port | Access From Host |
|---------|----------------|-----------|------------------|
| PostgreSQL | 5432 | 5432 | `localhost:5432` |
| MongoDB | 27017 | 27017 | `localhost:27017` |
| Redis | 6379 | 6379 | `localhost:6379` |
| Seq | 80 | 5341 | `http://localhost:5341` |

### Docker/Production Mode

| Service | Container Port | Host Port | Internal Access | External Access |
|---------|----------------|-----------|-----------------|-----------------|
| API | 8080 | 8080 | `api:8080` | `localhost:8080` |
| Web | 80 | 5000/80 | `web:80` | `localhost:5000` |
| PostgreSQL | 5432 | ❌ Not exposed | `postgres:5432` | N/A (Security) |
| MongoDB | 27017 | ❌ Not exposed | `mongodb:27017` | N/A (Security) |
| Redis | 6379 | ❌ Not exposed | `redis:6379` | N/A (Security) |
| Seq | 80 | 8081 | `seq:80` | `localhost:8081` |

---

## 🚀 Deployment Scenarios

### Scenario 1: New Feature Development

```bash
1. docker compose -f docker-compose.dev.yml up -d
2. Open NewsPortal.sln in Visual Studio
3. Press F5 to run with debugging
4. Code, test, debug with breakpoints
5. docker compose -f docker-compose.dev.yml down
```

### Scenario 2: Pre-Production Testing

```bash
1. docker compose up -d --build
2. Test at http://localhost:5000
3. Check API at http://localhost:8080/health
4. View logs: docker compose logs -f
5. docker compose down
```

### Scenario 3: Push to Production

```bash
1. git add .
2. git commit -m "Feature: Added user authentication"
3. git push origin main
4. ✅ CI/CD automatically:
   - Builds .NET app
   - Runs tests
   - Creates Docker images
   - Pushes to ghcr.io
   - Deploys to Linux server
5. Monitor at: https://github.com/user/repo/actions
```

---

## 🔧 Troubleshooting Quick Fixes

### Problem: "Cannot connect to database"

```bash
# Check if containers are running
docker compose ps

# Restart database
docker compose restart postgres

# View database logs
docker compose logs postgres
```

### Problem: "Port already in use"

```bash
# Find what's using port 5432
sudo lsof -i :5432

# Kill it (replace PID)
sudo kill -9 PID

# Or change port in .env
```

### Problem: "Docker image not updating"

```bash
# Force rebuild
docker compose build --no-cache

# Or pull fresh
docker compose pull
docker compose up -d --force-recreate
```

### Problem: "CI/CD deployment failed"

```bash
# 1. Check GitHub Actions logs
# 2. SSH to server
ssh user@server

# 3. Check container status
cd ~/newsportal
docker compose -f docker-compose.prod.yml ps

# 4. View logs
docker compose -f docker-compose.prod.yml logs --tail=100 api

# 5. Manual restart
docker compose -f docker-compose.prod.yml restart api
```

---

## 📊 Health Checks

### Quick Health Check Script

```bash
#!/bin/bash
echo "🔍 Checking NewsPortal Health..."

echo "✅ API Health:"
curl -s http://localhost:8080/health | jq

echo "✅ PostgreSQL:"
docker compose exec postgres pg_isready -U newsadmin

echo "✅ MongoDB:"
docker compose exec mongodb mongo --eval "db.runCommand('ping')" --quiet

echo "✅ Redis:"
docker compose exec redis redis-cli ping

echo "✅ Web Frontend:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000
```

---

## 🎨 Visual CI/CD Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions CI/CD                           │
└──────────────────────────────────────────────────────────────────────┘

    git push origin main
           │
           ▼
    ┌──────────────┐
    │   Checkout   │
    │     Code     │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Build .NET  │
    │   Solution   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  Run Tests   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────┐
    │  Build Docker Images         │
    │  • newsportal-api            │
    │  • newsportal-mcpserver      │
    │  • newsportal-web            │
    └──────┬───────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Push to GHCR │
    │  (ghcr.io)   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  SSH to      │
    │ Linux Server │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │  Pull Images     │
    │  Restart Compose │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │ Health Check │
    │   ✅ Done!   │
    └──────────────┘
```

---

## 📦 Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `docker-compose.dev.yml` | Infrastructure only (DBs + Cache) | Local development with Visual Studio |
| `docker-compose.yml` | Full stack (API + Web + DBs) | Docker testing, local integration tests |
| `docker-compose.prod.yml` | Production deployment | Linux server deployment |
| `.env.example` | Development environment template | Copy to `.env` for local Docker testing |
| `.env.production.template` | Production environment template | Copy to `.env.production` on server |
| `appsettings.Development.json` | Dev config (localhost) | Visual Studio development |
| `appsettings.Production.json` | Prod config (service names) | Docker/Production deployment |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline | Automatic deployment on push |

---

## 🎯 Best Practices

### ✅ DO:
- Use `docker-compose.dev.yml` for daily development
- Commit `appsettings.Development.json` and `appsettings.Production.json`
- Use environment variables for secrets in production
- Test in Docker mode before pushing to production
- Review CI/CD logs after deployment

### ❌ DON'T:
- Don't commit `.env` or `.env.production` files
- Don't hardcode passwords in appsettings files
- Don't expose database ports in production
- Don't skip Docker testing before production push
- Don't use `localhost` in production configuration

---

## 📞 Support & Resources

- **Full Documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **GitHub Repository:** https://github.com/sujoncep/NewsPortal
- **Issues:** https://github.com/sujoncep/NewsPortal/issues

---

**Quick Start Commands:**

```bash
# Development
docker compose -f docker-compose.dev.yml up -d && code NewsPortal.sln

# Docker Testing
docker compose up -d --build && docker compose logs -f

# Production Deploy
git push origin main && gh run watch
```

---

**Last Updated:** 2026-01-27
**Version:** 1.0
