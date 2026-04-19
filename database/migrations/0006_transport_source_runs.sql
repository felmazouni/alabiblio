-- Migration 0006: Transport source traceability for Block 4
-- Stores each destination snapshot source fetch with URL, item count and timestamp.
CREATE TABLE IF NOT EXISTS transport_source_runs (
  id TEXT PRIMARY KEY,
  source_code TEXT NOT NULL,
  source_url TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL,
  source_kind TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transport_source_runs_code
  ON transport_source_runs(source_code);

CREATE INDEX IF NOT EXISTS idx_transport_source_runs_fetched
  ON transport_source_runs(fetched_at);
