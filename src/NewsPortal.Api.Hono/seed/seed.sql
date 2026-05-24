-- ============================================================================
-- NewsPortal D1 Seed Data
-- ----------------------------------------------------------------------------
-- Idempotent seed for categories and news sources.
-- Users are NOT seeded here — bcrypt hashes must be generated; run the
-- `scripts/bootstrap-users.ts` helper after deploy, or register via the API
-- and update the role manually in D1.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Categories (10) — matches SeedData.cs in the legacy .NET stack
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO categories (name, name_bn, slug, icon, color, sort_order, created_at, is_active) VALUES
('National',       'জাতীয়',         'national',       'bi-flag',         '#dc3545',  1, '2026-05-24T00:00:00Z', 1),
('International',  'আন্তর্জাতিক',     'international',  'bi-globe',        '#0d6efd',  2, '2026-05-24T00:00:00Z', 1),
('Politics',       'রাজনীতি',        'politics',       'bi-bank',         '#6f42c1',  3, '2026-05-24T00:00:00Z', 1),
('Business',       'ব্যবসা',          'business',       'bi-graph-up',     '#198754',  4, '2026-05-24T00:00:00Z', 1),
('Technology',     'প্রযুক্তি',        'technology',     'bi-cpu',          '#0dcaf0',  5, '2026-05-24T00:00:00Z', 1),
('Sports',         'খেলাধুলা',        'sports',         'bi-trophy',       '#ffc107',  6, '2026-05-24T00:00:00Z', 1),
('Entertainment',  'বিনোদন',         'entertainment',  'bi-film',         '#d63384',  7, '2026-05-24T00:00:00Z', 1),
('Health',         'স্বাস্থ্য',        'health',         'bi-heart-pulse',  '#20c997',  8, '2026-05-24T00:00:00Z', 1),
('Education',      'শিক্ষা',         'education',      'bi-mortarboard',  '#fd7e14',  9, '2026-05-24T00:00:00Z', 1),
('Opinion',        'মতামত',         'opinion',        'bi-chat-quote',   '#6c757d', 10, '2026-05-24T00:00:00Z', 1);


-- ----------------------------------------------------------------------------
-- News Sources (11) — same set as legacy SeedData.cs
-- FetchMethod values: 1=Rss, 2=Api, 3=Scrape
-- ----------------------------------------------------------------------------

-- Bangladeshi sources (RSS)
INSERT OR IGNORE INTO news_sources (name, slug, base_url, rss_feed_url, fetch_method, fetch_interval_minutes, created_at, is_active) VALUES
('Prothom Alo',                       'prothom-alo',     'https://www.prothomalo.com',  'https://www.prothomalo.com/feed',                  1,  5, '2026-05-24T00:00:00Z', 1),
('Bangla Tribune',                    'bangla-tribune',  'https://www.banglatribune.com','https://www.banglatribune.com/feed/',              1,  5, '2026-05-24T00:00:00Z', 1),
('Bangladesh Sangbad Sangstha (BSS)', 'bss',             'https://www.bssnews.net',     'https://www.bssnews.net/rss/rss.xml',              1,  5, '2026-05-24T00:00:00Z', 1),
('The Dhaka Post',                    'the-dhaka-post',  'https://www.thedhakapost.com','https://www.thedhakapost.com/rss.xml',             1,  5, '2026-05-24T00:00:00Z', 1),
('Daily Star (English)',              'daily-star',      'https://www.thedailystar.net','https://www.thedailystar.net/frontpage/rss.xml',   1,  5, '2026-05-24T00:00:00Z', 1);

-- International sources (RSS)
INSERT OR IGNORE INTO news_sources (name, slug, base_url, rss_feed_url, fetch_method, fetch_interval_minutes, created_at, is_active) VALUES
('BBC News',         'bbc-news',        'https://www.bbc.com/news',         'http://feeds.bbci.co.uk/news/rss.xml',                                 1, 10, '2026-05-24T00:00:00Z', 1),
('CNN International','cnn',             'https://edition.cnn.com',          'http://rss.cnn.com/rss/edition.rss',                                   1, 10, '2026-05-24T00:00:00Z', 1),
('Al Jazeera English','al-jazeera',     'https://www.aljazeera.com',        'https://www.aljazeera.com/xml/rss/all.xml',                            1, 10, '2026-05-24T00:00:00Z', 1),
('NPR News',         'npr-news',        'https://www.npr.org',              'https://feeds.npr.org/1001/rss.xml',                                   1, 10, '2026-05-24T00:00:00Z', 1),
('Hindustan Times',  'hindustan-times', 'https://www.hindustantimes.com',   'https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml',      1, 10, '2026-05-24T00:00:00Z', 1);

-- Guardian (API)
INSERT OR IGNORE INTO news_sources (name, slug, base_url, api_endpoint, fetch_method, fetch_interval_minutes, created_at, is_active) VALUES
('The Guardian', 'the-guardian', 'https://www.theguardian.com', 'https://content.guardianapis.com/search', 2, 10, '2026-05-24T00:00:00Z', 1);
