# NewsPortal - Quick Deployment Guide

Simple deployment for **Windows (Docker Desktop)** and **Ubuntu Server**.

---

## Quick Start

### Windows (Docker Desktop)

**Option 1: Using PowerShell**
```powershell
.\script\deploy.ps1
```

**Option 2: Using Command Prompt**
```cmd
script\deploy.bat
```

**Option 3: Using Git Bash**
```bash
bash script/deploy.sh
# Select: 1) Windows (Docker Desktop)
```

### Ubuntu Server (Linux)

```bash
bash script/deploy.sh
# Select: 2) Ubuntu Server (Linux)
```

---

## Deployment Options

After running the script, you'll see these options:

| Option | Description |
|--------|-------------|
| **1** | Start all services (Web, API, PostgreSQL, MongoDB, Redis, Seq) |
| **2** | Start with monitoring (adds Grafana, Prometheus, Loki, cAdvisor) |
| **3** | Stop all services |
| **4** | Stop and remove all (including database volumes) |
| **5** | View live logs |
| **6** | Health check |

---

## Services

### Main Services (Always Available)

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://localhost:5000 | React frontend |
| API | http://localhost:8080 | .NET 8 backend API |
| PostgreSQL | localhost:5432 | Main database |
| MongoDB | localhost:27017 | Image storage (GridFS) |
| Redis | localhost:6379 | Caching layer |
| Seq | http://localhost:8081 | Structured logging |

### Monitoring Stack (Option 2)

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | Metrics dashboard |
| Loki | http://localhost:3100 | Log aggregation |
| cAdvisor | http://localhost:8088 | Container metrics |

**Linux Only (Ubuntu):**
- Node Exporter: http://localhost:9100 (system metrics)
- Promtail: Log collector for Loki

---

## First-Time Setup

1. **Create a `.env` file** in the project root — see [README.md](../README.md#environment-variables) for the full variable list and a template
2. **Run the deployment script** for your platform (it will fail fast if `.env` is missing)
3. **Select Option 1** to start basic services
4. **Select Option 2** if you want monitoring dashboards

### Required Environment Variables

Edit `.env` and update these values:

```bash
# Database passwords (CHANGE THESE!)
POSTGRES_PASSWORD=YourSecurePassword123
MONGO_PASSWORD=YourSecurePassword123
REDIS_PASSWORD=YourSecurePassword123

# JWT Secret (at least 32 characters)
JWT_SECRET_KEY=GenerateARandomSecretKeyHere1234567890

# Grafana (for monitoring)
GRAFANA_ADMIN_PASSWORD=YourGrafanaPassword123
```

---

## Command-Line Usage

### PowerShell (Windows)
```powershell
# Start all services
.\script\deploy.ps1

# Start with monitoring
.\script\deploy.ps1 -Monitoring

# Stop all services
.\script\deploy.ps1 -Stop

# Remove everything (including data)
.\script\deploy.ps1 -Remove

# View logs
.\script\deploy.ps1 -Logs

# Health check
.\script\deploy.ps1 -Health
```

### Bash (Linux / Git Bash)
```bash
# Start all services
bash script/deploy.sh

# Start with monitoring
# (Select option 2 in the interactive menu)
```

### Docker Compose (Direct)
```bash
# Start basic services
docker-compose -f docker-compose.yml up -d

# Start with monitoring (Linux)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Start with monitoring (Windows)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.windows.yml up -d

# Stop all
docker-compose -f docker-compose.yml down

# Remove all (including volumes)
docker-compose -f docker-compose.yml down -v
```

---

## Platform Differences

### Windows (Docker Desktop)
- Uses `docker-compose.monitoring.windows.yml`
- cAdvisor has limited metrics
- Node Exporter and Promtail are disabled (Linux-only)
- All other services work identically

### Ubuntu Server (Linux)
- Uses `docker-compose.monitoring.yml`
- Full monitoring stack available
- Node Exporter provides system metrics
- Promtail collects container logs

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :5000

# Or change the port in .env
WEB_PORT=5001
```

### Services Not Starting
```bash
# Check Docker is running
docker --version
docker-compose version

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart api
```

### Database Connection Errors
```bash
# Check database containers
docker-compose ps postgres mongodb redis

# View database logs
docker-compose logs postgres

# Restart databases
docker-compose restart postgres mongodb redis
```

### Clean Restart
```bash
# Stop and remove everything
docker-compose -f docker-compose.yml down -v

# Start fresh
docker-compose -f docker-compose.yml up -d --build
```

---

## File Structure

```
NewsPortal/
├── docker-compose.yml              # Main services (cross-platform)
├── docker-compose.monitoring.yml   # Monitoring stack (Linux)
├── docker-compose.monitoring.windows.yml  # Monitoring stack (Windows)
├── .env                            # Environment file (you create — see README.md)
├── script/
│   ├── deploy.sh                   # Bash script (Linux / Git Bash)
│   ├── deploy.bat                  # Batch script (Windows CMD)
│   └── deploy.ps1                  # PowerShell script (Windows)
└── monitoring/
    ├── grafana/
    ├── prometheus/
    ├── loki/
    └── promtail/
```

---

## Next Steps

1. **Access the Web UI**: http://localhost:5000
2. **View API docs**: http://localhost:8080 (if Swagger enabled)
3. **Check logs in Seq**: http://localhost:8081
4. **Open Grafana**: http://localhost:3001 (admin/admin123)

For production deployment, see [DEPLOYMENT.md](../DEPLOYMENT.md).
