# Docker Setup - Complete Overview

This document provides a complete overview of the Docker setup for the News Portal application.

## Files Created for Docker Deployment

### 1. Core Docker Files

| File | Location | Purpose |
|------|----------|---------|
| `docker-compose.yml` | Root | Production orchestration file for all services |
| `Dockerfile` | `src/NewsPortal.Web/` | Web application container build instructions |
| `Dockerfile` | `src/NewsPortal.McpServer/` | MCP Server container build instructions |
| `.dockerignore` | Root | Excludes unnecessary files from Docker build context |

### 2. Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `appsettings.Production.json` | Production configuration for Web app |
| `appsettings.Production.json` | Production configuration for MCP Server |

### 3. Deployment Scripts

| File | Purpose |
|------|---------|
| `deploy.sh` | Interactive deployment script for Linux |
| `health-check.sh` | Service health monitoring script |

### 4. Documentation

| File | Purpose |
|------|---------|
| `QUICKSTART.md` | 5-minute quick start guide |
| `DEPLOYMENT.md` | Complete deployment documentation |
| `DOCKER-SETUP.md` | This file - Docker setup overview |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ PostgreSQL   │  │  MongoDB     │  │   Redis     │      │
│  │ Container    │  │  Container   │  │  Container  │      │
│  │ Port: 5432   │  │  Port: 27017 │  │  Port: 6379 │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘      │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│         ┌──────────────────┴──────────────────┐             │
│         │                                     │             │
│  ┌──────▼────────┐              ┌─────────────▼────────┐   │
│  │ Web App       │              │  MCP Server          │   │
│  │ Container     │              │  Container           │   │
│  │ Port: 8080    │              │  (Background)        │   │
│  │ (Exposed:5000)│              │                      │   │
│  └───────────────┘              └──────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                     Exposed to Host
                      http://host:5000
```

## Services Description

### 1. PostgreSQL Database
- **Image**: `postgres:15-alpine`
- **Purpose**: Main database for articles, categories, sources
- **Memory**: 512MB limit, 256MB reserved
- **Data Persistence**: `postgres_data` volume
- **Health Check**: `pg_isready` command

### 2. MongoDB
- **Image**: `mongo:4.4`
- **Purpose**: Image storage using GridFS
- **Memory**: 512MB limit, 256MB reserved
- **Data Persistence**: `mongodb_data` and `mongodb_config` volumes
- **Health Check**: `mongosh ping` command

### 3. Redis Cache
- **Image**: `redis:7-alpine`
- **Purpose**: Caching layer for improved performance
- **Memory**: 128MB limit (100MB max memory, LRU eviction)
- **Data Persistence**: `redis_data` volume with AOF
- **Health Check**: `redis-cli ping` command

### 4. Web Application
- **Base Image**: `mcr.microsoft.com/dotnet/aspnet:8.0`
- **Purpose**: Main ASP.NET Core MVC application
- **Memory**: 512MB limit, 256MB reserved
- **Exposed Port**: 5000 (maps to internal 8080)
- **Depends On**: All database services must be healthy
- **Volumes**: `./logs/web` for application logs

### 5. MCP Server
- **Base Image**: `mcr.microsoft.com/dotnet/runtime:8.0`
- **Purpose**: Background news fetching and processing
- **Memory**: 256MB limit, 128MB reserved
- **Depends On**: All database services must be healthy
- **Volumes**: `./logs/mcp` for server logs

## Network Configuration

All services run on a custom bridge network: `newsportal-network`

This allows:
- Service-to-service communication using service names
- Isolation from other Docker containers
- Internal DNS resolution

## Volume Management

### Persistent Volumes

| Volume | Purpose | Typical Size |
|--------|---------|--------------|
| `postgres_data` | PostgreSQL data | 2-10GB |
| `mongodb_data` | MongoDB documents | 5-50GB |
| `mongodb_config` | MongoDB config | <100MB |
| `redis_data` | Redis persistence | 100MB-1GB |

### Host Volumes (Bind Mounts)

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `./logs/web` | `/app/logs` | Web application logs |
| `./logs/mcp` | `/app/logs` | MCP Server logs |

## Environment Variables

All environment variables are defined in `.env` file:

### Database Configuration
- `POSTGRES_USER` - PostgreSQL username
- `POSTGRES_PASSWORD` - PostgreSQL password (CHANGE THIS!)
- `POSTGRES_DB` - Database name
- `POSTGRES_PORT` - External port mapping

### MongoDB Configuration
- `MONGO_USER` - MongoDB root username
- `MONGO_PASSWORD` - MongoDB root password (CHANGE THIS!)
- `MONGO_PORT` - External port mapping

### Application Configuration
- `ASPNETCORE_ENVIRONMENT` - Application environment (Production/Development)
- `WEB_PORT` - External port for web application
- `REDIS_PORT` - External port for Redis

## Build Process

### Multi-Stage Build

Both Dockerfiles use multi-stage builds:

1. **Build Stage**: Uses SDK image to compile .NET application
2. **Publish Stage**: Creates optimized release build
3. **Final Stage**: Uses lightweight runtime image with only published files

Benefits:
- Smaller final image size
- Faster deployment
- Security (no build tools in production image)

### Build Context

Build context is the repository root, allowing access to:
- Solution file (`NewsPortal.sln`)
- All project files under `src/`
- Shared dependencies between projects

### Build Optimization

- Layer caching: Project files copied before source code
- `.dockerignore`: Excludes unnecessary files (bin, obj, logs)
- Restore before copy: Dependencies restored first for better caching

## Security Features

### 1. Non-Root User
Both application containers run as non-root user `appuser`

### 2. Resource Limits
All containers have memory limits to prevent resource exhaustion

### 3. Health Checks
All services monitored with health checks for automatic recovery

### 4. Network Isolation
Services communicate on isolated Docker network

### 5. Secret Management
Sensitive data managed through `.env` file (not committed to Git)

## Deployment Workflow

### Development Flow
```bash
# 1. Code changes
git pull

# 2. Rebuild images
docker compose build

# 3. Restart services
docker compose up -d

# 4. Check logs
docker compose logs -f
```

### Production Flow
```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild with no cache
docker compose build --no-cache

# 3. Restart with new images
docker compose up -d

# 4. Verify health
./health-check.sh

# 5. Monitor logs
docker compose logs -f --tail=100
```

## Monitoring & Maintenance

### Health Monitoring
```bash
# Quick health check
./health-check.sh

# Detailed status
docker compose ps

# Resource usage
docker stats
```

### Log Management
```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f web

# Last N lines
docker compose logs --tail=100 web

# Rotate logs (cleanup)
docker compose logs --no-log-prefix | head -n 1000 > backup.log
```

### Database Maintenance
```bash
# PostgreSQL backup
docker exec newsportal-db pg_dump -U newsadmin newsportal > backup.sql

# PostgreSQL restore
cat backup.sql | docker exec -i newsportal-db psql -U newsadmin newsportal

# MongoDB backup
docker exec newsportal-mongodb mongodump --out=/tmp/backup
docker cp newsportal-mongodb:/tmp/backup ./mongodb_backup

# MongoDB restore
docker cp ./mongodb_backup newsportal-mongodb:/tmp/restore
docker exec newsportal-mongodb mongorestore /tmp/restore
```

## Troubleshooting

### Container Won't Start

1. Check logs:
   ```bash
   docker compose logs [service-name]
   ```

2. Check resource usage:
   ```bash
   docker stats
   free -h
   ```

3. Verify configuration:
   ```bash
   docker compose config
   ```

### Database Connection Issues

1. Verify database is healthy:
   ```bash
   docker compose ps postgres
   ```

2. Test connection:
   ```bash
   docker exec newsportal-db pg_isready -U newsadmin
   ```

3. Check connection string in logs:
   ```bash
   docker compose logs web | grep -i "connection"
   ```

### Build Failures

1. Clean Docker cache:
   ```bash
   docker builder prune -a
   ```

2. Rebuild without cache:
   ```bash
   docker compose build --no-cache
   ```

3. Check .dockerignore isn't excluding needed files

### Performance Issues

1. Check resource limits in `docker-compose.yml`
2. Monitor resource usage: `docker stats`
3. Review application logs for bottlenecks
4. Consider scaling: `docker compose up -d --scale web=2`

## Scaling Considerations

### Horizontal Scaling

Web application can be scaled:
```bash
docker compose up -d --scale web=3
```

Requirements:
- Load balancer (Nginx, HAProxy)
- Shared session storage (Redis)
- Shared file storage for uploads

### Vertical Scaling

Adjust resource limits in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G  # Increase from 512M
```

## Production Recommendations

1. **Reverse Proxy**: Use Nginx/Traefik for SSL and load balancing
2. **Monitoring**: Implement Prometheus + Grafana
3. **Logging**: Use ELK stack or similar for centralized logging
4. **Backups**: Automate daily database backups
5. **Updates**: Implement blue-green or rolling deployments
6. **Secrets**: Use Docker secrets or external secret management
7. **CI/CD**: Automate builds with GitHub Actions or similar

## Quick Command Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Rebuild and restart
docker compose up -d --build

# View logs
docker compose logs -f

# Check status
docker compose ps

# Health check
./health-check.sh

# Scale service
docker compose up -d --scale web=3

# Execute command in container
docker compose exec web bash

# View resource usage
docker stats
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [.NET Docker Documentation](https://docs.microsoft.com/en-us/dotnet/core/docker/)
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
