# News Portal - Docker Deployment Guide

This guide explains how to deploy the News Portal application using Docker on your Linux server.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker Engine installed
- Docker Compose installed
- Git installed
- Minimum 4GB RAM, 20GB disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd NewsPortal
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit the `.env` file and update with your secure credentials:

```bash
nano .env
```

**Important:** Change these default passwords!
- `POSTGRES_PASSWORD`
- `MONGO_PASSWORD`

### 3. Create Required Directories

```bash
mkdir -p logs/web logs/mcp
chmod -R 755 logs
```

### 4. Start the Application

```bash
docker compose up -d
```

This will:
- Pull all required images
- Build the .NET applications
- Start all services (PostgreSQL, MongoDB, Redis, Web, MCP Server)
- Apply database migrations automatically

### 5. Check Status

```bash
docker compose ps
```

All services should show as "Up" and "healthy".

### 6. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f mcpserver
docker compose logs -f postgres
```

### 7. Access the Application

Open your browser and navigate to:
```
http://your-server-ip:5000
```

Or if you set a custom port in `.env`:
```
http://your-server-ip:${WEB_PORT}
```

## Management Commands

### Stop All Services

```bash
docker compose down
```

### Stop and Remove All Data (⚠️ Destructive)

```bash
docker compose down -v
```

### Restart Services

```bash
docker compose restart
```

### Rebuild After Code Changes

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

### View Resource Usage

```bash
docker stats
```

### Access Database

```bash
# PostgreSQL
docker exec -it newsportal-db psql -U newsadmin -d newsportal

# MongoDB
docker exec -it newsportal-mongodb mongosh -u mongouser -p
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Application environment | Production |
| `POSTGRES_USER` | PostgreSQL username | newsadmin |
| `POSTGRES_PASSWORD` | PostgreSQL password | (change this!) |
| `POSTGRES_DB` | PostgreSQL database name | newsportal |
| `POSTGRES_PORT` | PostgreSQL port | 5432 |
| `MONGO_USER` | MongoDB username | mongouser |
| `MONGO_PASSWORD` | MongoDB password | (change this!) |
| `MONGO_PORT` | MongoDB port | 27017 |
| `REDIS_PORT` | Redis port | 6379 |
| `WEB_PORT` | Web application port | 5000 |

## Port Mapping

| Service | Internal Port | External Port (default) |
|---------|---------------|-------------------------|
| Web Application | 8080 | 5000 |
| PostgreSQL | 5432 | 5432 |
| MongoDB | 27017 | 27017 |
| Redis | 6379 | 6379 |

## Data Persistence

All data is stored in Docker volumes:

- `postgres_data`: PostgreSQL database files
- `mongodb_data`: MongoDB database files
- `mongodb_config`: MongoDB configuration
- `redis_data`: Redis persistence files

These volumes persist even after containers are stopped or removed (unless you use `docker compose down -v`).

## Security Recommendations

### 1. Change Default Passwords

Update all passwords in the `.env` file before deploying to production.

### 2. Firewall Configuration

```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS (if using reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port
sudo ufw allow 5000/tcp

# Block direct database access from internet (optional)
# Only allow from localhost or specific IPs
sudo ufw deny 5432/tcp
sudo ufw deny 27017/tcp
sudo ufw deny 6379/tcp

# Enable firewall
sudo ufw enable
```

### 3. Use Reverse Proxy (Recommended)

For production, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Enable HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs [service-name]

# Check container status
docker compose ps
```

### Database Connection Errors

1. Ensure PostgreSQL is healthy:
   ```bash
   docker compose ps postgres
   ```

2. Check connection string in `.env`

3. Restart services:
   ```bash
   docker compose restart
   ```

### Out of Memory

1. Check available memory:
   ```bash
   free -h
   ```

2. Adjust memory limits in `docker-compose.yml` if needed

3. Enable swap:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Permission Errors

```bash
# Fix log directory permissions
sudo chown -R $(whoami):$(whoami) logs/
chmod -R 755 logs/
```

## Backup & Restore

### Backup

```bash
# Create backup directory
mkdir -p backups

# Backup PostgreSQL
docker exec newsportal-db pg_dump -U newsadmin newsportal > backups/postgres_$(date +%Y%m%d).sql

# Backup MongoDB
docker exec newsportal-mongodb mongodump --username mongouser --password MongoPassword123 --authenticationDatabase admin --out /tmp/mongo_backup
docker cp newsportal-mongodb:/tmp/mongo_backup backups/mongodb_$(date +%Y%m%d)
```

### Restore

```bash
# Restore PostgreSQL
cat backups/postgres_20250122.sql | docker exec -i newsportal-db psql -U newsadmin newsportal

# Restore MongoDB
docker cp backups/mongodb_20250122 newsportal-mongodb:/tmp/mongo_restore
docker exec newsportal-mongodb mongorestore --username mongouser --password MongoPassword123 --authenticationDatabase admin /tmp/mongo_restore
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml` to add PostgreSQL performance settings:

```yaml
postgres:
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Redis

Redis is already configured with:
- Max memory: 100MB
- Eviction policy: allkeys-lru (Least Recently Used)

### Application

Monitor resource usage:
```bash
docker stats
```

Adjust memory limits in `docker-compose.yml` as needed.

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose build

# Restart with new images
docker compose up -d

# Clean up old images
docker image prune -f
```

## Monitoring

### Health Checks

All services have health checks configured. Check status:

```bash
docker compose ps
```

### Logs

Application logs are stored in:
- `./logs/web/` - Web application logs
- `./logs/mcp/` - MCP Server logs

View real-time logs:
```bash
tail -f logs/web/web-*.log
tail -f logs/mcp/mcp-server-*.log
```

## Scaling

To run multiple web instances:

```bash
docker compose up -d --scale web=3
```

Note: You'll need a load balancer (like Nginx) in front for this to work properly.

## Support

For issues or questions:
1. Check the logs: `docker compose logs`
2. Review this documentation
3. Check the main [README.md](README.md)
4. Open an issue on GitHub

## Quick Reference

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart [service-name]

# Rebuild after code changes
docker compose up -d --build

# Check status
docker compose ps

# Access shell in container
docker compose exec web bash
docker compose exec postgres psql -U newsadmin newsportal

# Remove all (including volumes)
docker compose down -v
```
