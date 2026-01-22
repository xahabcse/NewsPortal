# Docker Setup - Files Summary

This document lists all Docker-related files created for easy deployment.

## Created/Modified Files

### Root Directory Files

```
NewsPortal/
├── docker-compose.yml              # Main orchestration file (NEW)
├── .dockerignore                   # Build optimization (NEW)
├── .env.example                    # Environment variables template (NEW)
├── deploy.sh                       # Automated deployment script (NEW)
├── health-check.sh                 # Health monitoring script (NEW)
├── QUICKSTART.md                   # 5-minute quick start guide (NEW)
├── DEPLOYMENT.md                   # Complete deployment guide (NEW)
└── DOCKER-SETUP.md                 # Docker setup documentation (NEW)
```

### Modified Dockerfiles

```
src/
├── NewsPortal.Web/
│   ├── Dockerfile                  # Updated for root context
│   └── appsettings.Production.json # Production config (NEW)
└── NewsPortal.McpServer/
    ├── Dockerfile                  # Updated for root context
    └── appsettings.Production.json # Production config (NEW)
```

### Existing Files (Not Modified)

```
docker/
├── docker-compose.yml              # Old version - can be deleted
└── docker-compose.dev.yml          # Development version - keep for local dev
```

## File Descriptions

### 1. docker-compose.yml (Root)
**Location**: `NewsPortal/docker-compose.yml`
**Purpose**: Production-ready orchestration file

Features:
- 5 services: PostgreSQL, MongoDB, Redis, Web, MCP Server
- Health checks for all database services
- Environment variable support via .env
- Resource limits for 4GB server
- Named volumes for data persistence
- Custom network for service isolation

### 2. .dockerignore
**Location**: `NewsPortal/.dockerignore`
**Purpose**: Optimize Docker build by excluding unnecessary files

Excludes:
- Build artifacts (bin/, obj/)
- IDE folders (.vs/, .vscode/, .idea/)
- Logs and temporary files
- Test projects
- Documentation files

### 3. .env.example
**Location**: `NewsPortal/.env.example`
**Purpose**: Template for environment configuration

Contains:
- Database credentials (PostgreSQL, MongoDB)
- Port mappings
- Application environment settings
- Placeholder for API keys

### 4. deploy.sh
**Location**: `NewsPortal/deploy.sh`
**Purpose**: Interactive deployment automation

Features:
- Docker installation check
- .env file creation and validation
- Multiple deployment options
- Status checking
- User-friendly colored output

Permissions: `chmod +x deploy.sh`

### 5. health-check.sh
**Location**: `NewsPortal/health-check.sh`
**Purpose**: Monitor service health and status

Features:
- Service status checks
- Resource usage monitoring
- Network connectivity tests
- Error log scanning
- Colored status indicators

Permissions: `chmod +x health-check.sh`

### 6. QUICKSTART.md
**Location**: `NewsPortal/QUICKSTART.md`
**Purpose**: Simplified 5-minute deployment guide

Covers:
- Prerequisites
- Quick installation steps
- Manual deployment alternative
- Common commands
- Troubleshooting basics

### 7. DEPLOYMENT.md
**Location**: `NewsPortal/DEPLOYMENT.md`
**Purpose**: Comprehensive deployment documentation

Includes:
- Detailed prerequisites
- Step-by-step deployment
- Environment variables reference
- Security recommendations
- Backup & restore procedures
- Performance tuning
- Troubleshooting guide

### 8. DOCKER-SETUP.md
**Location**: `NewsPortal/DOCKER-SETUP.md`
**Purpose**: Technical documentation of Docker architecture

Contains:
- Architecture overview
- Service descriptions
- Network configuration
- Volume management
- Build process details
- Security features
- Monitoring guidelines

### 9. Dockerfile (Web)
**Location**: `NewsPortal/src/NewsPortal.Web/Dockerfile`
**Changes**: Updated for root context build

Improvements:
- Multi-stage build optimization
- Non-root user for security
- Timezone support
- Proper log directory setup
- Efficient layer caching

### 10. Dockerfile (MCP Server)
**Location**: `NewsPortal/src/NewsPortal.McpServer/Dockerfile`
**Changes**: Updated for root context build

Same improvements as Web Dockerfile

### 11. appsettings.Production.json (Web & MCP)
**Locations**:
- `NewsPortal/src/NewsPortal.Web/appsettings.Production.json`
- `NewsPortal/src/NewsPortal.McpServer/appsettings.Production.json`

**Purpose**: Production logging configuration

## Quick Deployment Workflow

### On Your Linux Server:

```bash
# 1. Clone repository
git clone <your-repo-url>
cd NewsPortal

# 2. Run deployment script
./deploy.sh

# 3. Follow prompts to:
#    - Configure .env file
#    - Change passwords
#    - Select deployment option

# 4. Check health
./health-check.sh

# 5. Access application
http://your-server-ip:5000
```

## What Gets Created on Deployment

### Docker Containers
1. `newsportal-db` - PostgreSQL database
2. `newsportal-mongodb` - MongoDB image storage
3. `newsportal-cache` - Redis cache
4. `newsportal-web` - Web application
5. `newsportal-mcp` - MCP background server

### Docker Volumes
1. `newsportal_postgres_data` - PostgreSQL data
2. `newsportal_mongodb_data` - MongoDB data
3. `newsportal_mongodb_config` - MongoDB config
4. `newsportal_redis_data` - Redis persistence

### Docker Network
- `newsportal-network` - Bridge network for inter-service communication

### Host Directories
- `logs/web/` - Web application logs
- `logs/mcp/` - MCP Server logs

## Environment Configuration

### Required Changes in .env
Before deployment, you MUST change:

```bash
# Change these passwords!
POSTGRES_PASSWORD=YourSecurePassword123_ChangeThis!
MONGO_PASSWORD=MongoPassword123_ChangeThis!
```

### Optional Customizations
You can also customize:
- Port mappings (WEB_PORT, POSTGRES_PORT, etc.)
- Database names
- Environment (Production/Staging)

## Resource Allocation (Default)

| Service | Memory Limit | Memory Reserved |
|---------|--------------|-----------------|
| PostgreSQL | 512MB | 256MB |
| MongoDB | 512MB | 256MB |
| Redis | 128MB | 64MB |
| Web App | 512MB | 256MB |
| MCP Server | 256MB | 128MB |
| **Total** | **~1.9GB** | **~1GB** |

Plus OS overhead, leaves comfortable margin on 4GB server.

## Port Exposure (Default)

| Service | Internal | External | Purpose |
|---------|----------|----------|---------|
| Web | 8080 | 5000 | HTTP access |
| PostgreSQL | 5432 | 5432 | Database access |
| MongoDB | 27017 | 27017 | Document store |
| Redis | 6379 | 6379 | Cache access |

## Security Checklist

Before going to production:

- [ ] Changed all default passwords in .env
- [ ] Reviewed and secured .env file (chmod 600)
- [ ] Configured firewall (ufw/iptables)
- [ ] Set up reverse proxy (Nginx)
- [ ] Enabled HTTPS/SSL
- [ ] Blocked direct database access from internet
- [ ] Configured automated backups
- [ ] Set up monitoring/alerting
- [ ] Reviewed application logs location
- [ ] Tested backup restoration
- [ ] Updated allowed hosts in configuration
- [ ] Enabled rate limiting (if needed)

## Maintenance Commands

### Daily/Weekly
```bash
# Check health
./health-check.sh

# View logs
docker compose logs --tail=100 -f

# Check disk usage
docker system df
```

### Monthly
```bash
# Backup databases
./backup.sh  # (create this based on DEPLOYMENT.md)

# Clean up Docker
docker system prune -a

# Update images
docker compose pull
docker compose up -d
```

### Updates/Changes
```bash
# Pull latest code
git pull

# Rebuild
docker compose build

# Deploy
docker compose up -d

# Verify
./health-check.sh
```

## Useful Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart specific service
docker compose restart web

# View logs
docker compose logs -f [service]

# Access shell
docker compose exec web bash

# View resource usage
docker stats

# Clean up everything (CAUTION: Removes data!)
docker compose down -v

# List volumes
docker volume ls

# Inspect service
docker compose exec web env
```

## Troubleshooting Quick Reference

| Issue | Command | Solution |
|-------|---------|----------|
| Container won't start | `docker compose logs [service]` | Check logs for errors |
| Can't access web | `docker compose ps web` | Verify service is running |
| Database connection error | `docker compose restart` | Restart all services |
| Out of memory | `free -h` | Add swap or increase resources |
| Port already in use | `docker compose down` | Stop conflicting service |
| Permission denied | `sudo chown -R $USER:$USER .` | Fix file ownership |

## Documentation Quick Links

- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Full Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Docker Details**: [DOCKER-SETUP.md](DOCKER-SETUP.md)
- **Main README**: [README.md](README.md)

## Next Steps After Deployment

1. ✅ Verify all services are running: `./health-check.sh`
2. ✅ Access the application: `http://your-server-ip:5000`
3. ✅ Configure firewall for security
4. ✅ Set up SSL certificate (Let's Encrypt)
5. ✅ Configure Nginx reverse proxy
6. ✅ Set up automated backups
7. ✅ Configure monitoring (optional)
8. ✅ Test backup restoration
9. ✅ Configure news sources in application
10. ✅ Set up scheduled news fetching

## Support & Additional Help

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Run health check: `./health-check.sh`
3. Review documentation in this directory
4. Check Docker and Docker Compose versions
5. Ensure sufficient system resources
6. Verify .env configuration

## File Cleanup (Optional)

You can safely delete these old files if using the new setup:

```bash
# Old docker folder (keep docker-compose.dev.yml if needed for local development)
rm docker/docker-compose.yml
```

Keep:
- `docker/docker-compose.dev.yml` - For local development
- All files in root directory - For production deployment

---

**Deployment completed successfully!** 🚀

Your News Portal is now ready to be deployed with a simple `./deploy.sh` command on your Linux server.
