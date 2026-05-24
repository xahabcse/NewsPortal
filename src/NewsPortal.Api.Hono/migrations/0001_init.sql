-- ============================================================================
-- NewsPortal D1 Initial Schema (consolidated)
-- ----------------------------------------------------------------------------
-- This file collapses the 12 EF Core PostgreSQL migrations
-- (InitialCreate → AddBioAndAvatar) into one snapshot suitable for D1 / SQLite.
--
-- Conventions:
--   * INTEGER columns store SQLite integers; booleans are stored as 0/1.
--   * TEXT columns store ISO-8601 timestamps for *_At fields.
--   * Foreign keys are declared but D1 enforces them by default in Workers.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    name_bn       TEXT NOT NULL,
    slug          TEXT NOT NULL,
    description   TEXT,
    icon          TEXT,
    color         TEXT,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS ix_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS ix_categories_sort_order ON categories(sort_order);


-- ----------------------------------------------------------------------------
-- news_sources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_sources (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    name                        TEXT NOT NULL,
    slug                        TEXT NOT NULL,
    base_url                    TEXT NOT NULL,
    logo_url                    TEXT,
    fetch_method                INTEGER NOT NULL DEFAULT 0,
    rss_feed_url                TEXT,
    api_endpoint                TEXT,
    api_key                     TEXT,
    fetch_interval_minutes      INTEGER NOT NULL DEFAULT 30,
    last_fetched_at             TEXT,
    health_status               INTEGER NOT NULL DEFAULT 0,
    consecutive_failures        INTEGER NOT NULL DEFAULT 0,
    last_success_at             TEXT,
    last_failure_at             TEXT,
    last_error_code             TEXT,
    last_error_message          TEXT,
    next_retry_at               TEXT,
    request_timeout_seconds     INTEGER NOT NULL DEFAULT 90,
    max_retry_attempts          INTEGER NOT NULL DEFAULT 3,
    circuit_breaker_threshold   INTEGER NOT NULL DEFAULT 5,
    created_at                  TEXT NOT NULL,
    updated_at                  TEXT,
    is_active                   INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_news_sources_slug ON news_sources(slug);
CREATE INDEX IF NOT EXISTS ix_news_sources_is_active ON news_sources(is_active);
CREATE INDEX IF NOT EXISTS ix_news_sources_health_status ON news_sources(health_status);
CREATE INDEX IF NOT EXISTS ix_news_sources_next_retry_at ON news_sources(next_retry_at);


-- ----------------------------------------------------------------------------
-- news_articles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_articles (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    slug                TEXT NOT NULL,
    canonical_url       TEXT NOT NULL,
    summary             TEXT,
    content             TEXT,
    plain_text          TEXT,
    source_url          TEXT NOT NULL,
    original_image_url  TEXT,
    mongo_image_id      TEXT,
    mongo_thumb_id      TEXT,
    author              TEXT,
    published_at        TEXT,
    fetched_at          TEXT NOT NULL,
    view_count          INTEGER NOT NULL DEFAULT 0,
    is_featured         INTEGER NOT NULL DEFAULT 0,
    source_id           INTEGER NOT NULL,
    category_id         INTEGER,
    created_at          TEXT NOT NULL,
    updated_at          TEXT,
    is_active           INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (source_id)   REFERENCES news_sources(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id)   ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_news_articles_slug ON news_articles(slug);
CREATE UNIQUE INDEX IF NOT EXISTS ix_news_articles_source_canonical ON news_articles(source_id, canonical_url);
CREATE INDEX IF NOT EXISTS ix_news_articles_canonical_url ON news_articles(canonical_url);
CREATE INDEX IF NOT EXISTS ix_news_articles_source_url ON news_articles(source_url);
CREATE INDEX IF NOT EXISTS ix_news_articles_source_id ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS ix_news_articles_category_id ON news_articles(category_id);
CREATE INDEX IF NOT EXISTS ix_news_articles_fetched_at ON news_articles(fetched_at);
CREATE INDEX IF NOT EXISTS ix_news_articles_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS ix_news_articles_is_active ON news_articles(is_active);
CREATE INDEX IF NOT EXISTS ix_news_articles_is_featured ON news_articles(is_featured);
CREATE INDEX IF NOT EXISTS ix_news_articles_active_published ON news_articles(is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS ix_news_articles_category_active_published ON news_articles(category_id, is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS ix_news_articles_featured_active_published ON news_articles(is_featured, is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS ix_news_articles_source_active_published ON news_articles(source_id, is_active, published_at DESC);


-- ----------------------------------------------------------------------------
-- scraping_configs (1-to-1 with news_sources)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scraping_configs (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id               INTEGER NOT NULL,
    list_page_url           TEXT,
    article_link_selector   TEXT,
    title_selector          TEXT,
    content_selector        TEXT,
    summary_selector        TEXT,
    image_selector          TEXT,
    date_selector           TEXT,
    author_selector         TEXT,
    created_at              TEXT NOT NULL,
    updated_at              TEXT,
    is_active               INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_scraping_configs_source ON scraping_configs(source_id);


-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL,
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'Reader',
    auth_provider   TEXT NOT NULL DEFAULT 'Local',
    last_login_at   TEXT,
    bio             TEXT,
    avatar_id       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_is_active ON users(is_active);


-- ----------------------------------------------------------------------------
-- user_bookmarks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    article_id  INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_bookmarks_user_article ON user_bookmarks(user_id, article_id);
CREATE INDEX IF NOT EXISTS ix_user_bookmarks_article_id ON user_bookmarks(article_id);


-- ----------------------------------------------------------------------------
-- user_read_history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_read_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    article_id  INTEGER NOT NULL,
    read_at     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_user_read_history_user_article ON user_read_history(user_id, article_id);
CREATE INDEX IF NOT EXISTS ix_user_read_history_article_id ON user_read_history(article_id);


-- ----------------------------------------------------------------------------
-- comments (threaded)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id   INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    parent_id    INTEGER,
    content      TEXT NOT NULL,
    is_approved  INTEGER NOT NULL DEFAULT 1,
    is_deleted   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE RESTRICT,
    FOREIGN KEY (parent_id)  REFERENCES comments(id)      ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS ix_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments(parent_id);


-- ----------------------------------------------------------------------------
-- comment_votes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comment_votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    comment_id  INTEGER NOT NULL,
    is_upvote   INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_comment_votes_user_comment ON comment_votes(user_id, comment_id);
CREATE INDEX IF NOT EXISTS ix_comment_votes_comment_id ON comment_votes(comment_id);


-- ----------------------------------------------------------------------------
-- article_reactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_reactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    article_id      INTEGER NOT NULL,
    reaction_type   TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_article_reactions_user_article ON article_reactions(user_id, article_id);
CREATE INDEX IF NOT EXISTS ix_article_reactions_article_id ON article_reactions(article_id);


-- ----------------------------------------------------------------------------
-- article_reports
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    article_id  INTEGER NOT NULL,
    reason      TEXT NOT NULL,
    details     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id)    REFERENCES users(id)         ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_article_reports_user_article ON article_reports(user_id, article_id);
CREATE INDEX IF NOT EXISTS ix_article_reports_article_id ON article_reports(article_id);
CREATE INDEX IF NOT EXISTS ix_article_reports_status ON article_reports(status);


-- ----------------------------------------------------------------------------
-- source_fetch_jobs (Hangfire-tracking table — kept for legacy parity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_fetch_jobs (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id             TEXT NOT NULL,
    source_id               INTEGER NOT NULL,
    requested_by_user_id    INTEGER,
    trigger_type            TEXT NOT NULL,
    hangfire_job_id         TEXT,
    status                  INTEGER NOT NULL DEFAULT 0,
    attempts                INTEGER NOT NULL DEFAULT 0,
    started_at              TEXT,
    finished_at             TEXT,
    articles_fetched        INTEGER NOT NULL DEFAULT 0,
    new_articles            INTEGER NOT NULL DEFAULT 0,
    updated_articles        INTEGER NOT NULL DEFAULT 0,
    error_code              TEXT,
    error_summary           TEXT,
    created_at              TEXT NOT NULL,
    updated_at              TEXT,
    is_active               INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_source_fetch_jobs_external_id ON source_fetch_jobs(external_id);
CREATE INDEX IF NOT EXISTS ix_source_fetch_jobs_source_id ON source_fetch_jobs(source_id);
CREATE INDEX IF NOT EXISTS ix_source_fetch_jobs_status ON source_fetch_jobs(status);
CREATE INDEX IF NOT EXISTS ix_source_fetch_jobs_created_at ON source_fetch_jobs(created_at);


-- ----------------------------------------------------------------------------
-- news_fetch_logs (verbose audit trail; matches legacy "NewsFetchLogs" table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_fetch_logs (
    id                  TEXT PRIMARY KEY,
    source_id           INTEGER NOT NULL,
    source_name         TEXT NOT NULL,
    fetched_at          TEXT NOT NULL,
    duration_ms         INTEGER NOT NULL DEFAULT 0,
    articles_fetched    INTEGER NOT NULL DEFAULT 0,
    new_articles        INTEGER NOT NULL DEFAULT 0,
    updated_articles    INTEGER NOT NULL DEFAULT 0,
    success             INTEGER NOT NULL DEFAULT 1,
    error_message       TEXT,
    details             TEXT
);
CREATE INDEX IF NOT EXISTS ix_news_fetch_logs_source_id ON news_fetch_logs(source_id);
CREATE INDEX IF NOT EXISTS ix_news_fetch_logs_fetched_at ON news_fetch_logs(fetched_at);
