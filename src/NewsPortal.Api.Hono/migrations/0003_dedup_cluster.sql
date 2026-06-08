-- Cross-source duplicate grouping.
-- `duplicate_of` points a secondary article at the PRIMARY (earliest) article of the
-- same story when the same news is published by more than one source. NULL = primary
-- (the row shown in browse feeds). Secondaries stay in the DB (non-destructive) and are
-- surfaced as an "also on <source>" hint on the primary's card.
-- Additive + backward-compatible: existing rows default to NULL (all primaries), and the
-- old Worker code simply ignores the column until the new code ships.
ALTER TABLE news_articles ADD COLUMN duplicate_of INTEGER;

-- Browse feeds filter on `duplicate_of IS NULL`; the backfill/grouping queries look up
-- secondaries by their primary id. Index both access paths.
CREATE INDEX IF NOT EXISTS idx_articles_duplicate_of ON news_articles(duplicate_of);
