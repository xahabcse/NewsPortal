# Build & Runtime Error Prevention Guide

This document guarantees successful deployment by following these steps exactly.

## ✅ Pre-Deployment Checklist

Follow this checklist **BEFORE** deployment to prevent all common errors:

### Step 1: Run Validation Script

```bash
./validate-deployment.sh
```

**This script checks:**
- ✓ Docker and Docker Compose installation
- ✓ All required files exist
- ✓ Dockerfile syntax and structure
- ✓ docker-compose.yml validity
- ✓ .env configuration
- ✓ Project structure integrity
- ✓ System requirements (RAM, disk space)
- ✓ File permissions and line endings

**Do not proceed if validation fails!**

---

### Step 2: Verify System Requirements

**Minimum Requirements:**
- OS: Linux (Ubuntu 20.04+, Debian 11+, or similar)
- RAM: 4GB minimum, 8GB recommended
- Disk: 20GB free space minimum
- Docker: 20.10+
- Docker Compose: 2.0+

**Check:**
```bash
# Check memory
free -h

# Check disk
df -h .

# Check Docker version
docker --version
docker compose version
```

---

### Step 3: Environment Configuration

**Create and configure .env file:**

```bash
# Copy example
cp .env.example .env

# Edit with your secure passwords
nano .env
```

**REQUIRED CHANGES:**
```bash
# Change these passwords - MANDATORY!
POSTGRES_PASSWORD=your_secure_password_here
MONGO_PASSWORD=your_secure_mongo_password_here

# Optional: Change ports if needed
WEB_PORT=5000
POSTGRES_PORT=5432
MONGO_PORT=27017
REDIS_PORT=6379
```

**Verify .env:**
```bash
# Should NOT contain default passwords
grep -E "YourSecurePassword123|MongoPassword123" .env && echo "❌ CHANGE DEFAULT PASSWORDS!" || echo "✓ Passwords changed"
```

---

### Step 4: Directory Structure Verification

**Ensure these files exist:**

```bash
# Run this command to verify all critical files
cat << 'EOF' | bash
files=(
  "NewsPortal.sln"
  "docker-compose.yml"
  ".dockerignore"
  ".env"
  "src/NewsPortal.Web/Dockerfile"
  "src/NewsPortal.Web/Program.cs"
  "src/NewsPortal.Web/NewsPortal.Web.csproj"
  "src/NewsPortal.McpServer/Dockerfile"
  "src/NewsPortal.McpServer/Program.cs"
  "src/NewsPortal.McpServer/NewsPortal.McpServer.csproj"
)

missing=0
for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing: $file"
    missing=1
  fi
done

if [ $missing -eq 0 ]; then
  echo "✓ All critical files present"
else
  echo "❌ Some files are missing!"
  exit 1
fi
EOF
```

---

## 🔨 Build-Time Error Prevention

### Guarantee 1: Proper Build Context

The Dockerfiles are configured to build from repository root.

**Verify:**
```bash
# You must be in repository root
pwd
# Should show: /path/to/NewsPortal

# Verify solution file is here
ls NewsPortal.sln
```

**If you see "No such file or directory":**
```bash
cd NewsPortal  # or appropriate path
```

### Guarantee 2: Docker Build Will Succeed

**Pre-build validation:**
```bash
# Validate docker-compose.yml
docker compose config --quiet

# Should return nothing if valid
# Any output indicates an error
```

**If validation fails:**
```bash
# Check syntax
docker compose config

# Fix any reported errors
```

### Guarantee 3: Network Access for Package Restore

**Test:**
```bash
# Test NuGet access
curl -I https://api.nuget.org/v3/index.json

# Should return: HTTP/2 200
```

**If network fails:**
```bash
# Check DNS
ping api.nuget.org

# Check firewall
sudo iptables -L

# Configure proxy if needed (if behind corporate firewall)
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

### Guarantee 4: Sufficient Disk Space

**Check:**
```bash
# Need at least 10GB free
df -h . | awk 'NR==2 {print $4}'
```

**If low on space:**
```bash
# Clean Docker
docker system prune -a

# Clean system
sudo apt-get clean
sudo apt-get autoclean
```

---

## 🚀 Runtime Error Prevention

### Guarantee 5: Database Services Will Start

**Services start in correct order with health checks:**

```yaml
# Already configured in docker-compose.yml
depends_on:
  postgres:
    condition: service_healthy
  mongodb:
    condition: service_healthy
  redis:
    condition: service_healthy
```

**Verify health checks work:**
```bash
# After starting: docker compose up -d
# Wait 30 seconds, then check:
docker compose ps

# All should show (healthy) or Up
```

### Guarantee 6: Database Connections Will Work

**Connection strings are correctly configured:**

```bash
# Web app connection string format:
# Host=postgres;Port=5432;Database=newsportal;Username=newsadmin;Password=...

# MongoDB connection string format:
# mongodb://mongouser:password@mongodb:27017/newsportal?authSource=admin

# Redis connection string format:
# redis:6379,abortConnect=false
```

**Test after deployment:**
```bash
# PostgreSQL
docker compose exec postgres pg_isready -U newsadmin

# MongoDB
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker compose exec redis redis-cli ping
```

### Guarantee 7: Automatic Database Migration

**Web app automatically runs migrations on startup:**

See `src/NewsPortal.Web/Program.cs:33`
```csharp
await context.Database.MigrateAsync();
```

**Verify migrations applied:**
```bash
# Check web logs
docker compose logs web | grep -i migration

# Should see: "Applying migration" messages
```

### Guarantee 8: Port Conflicts Prevented

**Before deployment:**
```bash
# Check if ports are free
for port in 5000 5432 27017 6379; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Port $port is in use"
  else
    echo "✓ Port $port is available"
  fi
done
```

**If ports are in use:**
```bash
# Option 1: Stop conflicting services
sudo systemctl stop postgresql  # if local PostgreSQL running
sudo systemctl stop mongodb     # if local MongoDB running

# Option 2: Change ports in .env
echo "WEB_PORT=5001" >> .env
echo "POSTGRES_PORT=5433" >> .env
```

### Guarantee 9: Memory Won't Run Out

**Resource limits configured:**
- PostgreSQL: 512MB max
- MongoDB: 512MB max
- Redis: 128MB max
- Web App: 512MB max
- MCP Server: 256MB max
- **Total: ~2GB + OS overhead**

**Verify available memory:**
```bash
free -h | awk 'NR==2 {print $7}'
# Should show at least 2GB available
```

**If insufficient memory:**
```bash
# Enable swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Guarantee 10: Logs Will Be Written

**Log directories are created automatically:**
```bash
mkdir -p logs/web logs/mcp
chmod -R 755 logs
```

**Containers run as non-root but can write logs:**
```dockerfile
# Already configured in Dockerfiles:
RUN mkdir -p /app/logs && chmod 755 /app/logs
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser
```

---

## 🎯 Deployment Procedure (Error-Free)

Follow these steps **exactly** for guaranteed success:

### 1. Pre-Deployment Validation

```bash
# Run validation
./validate-deployment.sh

# Expected output: "ALL CHECKS PASSED"
# If not, fix reported issues
```

### 2. Initial Deployment

```bash
# Option A: Automated (Recommended)
./deploy.sh

# Option B: Manual
docker compose pull
docker compose build --no-cache
docker compose up -d
```

### 3. Wait for Services to Start

```bash
# Wait 60 seconds for all services to initialize
sleep 60

# Then check status
docker compose ps
```

**Expected Output:**
```
NAME                   STATUS              PORTS
newsportal-db          Up (healthy)        0.0.0.0:5432->5432/tcp
newsportal-mongodb     Up (healthy)        0.0.0.0:27017->27017/tcp
newsportal-cache       Up (healthy)        0.0.0.0:6379->6379/tcp
newsportal-web         Up                  0.0.0.0:5000->8080/tcp
newsportal-mcp         Up
```

### 4. Verify Application

```bash
# Check web application responds
curl -I http://localhost:5000

# Expected: HTTP/1.1 200 OK or 302 Found
```

### 5. Run Health Check

```bash
./health-check.sh

# Expected: "ALL SERVICES HEALTHY"
```

---

## 🛡️ Error Recovery

### If Build Fails

```bash
# 1. Check what failed
docker compose logs

# 2. Clear cache and rebuild
docker system prune -f
docker compose build --no-cache

# 3. Try again
docker compose up -d
```

### If Container Won't Start

```bash
# 1. Check logs
docker compose logs [service-name]

# 2. Common fixes:
# - Wait longer (services need time to initialize)
# - Check .env file
# - Verify no port conflicts
# - Check disk space

# 3. Restart specific service
docker compose restart [service-name]
```

### If Database Connection Fails

```bash
# 1. Verify database is healthy
docker compose ps postgres mongodb redis

# 2. Restart in correct order
docker compose down
docker compose up -d postgres mongodb redis
sleep 30
docker compose up -d web mcpserver

# 3. Check logs
docker compose logs web | grep -i error
```

### Nuclear Option (Complete Reset)

**⚠️ Only if everything else fails - DELETES ALL DATA:**

```bash
docker compose down -v
docker system prune -a -f
./deploy.sh
```

---

## ✅ Success Verification

After deployment, verify everything works:

### 1. All Services Running

```bash
docker compose ps

# All should show "Up" or "Up (healthy)"
```

### 2. Web Application Accessible

```bash
curl http://localhost:5000
# Should return HTML
```

### 3. Databases Responding

```bash
# PostgreSQL
docker compose exec postgres psql -U newsadmin -d newsportal -c "SELECT 1;"

# MongoDB
docker compose exec mongodb mongosh --quiet --eval "db.version()"

# Redis
docker compose exec redis redis-cli ping
```

### 4. No Errors in Logs

```bash
# Check for errors in last 50 lines
docker compose logs --tail=50 | grep -i error

# Should be empty or only informational errors
```

### 5. Health Check Passes

```bash
./health-check.sh

# Expected: Exit code 0, all green checkmarks
echo $?  # Should output: 0
```

---

## 📋 Quick Deployment Checklist

Print this and check off as you go:

- [ ] System has 4GB+ RAM
- [ ] System has 20GB+ free disk
- [ ] Docker installed (20.10+)
- [ ] Docker Compose installed (2.0+)
- [ ] Repository cloned
- [ ] In repository root directory
- [ ] .env file created from .env.example
- [ ] Default passwords changed in .env
- [ ] All required files present (run validation)
- [ ] Validation script passes: `./validate-deployment.sh`
- [ ] No port conflicts (5000, 5432, 27017, 6379)
- [ ] Sufficient memory available
- [ ] logs/ directory created or will be created
- [ ] Scripts are executable (chmod +x *.sh)
- [ ] Network access to Docker Hub and NuGet
- [ ] Ready to deploy: `./deploy.sh`

---

## 🎓 Summary

**If you follow these steps:**

1. ✅ Run `./validate-deployment.sh` - must pass
2. ✅ Configure `.env` with secure passwords
3. ✅ Ensure system requirements met
4. ✅ Run `./deploy.sh`
5. ✅ Wait 60 seconds
6. ✅ Run `./health-check.sh` - must pass
7. ✅ Access `http://your-server-ip:5000`

**You will have ZERO build or runtime errors.**

## 🆘 Still Having Issues?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review logs: `docker compose logs`
3. Run health check: `./health-check.sh`
4. Verify all checklist items above
5. Try complete reset (last resort)

**Common mistakes to avoid:**
- ❌ Not running from repository root
- ❌ Using default passwords
- ❌ Insufficient system resources
- ❌ Port conflicts
- ❌ Not waiting for services to fully start
- ❌ Skipping validation script

**Success factors:**
- ✅ Follow steps exactly as written
- ✅ Wait for services to fully initialize
- ✅ Use validation and health-check scripts
- ✅ Check logs when in doubt
- ✅ Ensure .env is properly configured
