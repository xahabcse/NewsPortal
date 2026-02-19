# GitHub Actions Secrets — Required Configuration

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** and add the following secrets.

## Server SSH Access

| Secret | Description | Example |
|--------|-------------|---------|
| `SSH_PRIVATE_KEY` | SSH private key for server access | (contents of `~/.ssh/newsportal-deploy`) |
| `SERVER_HOST` | Production server IP or hostname | `192.168.1.100` |
| `SERVER_USER` | SSH username on the server | `ubuntu` |

### Generating the SSH Key

```bash
# Generate a dedicated deploy key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/newsportal-deploy -N ""

# Copy public key to server
ssh-copy-id -i ~/.ssh/newsportal-deploy.pub ubuntu@your-server-ip

# Copy the private key content to the SSH_PRIVATE_KEY secret
cat ~/.ssh/newsportal-deploy
```

## Database Credentials

| Secret | Description | Example |
|--------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `newsadmin` |
| `POSTGRES_PASSWORD` | PostgreSQL password (strong!) | `S3cureP@ssw0rd!2024` |
| `POSTGRES_DB` | PostgreSQL database name | `newsportal` |
| `MONGO_USER` | MongoDB username | `mongouser` |
| `MONGO_PASSWORD` | MongoDB password (strong!) | `M0ng0P@ssw0rd!2024` |
| `REDIS_PASSWORD` | Redis password (strong!) | `R3d1sP@ssw0rd!2024` |

## Application Configuration

| Secret | Description | Example |
|--------|-------------|---------|
| `JWT_SECRET_KEY` | JWT signing key (32+ chars) | (generate with `openssl rand -base64 48`) |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `https://yourdomain.com` |

## Optional: External API Keys

| Secret | Description | Example |
|--------|-------------|---------|
| `NEWS_API_KEY` | NewsAPI.org API key | `abc123...` |
| `GNEWS_API_KEY` | GNews.io API key | `def456...` |
| `BING_SEARCH_API_KEY` | Bing Search API key | `ghi789...` |

## Automatic Secrets (No Configuration Needed)

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions — used for GHCR login |

## Checklist

Before your first deployment, verify all required secrets are set:

- [ ] `SSH_PRIVATE_KEY`
- [ ] `SERVER_HOST`
- [ ] `SERVER_USER`
- [ ] `POSTGRES_USER`
- [ ] `POSTGRES_PASSWORD`
- [ ] `POSTGRES_DB`
- [ ] `MONGO_USER`
- [ ] `MONGO_PASSWORD`
- [ ] `REDIS_PASSWORD`
- [ ] `JWT_SECRET_KEY`
- [ ] `CORS_ALLOWED_ORIGINS`
