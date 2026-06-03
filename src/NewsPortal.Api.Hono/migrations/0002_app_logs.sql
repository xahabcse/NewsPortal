-- ============================================================================
-- Central application log (app_logs)
-- ----------------------------------------------------------------------------
-- One unified table for every log category so a single SuperAdmin viewer can
-- page/filter across all of them:
--   request       — mutation / error / slow API hits (method, path, status, latency, ip)
--   audit         — admin mutations (who did what to which target)
--   extraction    — article body-extraction failures (which url, why)
--   client_error  — frontend runtime errors reported by the browser
-- Pruned to the last ~14 days by the scheduled fetch job.
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_logs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT NOT NULL,
    category     TEXT NOT NULL,                 -- request | audit | extraction | client_error
    level        TEXT NOT NULL DEFAULT 'info',  -- info | warn | error
    message      TEXT,
    -- request
    method       TEXT,
    path         TEXT,
    status       INTEGER,
    duration_ms  INTEGER,
    -- common
    ip           TEXT,
    user_agent   TEXT,
    user_id      INTEGER,
    user_name    TEXT,
    -- audit
    action       TEXT,
    target_type  TEXT,
    target_id    TEXT,
    -- extraction
    source_slug  TEXT,
    url          TEXT,
    -- error / extras
    error        TEXT,
    meta         TEXT
);

CREATE INDEX IF NOT EXISTS ix_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_app_logs_category_created ON app_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_app_logs_level ON app_logs(level);
