# Quick Start Guide - Deploy in 5 Minutes

This guide will get your News Portal running on your Linux server in just a few steps.

## Prerequisites

Your Linux server needs:
- Docker
- Docker Compose
- Git
- 4GB RAM minimum

## Installation Steps

### Step 1: Install Docker (if not installed)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and back in, then test
docker --version
```

### Step 2: Clone and Deploy

```bash
# Clone the repository
git clone <your-repo-url>
cd NewsPortal

# Make deploy script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

The script will:
1. Check for Docker installation
2. Create `.env` file from template
3. Ask you to set passwords (IMPORTANT!)
4. Create necessary directories
5. Start all services

### Step 3: Configure Passwords

When prompted, edit the `.env` file and change:
- `POSTGRES_PASSWORD` - Change from default
- `MONGO_PASSWORD` - Change from default

```bash
nano .env
# Change the passwords, then save (Ctrl+X, Y, Enter)
```

### Step 4: Access the Application

Once deployed, open your browser:
```
http://your-server-ip:5000
```

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# 1. Clone repository
git clone <your-repo-url>
cd NewsPortal

# 2. Create environment file
cp .env.example .env
nano .env  # Edit and change passwords

# 3. Create directories
mkdir -p logs/web logs/mcp
chmod -R 755 logs

# 4. Start services
docker compose up -d

# 5. Check status
docker compose ps
```

## Verify Deployment

Check if all services are running:

```bash
docker compose ps
```

You should see 5 services all in "Up" state:
- `newsportal-db` (PostgreSQL)
- `newsportal-mongodb` (MongoDB)
- `newsportal-cache` (Redis)
- `newsportal-web` (Web Application)
- `newsportal-mcp` (MCP Server)

## View Logs

```bash
# All services
docker compose logs -f

# Just the web app
docker compose logs -f web
```

## Common Commands

```bash
# Stop all services
docker compose down

# Restart all services
docker compose restart

# Update after code changes
git pull
docker compose up -d --build

# View service status
docker compose ps

# View resource usage
docker stats
```

## Troubleshooting

### Services won't start?
```bash
docker compose logs
```

### Can't access the website?
1. Check firewall: `sudo ufw allow 5000/tcp`
2. Check if web is running: `docker compose ps web`
3. Check logs: `docker compose logs web`

### Out of memory?
```bash
# Check available memory
free -h

# If low, add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Database connection errors?
```bash
# Restart all services
docker compose restart

# Check database is healthy
docker compose ps postgres
```

## Next Steps

- Configure firewall for security
- Set up SSL/TLS with Let's Encrypt
- Configure reverse proxy (Nginx)
- Set up automated backups
- Review full [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

## Production Checklist

Before going live:

- [ ] Changed all default passwords in `.env`
- [ ] Configured firewall (`ufw` or `iptables`)
- [ ] Set up SSL certificate
- [ ] Configured reverse proxy
- [ ] Set up automated backups
- [ ] Tested backup restoration
- [ ] Configured monitoring
- [ ] Reviewed security settings

## Support

For detailed information, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [README.md](README.md) - Project documentation

## Quick Reference

```bash
# Deploy for first time
git clone <repo> && cd NewsPortal && ./deploy.sh

# Update application
git pull && docker compose up -d --build

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Complete reset (removes all data!)
docker compose down -v
```
