# News Portal with MCP Server

A news aggregation portal built with ASP.NET Core MVC and MCP (Model Context Protocol) Server for fetching, processing, and displaying news from multiple sources.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [MCP Server Tools](#mcp-server-tools)
- [News Fetching Methods](#news-fetching-methods)
- [Deployment](#deployment)
- [Getting Started](#getting-started)

---

## Architecture Overview

```
                         👤 Users (Browser)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
│                    ASP.NET MVC Web Application                  │
│    Controllers: Home, News, Category, Search, Admin, Image      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│    Services: NewsService, SearchService, ImageService,          │
│              CategoryService, CacheService, McpClientService    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP SERVER LAYER                             │
│    Tools: search_news, fetch_article, download_img, get_rss,    │
│           save_news, get_sources, update_source, scrape_site    │
│                                                                 │
│    Services: WebSearchService, ScrapingService, RssFeedService, │
│              ImageDownloader, ContentExtractor                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                   │
│                                                                 │
│    PostgreSQL          MongoDB            Redis Cache           │
│    ───────────         ───────            ───────────           │
│    • Articles          • Images           • News List Cache     │
│    • Categories        • Thumbnails       • Search Cache        │
│    • Sources           • GridFS           • Category Cache      │
│    • Users                                • Session Data        │
│    • Settings                                                   │
│                                                                 │
│    Port: 5432          Port: 27017        Port: 6379            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│                                                                 │
│    Bing Search    News APIs       RSS Feeds       Target Sites  │
│    API            NewsAPI         ProthomAlo      prothomalo.com│
│                   GNews           BDNews24        bdnews24.com  │
│                   Currents        DailyStar       dailystar.net │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Razor Views | Server-side rendering |
| Bootstrap 5 | UI framework |
| JavaScript/jQuery | Client-side interactivity |
| AJAX | Async data fetching |

### Backend
| Technology | Purpose |
|------------|---------|
| ASP.NET Core 8 MVC | Web application framework |
| .NET 8 Console | MCP Server |
| Entity Framework Core | ORM for PostgreSQL |
| Hangfire | Background job processing |

### Databases
| Database | Purpose | Port |
|----------|---------|------|
| PostgreSQL 15 | Structured data (articles, categories, sources) | 5432 |
| MongoDB 6.0 | Image storage (GridFS) | 27017 |
| Redis | Caching layer | 6379 |

### NuGet Packages
| Package | Purpose |
|---------|---------|
| HtmlAgilityPack | HTML parsing & web scraping |
| CodeHollow.FeedReader | RSS feed reading |
| MongoDB.Driver | MongoDB connectivity |
| Npgsql.EntityFrameworkCore | PostgreSQL EF Core provider |
| StackExchange.Redis | Redis client |
| SixLabors.ImageSharp | Image processing |
| Polly | Retry & resilience patterns |
| Serilog | Structured logging |

### DevOps
| Tool | Purpose |
|------|---------|
| Docker & Docker Compose | Containerization |
| Nginx | Reverse proxy |
| Ubuntu Server | Production OS |
| Git | Version control |

---

## Project Structure

```
NewsPortal/
├── src/
│   ├── NewsPortal.Web/              # ASP.NET MVC Application
│   │   ├── Controllers/
│   │   ├── Views/
│   │   ├── ViewModels/
│   │   ├── wwwroot/
│   │   ├── Program.cs
│   │   └── Dockerfile
│   │
│   ├── NewsPortal.McpServer/        # MCP Server
│   │   ├── Tools/
│   │   ├── Services/
│   │   ├── Handlers/
│   │   └── Program.cs
│   │
│   ├── NewsPortal.Core/             # Shared Models & Interfaces
│   │   ├── Entities/
│   │   ├── DTOs/
│   │   ├── Interfaces/
│   │   └── Constants/
│   │
│   ├── NewsPortal.Application/      # Business Logic
│   │   ├── Services/
│   │   └── Validators/
│   │
│   ├── NewsPortal.Infrastructure/   # Data Access
│   │   ├── Data/
│   │   ├── Repositories/
│   │   ├── MongoDB/
│   │   └── Redis/
│   │
│   └── NewsPortal.BackgroundJobs/   # Scheduled Tasks
│       └── Jobs/
│
├── tests/
├── docker/
├── scripts/
└── NewsPortal.sln
```

---

## Data Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   ASP.NET   │      │    MCP      │      │   External  │
│     MVC     │◄────►│   Server    │◄────►│  News Sites │
│  (Frontend) │      │ (Middleware)│      │ (Data Source│
└─────────────┘      └─────────────┘      └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────┐
│         PostgreSQL Database         │
│      (News Cache & Settings)        │
└─────────────────────────────────────┘
```

### Flow Description

1. **User Request** → User accesses the web portal
2. **Controller** → MVC controller receives the request
3. **Application Service** → Business logic processes the request
4. **Cache Check** → Redis cache is checked for existing data
5. **MCP Server** → If cache miss, MCP Server fetches from external sources
6. **Data Storage** → Articles saved to PostgreSQL, images to MongoDB
7. **Response** → Data returned to user through the view layer

---

## Database Schema

### PostgreSQL Tables

#### news_articles
| Column | Type | Description |
|--------|------|-------------|
| id | PK | Primary key |
| title | VARCHAR | Article title |
| slug | VARCHAR | URL-friendly slug |
| content | TEXT | Full article content |
| summary | TEXT | Article summary |
| plain_text | TEXT | Plain text content |
| source_id | FK | Reference to news_sources |
| category_id | FK | Reference to categories |
| source_url | VARCHAR | Original article URL |
| original_image_url | VARCHAR | Original image URL |
| mongo_image_id | VARCHAR | MongoDB GridFS image ID |
| mongo_thumb_id | VARCHAR | MongoDB GridFS thumbnail ID |
| author | VARCHAR | Article author |
| published_at | TIMESTAMP | Publication date |
| fetched_at | TIMESTAMP | Fetch timestamp |
| view_count | INT | View counter |
| is_featured | BOOLEAN | Featured flag |
| is_active | BOOLEAN | Active status |

#### news_sources
| Column | Type | Description |
|--------|------|-------------|
| id | PK | Primary key |
| name | VARCHAR | Source name |
| slug | VARCHAR | URL-friendly slug |
| base_url | VARCHAR | Source base URL |
| logo_url | VARCHAR | Source logo URL |
| fetch_method | ENUM | rss/api/scrape |
| rss_feed_url | VARCHAR | RSS feed URL |
| api_endpoint | VARCHAR | API endpoint |
| api_key | VARCHAR | API key (encrypted) |
| is_active | BOOLEAN | Active status |
| fetch_interval | INT | Fetch interval in minutes |
| last_fetched_at | TIMESTAMP | Last fetch timestamp |

#### scraping_configs
| Column | Type | Description |
|--------|------|-------------|
| id | PK | Primary key |
| source_id | FK | Reference to news_sources |
| list_page_url | VARCHAR | List page URL |
| article_selector | VARCHAR | CSS selector for articles |
| title_selector | VARCHAR | CSS selector for title |
| content_selector | VARCHAR | CSS selector for content |
| image_selector | VARCHAR | CSS selector for image |
| date_selector | VARCHAR | CSS selector for date |
| author_selector | VARCHAR | CSS selector for author |

#### categories
| Column | Type | Description |
|--------|------|-------------|
| id | PK | Primary key |
| name | VARCHAR | Category name (English) |
| name_bn | VARCHAR | Category name (Bengali) |
| slug | VARCHAR | URL-friendly slug |
| description | TEXT | Category description |
| icon | VARCHAR | Icon class/path |
| color | VARCHAR | Theme color |
| sort_order | INT | Display order |
| is_active | BOOLEAN | Active status |

### MongoDB Schema (GridFS)

```json
// fs.files collection
{
  "_id": "ObjectId",
  "filename": "news_20250112_abc.jpg",
  "contentType": "image/jpeg",
  "length": 245678,
  "uploadDate": "ISODate",
  "metadata": {
    "type": "original|thumbnail",
    "postgresNewsId": 12345,
    "originalUrl": "https://...",
    "width": 1200,
    "height": 800,
    "thumbnailId": "ObjectId"
  }
}
```

---

## MCP Server Tools

| Tool | Input | Output | Description |
|------|-------|--------|-------------|
| `search_web_news` | query, language, country, freshness, count | List of news articles | Search news from web |
| `fetch_full_article` | url, extract_images | title, content, images | Fetch complete article |
| `search_and_save_news` | query, category, save_images | Saved article IDs | Search, fetch, and save |
| `get_rss` | feed_url | List of articles | Parse RSS feed |
| `download_img` | image_url, article_id | MongoDB ID | Download and store image |
| `get_sources` | - | List of sources | Get all news sources |
| `update_source` | source_id, config | Updated source | Update source config |
| `scrape_site` | url, selectors | Extracted data | Scrape website |

---

## News Fetching Methods

### 1. RSS Feeds (Recommended)
- **Pros**: Legal, structured data, stable
- **Example Sources**:
  - Prothom Alo: `prothomalo.com/feed`
  - BD News 24: `bdnews24.com/rss/rss.xml`
  - Daily Star: `thedailystar.net/rss.xml`
  - Kaler Kantho: `kalerkantho.com/rss.xml`

### 2. News APIs
| API | Free Tier |
|-----|-----------|
| NewsAPI.org | 100 requests/day |
| GNews API | 100 requests/day |
| Currents API | Free tier available |

### 3. Web Scraping
- Use HtmlAgilityPack for HTML parsing
- Respect `robots.txt`
- Implement rate limiting

### Legal Guidelines
✅ **Allowed**:
- RSS Feed usage
- Public API usage
- Following robots.txt
- Providing attribution
- Sharing summary & link

❌ **Not Allowed**:
- Copying full articles
- Copyright infringement
- Server overloading
- Bypassing paywalls

---

## Deployment

### Memory Requirements (4GB Server)

| Component | Memory |
|-----------|--------|
| OS & System | ~800MB |
| PostgreSQL | 512MB |
| MongoDB | 512MB |
| Redis | 128MB |
| .NET Web App | 512MB |
| .NET MCP Server | 256MB |
| Nginx | 50MB |
| Buffer/Swap | ~700MB |
| **Total** | ~3.5GB + Swap |

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: newsportal-db
    restart: always
    environment:
      POSTGRES_USER: newsadmin
      POSTGRES_PASSWORD: YourSecurePassword123
      POSTGRES_DB: newsportal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    deploy:
      resources:
        limits:
          memory: 512M

  mongodb:
    image: mongo:4.4
    container_name: newsportal-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: mongouser
      MONGO_INITDB_ROOT_PASSWORD: MongoPassword123
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    deploy:
      resources:
        limits:
          memory: 512M

  redis:
    image: redis:alpine
    container_name: newsportal-cache
    restart: always
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 128M

volumes:
  postgres_data:
  mongodb_data:
```

### Firewall Configuration

```bash
sudo ufw allow ssh
sudo ufw allow 5432/tcp    # PostgreSQL
sudo ufw allow 27017/tcp   # MongoDB
sudo ufw allow 6379/tcp    # Redis
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 5000/tcp    # Application
```

---

## Getting Started

### Prerequisites

- .NET 8 SDK
- Docker & Docker Compose
- PostgreSQL 15
- MongoDB 6.0
- Redis

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/NewsPortal.git
   cd NewsPortal
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

3. **Apply database migrations**
   ```bash
   cd src/NewsPortal.Web
   dotnet ef database update
   ```

4. **Run the MCP Server**
   ```bash
   cd src/NewsPortal.McpServer
   dotnet run
   ```

5. **Run the Web Application**
   ```bash
   cd src/NewsPortal.Web
   dotnet run
   ```

6. **Access the portal**
   ```
   http://localhost:5000
   ```

### Configuration

Update `appsettings.json` with your connection strings:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;Database=newsportal;Username=newsadmin;Password=YourSecurePassword123",
    "MongoDB": "mongodb://mongouser:MongoPassword123@localhost:27017",
    "Redis": "localhost:6379"
  }
}
```

---

## License

This project is licensed under the MIT License.

---

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.
# news-portal
