# Troubleshooting Guide - Docker Deployment Errors

This guide covers common build-time and runtime errors you might encounter during deployment.

## Pre-Deployment Validation

**Always run the validation script before deploying:**

```bash
./validate-deployment.sh
```

This will catch most common issues before they cause problems.

---

## Build-Time Errors

### Error 1: Docker Daemon Not Running

**Symptom:**
```
Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker

# Verify
docker info
```

### Error 2: Build Context Too Large

**Symptom:**
```
Sending build context to Docker daemon 2.5GB
Step 1/20 : FROM mcr.microsoft.com/dotnet/sdk:8.0
```

**Cause:** Missing or incorrect `.dockerignore` file

**Solution:**
```bash
# Verify .dockerignore exists
ls -la .dockerignore

# Should exclude: bin/, obj/, logs/, .git/, etc.
# If missing, create from template:
cat > .dockerignore << 'EOF'
**/bin/
**/obj/
**/logs/
**/.git/
**/.vs/
**/node_modules/
EOF
```

### Error 3: COPY Failed - File Not Found

**Symptom:**
```
ERROR [build 3/10] COPY ["NewsPortal.sln", "./"]
COPY failed: file not found in build context
```

**Cause:** Build context is not at repository root

**Solution:**
```bash
# Ensure you're in the repository root
cd NewsPortal  # or wherever your repo is

# Build context must be root (where NewsPortal.sln is)
docker compose build
```

### Error 4: Project Restore Failed

**Symptom:**
```
error NU1101: Unable to find package
error MSB4018: The "ResolvePackageAssets" task failed
```

**Cause:** NuGet package restore issues or network problems

**Solution:**
```bash
# Clear NuGet cache and rebuild
docker compose build --no-cache

# Or specify NuGet source
# Add to Dockerfile before restore:
# RUN dotnet nuget add source https://api.nuget.org/v3/index.json
```

### Error 5: Project Reference Not Found

**Symptom:**
```
error MSB4025: The project file could not be loaded. Could not find file
```

**Cause:** Incorrect project paths in Dockerfile

**Solution:**
Verify Dockerfile has correct paths:
```dockerfile
COPY ["src/NewsPortal.Web/NewsPortal.Web.csproj", "src/NewsPortal.Web/"]
COPY ["src/NewsPortal.Application/NewsPortal.Application.csproj", "src/NewsPortal.Application/"]
# etc.
```

### Error 6: Permission Denied on Build

**Symptom:**
```
Got permission denied while trying to connect to the Docker daemon socket
```

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker ps
```

---

## Runtime Errors

### Error 7: Database Connection Failed

**Symptom (in logs):**
```
Npgsql.NpgsqlException: connection attempt failed
could not translate host name "postgres" to address
```

**Cause:** Database service not ready or wrong connection string

**Solution:**
```bash
# 1. Check if PostgreSQL is running and healthy
docker compose ps postgres

# 2. Verify health check
docker inspect newsportal-db | grep -A 5 Health

# 3. Check connection string in .env
cat .env | grep POSTGRES

# 4. Restart services in order
docker compose down
docker compose up -d postgres
sleep 10
docker compose up -d mongodb redis
sleep 5
docker compose up -d web mcpserver
```

### Error 8: Migration Failed

**Symptom:**
```
Failed executing DbCommand (42P01: relation "categories" does not exist)
```

**Cause:** Database migrations not applied

**Solution:**
```bash
# The web app applies migrations automatically
# Check if it's running in Development mode for auto-migration

# Manual migration (if needed):
docker compose exec web dotnet ef database update

# Or restart web service to trigger migration
docker compose restart web
```

### Error 9: MongoDB Connection Timeout

**Symptom:**
```
MongoDB.Driver.MongoConnectionException: A timeout occurred
```

**Cause:** MongoDB not ready or authentication failure

**Solution:**
```bash
# 1. Check MongoDB status
docker compose ps mongodb

# 2. Check MongoDB logs
docker compose logs mongodb

# 3. Verify credentials
docker compose exec mongodb mongosh -u mongouser -p

# 4. Check connection string format
# Should be: mongodb://user:password@mongodb:27017/dbname?authSource=admin
```

### Error 10: Redis Connection Failed

**Symptom:**
```
StackExchange.Redis.RedisConnectionException: No connection is available
```

**Cause:** Redis not running or connection refused

**Solution:**
```bash
# 1. Check Redis status
docker compose ps redis

# 2. Test Redis connection
docker compose exec redis redis-cli ping
# Should return: PONG

# 3. Check Redis logs
docker compose logs redis

# 4. Restart Redis
docker compose restart redis
```

### Error 11: Port Already in Use

**Symptom:**
```
Error starting userland proxy: listen tcp 0.0.0.0:5000: bind: address already in use
```

**Cause:** Another service using the same port

**Solution:**
```bash
# Option 1: Stop conflicting service
# Find what's using the port
sudo lsof -i :5000
# or
sudo netstat -tulpn | grep 5000

# Kill the process
sudo kill -9 <PID>

# Option 2: Change port in .env
echo "WEB_PORT=5001" >> .env
docker compose down
docker compose up -d
```

### Error 12: Container Keeps Restarting

**Symptom:**
```
newsportal-web    Restarting (1) 10 seconds ago
```

**Cause:** Application crash on startup

**Solution:**
```bash
# 1. Check logs for crash reason
docker compose logs web --tail=100

# 2. Common causes:
# - Missing environment variables
# - Database connection failure
# - Missing configuration files

# 3. Run container interactively to debug
docker compose run --rm web bash
# Then manually run: dotnet NewsPortal.Web.dll
```

### Error 13: Out of Memory

**Symptom:**
```
Cannot allocate memory
Container killed by OOM killer
```

**Cause:** Insufficient system memory

**Solution:**
```bash
# 1. Check available memory
free -h

# 2. Enable swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. Reduce container memory limits in docker-compose.yml
# Example:
# deploy:
#   resources:
#     limits:
#       memory: 256M  # Reduced from 512M
```

### Error 14: Volume Permission Denied

**Symptom:**
```
Permission denied: '/app/logs/web-20260122.log'
```

**Cause:** Incorrect volume permissions

**Solution:**
```bash
# Fix log directory permissions
sudo chown -R $(whoami):$(whoami) logs/
chmod -R 755 logs/

# Restart services
docker compose restart
```

### Error 15: Network Error Between Containers

**Symptom:**
```
Name or service not known (postgres)
could not translate host name "postgres"
```

**Cause:** Containers not on same network

**Solution:**
```bash
# 1. Verify network exists
docker network ls | grep newsportal

# 2. Recreate network
docker compose down
docker network create newsportal-network
docker compose up -d

# 3. Verify containers are on network
docker network inspect newsportal-network
```

---

## Configuration Errors

### Error 16: Environment Variables Not Loading

**Symptom:**
App uses wrong credentials or default values

**Solution:**
```bash
# 1. Verify .env file exists
ls -la .env

# 2. Check .env is in same directory as docker-compose.yml
pwd
ls docker-compose.yml .env

# 3. Verify environment variables are loaded
docker compose config | grep -A 20 environment

# 4. Restart to reload .env
docker compose down
docker compose up -d
```

### Error 17: HTTPS Redirect Issues

**Symptom:**
```
ERR_SSL_PROTOCOL_ERROR
```

**Cause:** HTTPS redirect enabled but no certificate

**Solution:**
```bash
# In Production environment, app tries to redirect to HTTPS
# Either:
# 1. Set up reverse proxy with SSL
# 2. Or disable HTTPS redirect in appsettings.Production.json
```

---

## Diagnostic Commands

### Check Overall Status

```bash
# View all services status
docker compose ps

# View resource usage
docker stats

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f web
docker compose logs -f postgres
```

### Test Database Connections

```bash
# PostgreSQL
docker compose exec postgres psql -U newsadmin -d newsportal -c "SELECT version();"

# MongoDB
docker compose exec mongodb mongosh -u mongouser -p MongoPassword123 --eval "db.adminCommand('ping')"

# Redis
docker compose exec redis redis-cli ping
```

### Access Container Shell

```bash
# Web application
docker compose exec web bash

# PostgreSQL
docker compose exec postgres bash

# View environment variables
docker compose exec web env
```

### Check Disk Space

```bash
# System disk space
df -h

# Docker disk usage
docker system df

# Clean up Docker
docker system prune -a
```

---

## Performance Issues

### Web App Slow to Start

**Solution:**
```bash
# Increase startup timeout
# Check health check settings in docker-compose.yml

# View startup logs
docker compose logs web -f
```

### Database Queries Slow

**Solution:**
```bash
# 1. Check PostgreSQL performance
docker compose exec postgres psql -U newsadmin -d newsportal

# Run inside psql:
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# 2. Increase PostgreSQL memory
# In docker-compose.yml:
# postgres:
#   command: postgres -c shared_buffers=256MB -c max_connections=200
```

---

## Recovery Procedures

### Complete Reset (Nuclear Option)

**⚠️ Warning: This will delete ALL data!**

```bash
# Stop and remove everything
docker compose down -v

# Remove all NewsPortal images
docker images | grep newsportal | awk '{print $3}' | xargs docker rmi -f

# Clean up Docker
docker system prune -a

# Restart fresh
docker compose up -d --build
```

### Restore from Backup

```bash
# Stop services
docker compose down

# Restore PostgreSQL
cat backup.sql | docker compose exec -T postgres psql -U newsadmin newsportal

# Restore MongoDB
docker compose up -d mongodb
docker cp mongodb_backup newsportal-mongodb:/tmp/restore
docker compose exec mongodb mongorestore /tmp/restore

# Start all services
docker compose up -d
```

---

## Getting More Help

### Enable Debug Logging

Add to `.env`:
```bash
ASPNETCORE_ENVIRONMENT=Development
```

Then rebuild:
```bash
docker compose up -d --build
docker compose logs -f web
```

### Common Log Locations

```bash
# Application logs
./logs/web/web-*.log
./logs/mcp/mcp-server-*.log

# Docker logs
docker compose logs

# System logs (Linux)
sudo journalctl -u docker
```

### Health Check Script

```bash
# Run comprehensive health check
./health-check.sh
```

### Validation Script

```bash
# Validate setup before deployment
./validate-deployment.sh
```

---

## Quick Fixes Checklist

When something goes wrong, try these in order:

1. ✅ Check service status: `docker compose ps`
2. ✅ Check logs: `docker compose logs -f`
3. ✅ Verify .env file: `cat .env`
4. ✅ Check network: `docker network ls`
5. ✅ Check volumes: `docker volume ls`
6. ✅ Restart services: `docker compose restart`
7. ✅ Rebuild if needed: `docker compose up -d --build`
8. ✅ Run health check: `./health-check.sh`
9. ✅ Check disk space: `df -h`
10. ✅ Check memory: `free -h`

If all else fails, check the documentation or open an issue on GitHub.
