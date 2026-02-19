# Reliable News Sources for NewsPortal

This document lists vetted, reliable news sources organized by category with actual RSS feed URLs, API availability, and integration notes for the NewsPortal system.

---

## Current State

**8 sources already seeded** (all Bangladeshi, all RSS):

| Source | RSS URL | Status |
| ------ | ------- | ------ |
| Prothom Alo | `https://www.prothomalo.com/feed` | Active |
| bdnews24 | `https://bdnews24.com/topic/rss` | Active |
| Bangla Tribune | `https://www.banglatribune.com/feed` | Active |
| Jagonews24 | `https://www.jagonews24.com/rss` | Active |
| Sun News Bangladesh | `https://en.sunnews24x7.com/rss` | Active |
| BSS | `https://www.bssnews.net/rss` | Active |
| The Dhaka Post | `https://www.thedhakapost.com/rss.xml` | Active |
| Daily Star | `https://www.thedailystar.net/rss` | Active |

---

## How to Add a New Source

### Via API (Admin/Editor)

```
POST /api/v1/newssources
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "BBC News",
  "baseUrl": "https://www.bbc.com/news",
  "rssFeedUrl": "https://feeds.bbci.co.uk/news/rss.xml",
  "fetchMethod": 1,
  "fetchIntervalMinutes": 30,
  "requestTimeoutSeconds": 90,
  "maxRetryAttempts": 3,
  "circuitBreakerThreshold": 5,
  "categoryId": <category_id>
}
```

**FetchMethod values:** `1` = RSS, `2` = API, `3` = Scrape

### Via Database Seed

Add to `SeedData.cs` following the existing pattern. The seed runs on first migration.

---

## Tier 1: Highly Reliable RSS Sources (Recommended)

These sources have stable, well-maintained RSS feeds that update multiple times daily. They provide title, description, publish date, and thumbnail images.

### International News

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| BBC News - World | `https://feeds.bbci.co.uk/news/world/rss.xml` | RSS 2.0 | World | Every few min | Extremely stable. Includes `<media:thumbnail>`. |
| BBC News - Asia | `https://feeds.bbci.co.uk/news/world/asia/rss.xml` | RSS 2.0 | World | Hourly | Regional focus relevant to BD audience. |
| BBC News - Top | `https://feeds.bbci.co.uk/news/rss.xml` | RSS 2.0 | General | Every few min | Main headline feed. |
| Al Jazeera - All | `https://www.aljazeera.com/xml/rss/all.xml` | RSS 2.0 | World | Hourly | Good international coverage. |
| Al Jazeera - Economy | `https://www.aljazeera.com/xml/rss/economy.xml` | RSS 2.0 | Business | Several/day | Economic news focus. |
| The Guardian - World | `https://www.theguardian.com/world/rss` | RSS 2.0 | World | Every few min | Also has free API (see API section). |
| NPR - Top Stories | `https://feeds.npr.org/1001/rss.xml` | RSS 2.0 | General | Hourly | US public media, high quality. |
| NPR - World | `https://feeds.npr.org/1004/rss.xml` | RSS 2.0 | World | Several/day | International focus. |
| Dawn (Pakistan) | `https://www.dawn.com/feeds/home` | RSS 2.0 | World | Hourly | Pakistan's leading English paper. Excellent RSS. |
| Dawn - World | `https://www.dawn.com/feeds/world` | RSS 2.0 | World | Several/day | International coverage. |

### Technology

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| TechCrunch | `https://techcrunch.com/feed/` | RSS 2.0 | Technology | Every hour | WordPress feed, very stable. Full descriptions. |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` | RSS 2.0 | Technology | Several/day | In-depth tech articles. |
| The Verge | `https://www.theverge.com/rss/index.xml` | Atom | Technology | Hourly | Full content in feed. Use Atom parser. |
| Hacker News | `https://news.ycombinator.com/rss` | RSS 2.0 | Technology | Continuous | Community-curated tech links. |
| Hacker News (100+ pts) | `https://hnrss.org/frontpage?points=100` | RSS 2.0 | Technology | Several/day | Filtered for popular stories only. |
| Wired | `https://www.wired.com/feed/rss` | RSS 2.0 | Technology | Several/day | Includes summaries and thumbnails. |
| Engadget | `https://www.engadget.com/rss.xml` | RSS 2.0 | Technology | Hourly | Consumer tech focus. |

### Business & Finance

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| CNBC - Top News | `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114` | RSS 2.0 | Business | Every few min | Official CNBC RSS. Very stable. |
| CNBC - World | `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362` | RSS 2.0 | Business | Hourly | International business. |
| CNBC - Technology | `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910` | RSS 2.0 | Technology | Several/day | Tech business focus. |
| MarketWatch - Top | `https://feeds.marketwatch.com/marketwatch/topstories/` | RSS 2.0 | Business | Hourly | Dow Jones-owned. Stable. |
| Bloomberg - Markets | `https://feeds.bloomberg.com/markets/news.rss` | RSS 2.0 | Business | Several/day | Headlines + short summary only (paywalled). |

### Science

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| ScienceDaily - All | `https://www.sciencedaily.com/rss/all.xml` | RSS 2.0 | Science | Several/day | 400+ topic feeds available. Excellent. |
| ScienceDaily - Top | `https://www.sciencedaily.com/rss/top/science.xml` | RSS 2.0 | Science | Daily | Curated top stories. |
| NASA - Breaking | `https://www.nasa.gov/rss/dyn/breaking_news.rss` | RSS 2.0 | Science | Weekly+ | Government-maintained. Very reliable. |
| Nature - News | `https://www.nature.com/news.rss` | RSS 2.0 | Science | Daily | Peer-reviewed. High authority. |

### Sports

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| BBC Sport | `https://feeds.bbci.co.uk/sport/rss.xml` | RSS 2.0 | Sports | Hourly | Same excellent BBC infrastructure. |
| BBC Sport - Cricket | `https://feeds.bbci.co.uk/sport/cricket/rss.xml` | RSS 2.0 | Sports | Daily | Relevant for BD audience. |
| BBC Sport - Football | `https://feeds.bbci.co.uk/sport/football/rss.xml` | RSS 2.0 | Sports | Hourly | Most popular sport globally. |
| ESPN - Top | `https://www.espn.com/espn/rss/news` | RSS 2.0 | Sports | Hourly | US-centric but broad coverage. |
| ESPNcricinfo | `https://www.espncricinfo.com/rss/content/story/feeds/0.xml` | RSS 2.0 | Sports | Daily | Cricket-focused. Very relevant for BD. |

### Entertainment

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| Variety | `https://variety.com/feed/` | RSS 2.0 | Entertainment | Hourly | WordPress, stable. Hollywood focus. |
| Hollywood Reporter | `https://www.hollywoodreporter.com/feed/` | RSS 2.0 | Entertainment | Hourly | Movies, TV, music. |

### Bangladesh (Additional)

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| Prothom Alo (English) | `https://en.prothomalo.com/feed/` | RSS 2.0 | Bangladesh | Several/day | English edition separate from Bangla. |
| Daily Star - Bangladesh | `https://www.thedailystar.net/news/bangladesh/rss.xml` | RSS 2.0 | Bangladesh | Several/day | Bangladesh-specific news. |
| Daily Star (Bangla) | `https://bangla.thedailystar.net/rss` | RSS 2.0 | Bangladesh | Several/day | Bangla edition. |
| Jugantor | `https://www.jugantor.com/feed/rss.xml` | RSS 2.0 | Bangladesh | Several/day | Bangla daily. |
| Kaler Kantho | `https://www.kalerkantho.com/feed/rss.xml` | RSS 2.0 | Bangladesh | Several/day | Bangla daily. |
| The Business Standard | `https://www.tbsnews.net/tbs-rss` | RSS 2.0 | Business | Several/day | Bangladesh business news in English. |

### Indian Subcontinent

| Source | Feed URL | Format | Category | Update Freq | Notes |
| ------ | -------- | ------ | -------- | ----------- | ----- |
| NDTV - Latest | `https://feeds.feedburner.com/NDTV-LatestNews` | RSS 2.0 | World | Every few min | India's leading news channel. |
| NDTV - World | `https://feeds.feedburner.com/ndtvnews-world-news` | RSS 2.0 | World | Hourly | International news. |
| The Hindu | `https://www.thehindu.com/feeder/default.rss` | RSS 2.0 | World | Hourly | India's most respected newspaper. |
| The Hindu - International | `https://www.thehindu.com/news/international/feeder/default.rss` | RSS 2.0 | World | Several/day | Global coverage. |
| Indian Express | `https://indianexpress.com/feed/` | RSS 2.0 | World | Hourly | WordPress-based, stable. |
| Dawn - Pakistan | `https://www.dawn.com/feeds/latest-news` | RSS 2.0 | World | Hourly | Latest news from Pakistan. |

---

## Tier 2: Working but with Caveats

These sources have RSS feeds that work but have limitations (truncated content, non-standard URLs, or less predictable stability).

| Source | Feed URL | Issue | Workaround |
| ------ | -------- | ----- | ---------- |
| Financial Times | `https://www.ft.com/rss/home` | Paywalled, headlines only | Use for headlines; scrape summary if allowed |
| Bloomberg | `https://feeds.bloomberg.com/markets/news.rss` | Truncated summaries | Accept short descriptions |
| Dhaka Tribune | `https://www.dhakatribune.com/bangladesh/rss.xml` | Limited feed coverage | May need scraping for full categories |
| bdnews24 | `https://bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true` | Non-standard URL format | Already seeded; monitor for URL changes |
| Yahoo Finance | `https://finance.yahoo.com/news/rssindex` | Variable stability | Use CNBC as primary business source |

---

## Tier 3: No RSS — Need API or Scraping

| Source | Method | URL / Config | Notes |
| ------ | ------ | ------------ | ----- |
| Reuters | Scrape or RSSHub | `https://rsshub.app/reuters/world` (3rd party) | Officially discontinued RSS in 2020. RSSHub is community-maintained. |
| AP News | Scrape or RSSHub | `https://rsshub.app/apnews/topics/ap-top-news` (3rd party) | No official RSS. Unofficial `.rss` suffix may work: `https://apnews.com/world-news.rss` |

---

## Free News APIs

These APIs aggregate from multiple sources and can supplement direct RSS feeds. Use `FetchMethod.Api (2)` for these.

| API | Free Tier | Rate Limit | URL | Notes |
| --- | --------- | ---------- | --- | ----- |
| The Guardian Open Platform | 5,000 calls/day | 12/sec | `https://content.guardianapis.com/search?api-key=YOUR_KEY` | Excellent structured JSON. Free API key at `https://bonobo.capi.gutools.co.uk/register/developer` |
| Hacker News Firebase API | Unlimited | No limit | `https://hacker-news.firebaseio.com/v0/topstories.json` | Returns story IDs; fetch each at `/v0/item/{id}.json`. No auth needed. |
| NASA APIs | 1,000 req/hour | Per key | `https://api.nasa.gov/planetary/apod?api_key=YOUR_KEY` | Free key at `https://api.nasa.gov/`. Multiple endpoints (APOD, Mars Rover, etc.) |
| NewsAPI.org | 100 req/day | 100/day | `https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_KEY` | Dev-only on free plan. NOT for production without paid plan. Good for testing. |
| GNews.io | 100 req/day | 100/day | `https://gnews.io/api/v4/top-headlines?token=YOUR_KEY&lang=en` | 60,000+ sources. Good for supplemental data. |
| NewsData.io | 200 credits/day | 200/day | `https://newsdata.io/api/1/news?apikey=YOUR_KEY&country=bd` | Supports Bangladesh (`bd`) country filter. 80+ languages. |

---

## Recommended Source Addition Plan

### Phase 1: Quick Wins (RSS only, add immediately)

Add these 15 high-reliability RSS sources to expand coverage beyond Bangladesh:

```
1. BBC News - World          (World)
2. BBC News - Asia           (World)
3. Al Jazeera - All          (World)
4. The Guardian - World      (World)
5. TechCrunch                (Technology)
6. Ars Technica              (Technology)
7. Hacker News (100+ pts)    (Technology)
8. CNBC - Top News           (Business)
9. ScienceDaily - All        (Science)
10. BBC Sport - Cricket      (Sports)
11. ESPN - Top               (Sports)
12. Variety                  (Entertainment)
13. NDTV - Latest            (World)
14. Dawn - Home              (World)
15. Prothom Alo (English)    (Bangladesh)
```

**Estimated result:** 23 total sources across 7 categories.

### Phase 2: API Integration

Implement `FetchFromApiAsync` in `NewsFetcherService` to support:

1. The Guardian Open Platform API (structured JSON, free)
2. Hacker News Firebase API (unlimited, no auth)
3. NASA APIs (free key, 1,000 req/hr)

### Phase 3: Expand by Category

Add remaining Tier 1 sources to fill gaps:

- Business: MarketWatch, Bloomberg
- Science: NASA, Nature
- Entertainment: Hollywood Reporter
- Bangladesh: Jugantor, Kaler Kantho, The Business Standard
- Subcontinent: The Hindu, Indian Express

**Target:** 40+ sources across 8+ categories.

### Phase 4: Scraping Sources

Configure `ScrapingConfig` for high-value sources without RSS:

- Reuters (via list page scraping)
- AP News (via list page scraping)

---

## Source Configuration Best Practices

### Fetch Intervals

| Source Type | Recommended Interval | Rationale |
| ----------- | -------------------- | --------- |
| Breaking news (BBC, CNBC, NDTV) | 15 minutes | High-frequency updates |
| Daily news (newspapers) | 30 minutes | Standard update cycle |
| Technology blogs | 30-60 minutes | Posts published throughout day |
| Science journals | 60-120 minutes | Lower frequency, high quality |
| Weekly/digest sources | 360 minutes | Infrequent updates |

### Timeout Configuration

| Source Location | Recommended Timeout | Notes |
| --------------- | ------------------- | ----- |
| Local/regional (BD) | 90 seconds | May have slower servers |
| International (BBC, CNBC) | 30 seconds | Fast CDN-backed servers |
| API endpoints | 15 seconds | Should be very fast |

### Circuit Breaker Settings

| Source Reliability | Threshold | Max Retries | Notes |
| ------------------ | --------- | ----------- | ----- |
| Tier 1 (very stable) | 5 failures | 3 | Standard defaults |
| Tier 2 (some issues) | 3 failures | 2 | Pause sooner to avoid noise |
| Tier 3 (scraping) | 2 failures | 1 | Sites change frequently |

---

## MCP Server Improvement Recommendations

### Current Limitations Found

1. **API fetching not implemented** — `FetchFromApiAsync()` returns empty list.
2. **Single Hangfire worker** — only 1 worker thread processes all jobs sequentially.
3. **No JavaScript rendering** — scraping uses static HTML only (HtmlAgilityPack).
4. **No user-agent rotation** — fixed Mozilla UA for all requests.
5. **No proxy support** — all requests from same IP.
6. **No per-source rate limiting** — could overwhelm or get blocked by sources.
7. **No webhook/push support** — polling only.

### Recommended Improvements

#### Priority 1: Implement API Fetching

`FetchFromApiAsync` in `NewsFetcherService.cs` currently returns empty. Implement for:

- Guardian API: JSON response with `title`, `webPublicationDate`, `fields.thumbnail`, `fields.trailText`
- Hacker News API: Fetch top story IDs, then individual items
- Generic JSON API support with configurable field mappings

#### Priority 2: Increase Worker Count

Current: `WorkerCount = 1`. With 23+ sources fetching every 15-30 min, jobs will queue up.

Recommended: `WorkerCount = 3` for up to 30 sources, `WorkerCount = 5` for 50+.

#### Priority 3: Add Request Delays Between Sources

Add 1-2 second delay between consecutive fetches to the same domain to avoid rate limiting.

#### Priority 4: User-Agent Rotation

Rotate between 5-10 common browser user-agents to reduce detection when scraping.

#### Priority 5: Implement Per-Source Fetch Scheduling

Current: All sources fetched every 15 min via single `FetchAllSourcesAsync`.

Better: Use per-source Hangfire recurring jobs with individual intervals:

```csharp
foreach (var source in activeSources)
{
    recurringJobManager.AddOrUpdate<INewsFetchJob>(
        $"fetch-source-{source.Id}",
        job => job.FetchSourceAsync(source.Id),
        $"*/{source.FetchIntervalMinutes} * * * *");
}
```

#### Priority 6: Add Feed Validation on Source Creation

Before saving a new source, validate:

- RSS URL returns valid XML with at least 1 item
- API endpoint returns expected JSON structure
- Scraping selectors extract at least 1 article

The `POST /api/v1/newssources/test` endpoint exists but should be **mandatory** before activation.
