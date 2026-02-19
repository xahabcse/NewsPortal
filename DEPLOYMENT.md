# NewsPortal - Deployment Guide

Complete guide for local development, Docker deployment, and production CI/CD workflow.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Docker Mode (Pre-Production Testing)](#2-docker-mode-pre-production-testing)
3. [Production Deployment](#3-production-deployment)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Environment Configuration](#5-environment-configuration)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Local Development Setup

**Best for:** Daily development, debugging with breakpoints, fast iteration

### Architecture
```
Visual Studio (.NET App) → localhost → Docker (DBs + Redis + Seq)
```

### Prerequisites
- Visual Studio 2022 or VS Code with C# Dev Kit
- .NET 8.0 SDK
- Docker Desktop
- Node.js 20.x (for frontend development)

### Step 1: Start Infrastructure Services

```bash
# Start PostgreSQL, MongoDB, Redis, and Seq
docker compose -f docker-compose.dev.yml up -d

# Verify all services are running
docker compose -f docker-compose.dev.yml ps
```

**Services Available:**
| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | User: `newsadmin`<br>Password: `YourSecurePassword123` |
| MongoDB | `localhost:27017` | User: `mongouser`<br>Password: `MongoPassword123` |
| Redis | `localhost:6379` | No password (dev mode) |
| Seq | `http://localhost:5341` | No authentication |

### Step 2: Run .NET Application

**Option A: Visual Studio**
1. Open `NewsPortal.sln`
2. Set `NewsPortal.Api` as startup project
3. Press `F5` to run with debugging
4. API will run at: `https://localhost:7106` or `http://localhost:5016`

**Option B: Command Line**
```bash
# Navigate to API project
cd src/NewsPortal.Api

# Run the application
dotnet run --launch-profile https

# Or for development with watch mode
dotnet watch run
```

**Option C: Run MCP Server (Background Jobs)**
```bash
cd src/NewsPortal.McpServer
dotnet run
```

### Step 3: Run Frontend (Optional)

```bash
cd src/NewsPortal.Client

# Install dependencies
npm install

# Run development server
npm run dev

# Frontend will run at: http://localhost:5173
```

### Connection Strings (Development)

The `appsettings.Development.json` uses `localhost` for all services:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;Database=newsportal;Username=newsadmin;Password=YourSecurePassword123",
    "MongoDB": "mongodb://mongouser:MongoPassword123@localhost:27017/newsportal?authSource=admin",
    "Redis": "localhost:6379,abortConnect=false",
    "Seq": "http://localhost:5341"
  }
}
```

### Stopping Development Environment

```bash
# Stop all containers
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (WARNING: deletes all data)
docker compose -f docker-compose.dev.yml down -v
```

---

## 2. Docker Mode (Pre-Production Testing)

**Best for:** Testing full containerization, simulating production environment, integration testing

### Architecture
```
Docker (API + MCP + Web + DBs + Redis + Seq) → Docker Network
```

### Step 1: Build Images Locally

```bash
# Build all images
docker compose -f docker-compose.yml build

# Or build specific service
docker compose -f docker-compose.yml build api
```

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### Step 3: Start All Services

```bash
# Start all services in detached mode
docker compose -f docker-compose.yml up -d

# View logs
docker compose -f docker-compose.yml logs -f

# View logs for specific service
docker compose -f docker-compose.yml logs -f api
```

### Step 4: Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.yml ps

# Test API health endpoint
curl http://localhost:8080/health

# Test frontend
curl http://localhost:5000
```

### Connection Strings (Docker Mode)

The `appsettings.Production.json` uses Docker service names:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=postgres;Port=5432;Database=newsportal;...",
    "MongoDB": "mongodb://mongouser:password@mongodb:27017/newsportal?authSource=admin",
    "Redis": "redis:6379,abortConnect=false",
    "Seq": "http://seq:80"
  }
}
```

### Stopping Docker Mode

```bash
# Stop all containers
docker compose -f docker-compose.yml down

# Stop and remove volumes
docker compose -f docker-compose.yml down -v

# Remove images as well
docker compose -f docker-compose.yml down -v --rmi all
```

---

## 3. Production Deployment

**Best for:** Production Linux server deployment

### Architecture
```
GitHub → CI/CD → Linux Server → Docker Compose → Production Environment
```

### Prerequisites (Linux Server)

1. **Linux Server Requirements:**
   - Ubuntu 20.04+ or Debian 11+
   - Docker Engine 24.0+
   - Docker Compose V2
   - Minimum: 4GB RAM, 2 vCPU, 50GB storage

2. **Install Docker on Linux:**
```bash
# Update package index
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose V2
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 1: Server Setup

```bash
# SSH into your server
ssh user@your-server-ip

# Create application directory
mkdir -p ~/newsportal
cd ~/newsportal

# Create logs directory
mkdir -p logs
```

### Step 2: Configure Environment

```bash
# Copy the environment example file and edit with production values
cp .env.example .env
nano .env

# See .env.example for all variables with inline documentation.
# At minimum, update these with strong passwords:
#   POSTGRES_PASSWORD, MONGO_PASSWORD, REDIS_PASSWORD, JWT_SECRET_KEY
#   CORS_ALLOWED_ORIGINS (set to your production domain)
#   WEB_PORT=80
```

### Step 3: Copy Docker Compose File

```bash
# Copy docker-compose.prod.yml to server
scp docker-compose.prod.yml user@server:~/newsportal/
```

### Step 4: Login to GitHub Container Registry

```bash
# Create GitHub Personal Access Token (PAT) with read:packages permission
# Login to GHCR
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 5: Deploy Application

```bash
# Pull images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Step 5.1: Production Nginx Configuration

The Docker image uses the production Nginx config (`src/NewsPortal.Client/nginx.prod.conf`) which includes:
- Gzip compression
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.)
- API rate limiting (30 req/s per IP)
- Static asset caching (1 year for Vite hashed assets)
- `/healthz` health check endpoint
- Real IP forwarding for API proxy

To use it in production builds, update the Dockerfile `COPY` line to use `nginx.prod.conf`.

### Step 6: Setup Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt-get install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/newsportal
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # API
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/newsportal /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: Setup SSL with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is setup automatically
sudo certbot renew --dry-run
```

---

## 4. CI/CD Pipeline

### Architecture
```
Git Push → GitHub Actions → Build & Test → Docker Build → Push to GHCR → Deploy to Linux
```

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

**Server SSH Configuration:**
- `SSH_PRIVATE_KEY` - Your SSH private key for server access
- `SERVER_HOST` - Server IP or hostname (e.g., `192.168.1.100`)
- `SERVER_USER` - SSH username (e.g., `ubuntu`)

**Database Credentials:**
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password (strong password)
- `POSTGRES_DB` - Database name (`newsportal`)
- `MONGO_USER` - MongoDB username
- `MONGO_PASSWORD` - MongoDB password (strong password)
- `MONGO_DB` - MongoDB database name
- `REDIS_PASSWORD` - Redis password (strong password)

**Application Configuration:**
- `SEQ_ADMIN_PASSWORD` - Seq admin password
- `CORS_ALLOWED_ORIGINS` - Allowed CORS origins (e.g., `https://yourdomain.com`)
- `VITE_API_URL` - Frontend API URL (e.g., `https://api.yourdomain.com`)
- `PRODUCTION_URL` - Production URL for health checks

**External APIs (Optional):**
- `NEWS_API_KEY` - NewsAPI.org API key
- `GNEWS_API_KEY` - GNews.io API key
- `BING_SEARCH_API_KEY` - Bing Search API key

### Step 2: Generate SSH Key for CI/CD

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/newsportal-deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/newsportal-deploy.pub user@server

# Copy private key content to GitHub secret SSH_PRIVATE_KEY
cat ~/.ssh/newsportal-deploy
```

### Step 3: Workflow Triggers

The CI/CD pipeline runs on:

1. **Push to branches:**
   - `main` - Triggers full CI/CD with deployment
   - `ci-cd` - Triggers CI/CD with deployment (testing)
   - `develop` - Build and test only

2. **Pull Requests:**
   - To `main` branch - Build and test only

3. **Manual Trigger:**
   - Via GitHub Actions UI - Optional production deployment

### Step 4: Workflow Jobs

**Job 1: Build & Test**
- Restores NuGet packages
- Builds .NET solution
- Runs tests (if available)
- Uploads test results

**Job 2: Build Docker Images**
- Builds API, MCP Server, and Web images
- Pushes to GitHub Container Registry (ghcr.io)
- Uses layer caching for faster builds

**Job 3: Deploy to Production**
- Connects to Linux server via SSH
- Creates production .env file
- Copies docker-compose.prod.yml
- Pulls latest images
- Restarts containers
- Performs health check

### Step 5: View CI/CD Progress

1. Go to GitHub repository → Actions tab
2. Click on the running workflow
3. View logs for each job
4. Check deployment status

### Step 6: Manual Deployment

```bash
# Trigger workflow manually
# Go to: Actions → CI/CD Pipeline → Run workflow
# Select branch: main
# Set "Deploy to production": true
```

---

## 5. Environment Configuration

### Configuration Hierarchy

```
appsettings.json (base)
  ↓
appsettings.Development.json (local dev - uses localhost)
  ↓
appsettings.Production.json (Docker/Prod - uses service names)
  ↓
Environment Variables (highest priority - overrides all)
```

### Key Configuration Rules

| Scenario | Connection String Host | Environment |
|----------|----------------------|-------------|
| Visual Studio Development | `localhost` | Development |
| Docker Local Testing | Docker service names | Production |
| Linux Production | Docker service names | Production |

### Environment Variable Override

Docker Compose can override appsettings.json via environment variables:

```yaml
environment:
  ConnectionStrings__PostgreSQL: "Host=postgres;Port=5432;..."
  ConnectionStrings__MongoDB: "mongodb://..."
  ConnectionStrings__Redis: "redis:6379,..."
```

Note the double underscore `__` syntax for nested configuration.

---

## 6. Troubleshooting

### Issue: Cannot connect to database from Visual Studio

**Solution:**
```bash
# Check if Docker containers are running
docker compose -f docker-compose.dev.yml ps

# Check PostgreSQL logs
docker compose -f docker-compose.dev.yml logs postgres

# Restart databases
docker compose -f docker-compose.dev.yml restart postgres mongodb redis
```

### Issue: Docker build fails

**Solution:**
```bash
# Clear Docker build cache
docker builder prune -a

# Rebuild without cache
docker compose -f docker-compose.yml build --no-cache

# Check disk space
df -h
```

### Issue: CI/CD deployment fails

**Solution:**
1. Check GitHub Actions logs for specific error
2. Verify all secrets are set correctly
3. Test SSH connection manually:
   ```bash
   ssh -i ~/.ssh/newsportal-deploy user@server
   ```
4. Check server logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs
   ```

### Issue: Application shows database connection error

**Solution:**
```bash
# Check database container status
docker compose ps

# Check database container logs
docker compose logs postgres
docker compose logs mongodb

# Verify connection string in environment
docker compose exec api env | grep Connection

# Restart API container
docker compose restart api
```

### Issue: Images not updating after push

**Solution:**
```bash
# On server, force pull latest images
docker compose -f docker-compose.prod.yml pull --no-cache

# Remove old images
docker image prune -a

# Restart containers
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 5432 (PostgreSQL example)
sudo lsof -i :5432

# Kill process (replace PID)
sudo kill -9 PID

# Or use different port in .env file
```

### Health Check Commands

```bash
# API health check
curl http://localhost:8080/health

# PostgreSQL check
docker compose exec postgres pg_isready -U newsadmin

# MongoDB check
docker compose exec mongodb mongo --eval "db.runCommand('ping')"

# Redis check
docker compose exec redis redis-cli ping

# Seq check
curl http://localhost:8081
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api

# Since timestamp
docker compose -f docker-compose.prod.yml logs --since 2024-01-01T00:00:00 api
```

### Database Backup & Restore

**PostgreSQL Backup:**
```bash
# Backup
docker compose exec postgres pg_dump -U newsadmin newsportal > backup.sql

# Restore
docker compose exec -T postgres psql -U newsadmin newsportal < backup.sql
```

**MongoDB Backup:**
```bash
# Backup
docker compose exec mongodb mongodump --username mongouser --password MongoPassword123 --authenticationDatabase admin --db newsportal --out /backup

# Restore
docker compose exec mongodb mongorestore --username mongouser --password MongoPassword123 --authenticationDatabase admin /backup
```

---

## Backup & Restore

### Automated Backups

```bash
# Run backup manually
./script/backup.sh

# Run backup to custom directory
./script/backup.sh /mnt/backups

# Setup daily cron (2:00 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/newsportal/script/backup.sh >> /home/ubuntu/newsportal/logs/backup.log 2>&1
```

Retention policy:
- **Daily backups:** last 7 days
- **Weekly backups:** last 4 weeks (copied every Sunday)

### Manual Restore

**PostgreSQL:**
```bash
# Restore from backup
gunzip -c backups/daily/postgres/pg_newsportal_20260101_020000.sql.gz | \
  docker exec -i newsportal-db psql -U newsadmin newsportal
```

**MongoDB:**
```bash
# Restore from backup
docker exec -i newsportal-mongodb mongorestore \
  --username mongouser --password YOUR_PASSWORD \
  --authenticationDatabase admin \
  --db newsportal --archive --gzip < backups/daily/mongodb/mongo_20260101_020000.archive.gz
```

## Rollback

```bash
# Rollback to a specific image tag (git SHA)
./script/rollback.sh abc1234

# Rollback to the previously deployed version
./script/rollback.sh previous
```

The rollback script:
1. Updates `IMAGE_TAG` in `.env`
2. Pulls the specified image version
3. Restarts containers
4. Runs health checks
5. Auto-restores previous tag if health checks fail

---

## Summary: Quick Reference

### Development Workflow
```bash
# 1. Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# 2. Run .NET app from Visual Studio (F5)

# 3. Run frontend
cd src/NewsPortal.Client && npm run dev

# 4. Stop infrastructure
docker compose -f docker-compose.dev.yml down
```

### Docker Testing Workflow
```bash
# 1. Build and start
docker compose -f docker-compose.yml up -d --build

# 2. View logs
docker compose -f docker-compose.yml logs -f

# 3. Stop
docker compose -f docker-compose.yml down
```

### Production Deployment Workflow
```bash
# 1. Push to main branch
git push origin main

# 2. GitHub Actions automatically:
#    - Builds .NET app and runs tests
#    - Builds Docker images (API, Web, MCP)
#    - Pushes to GHCR (tagged with latest + git SHA)
#    - Deploys to Linux server via SSH
#    - Runs smoke tests

# 3. Monitor deployment in GitHub Actions UI

# 4. If deployment fails, rollback:
./script/rollback.sh previous
```

### Backup Workflow
```bash
# Manual backup
./script/backup.sh

# Automated: runs daily at 2 AM via cron
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [.NET 8.0 Documentation](https://learn.microsoft.com/en-us/dotnet/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)

---

## GitHub Actions Secrets

See [.github/SECRETS.md](.github/SECRETS.md) for the full list of required GitHub secrets for CI/CD.

---

**Last Updated:** 2026-02-19
**Version:** 2.0
