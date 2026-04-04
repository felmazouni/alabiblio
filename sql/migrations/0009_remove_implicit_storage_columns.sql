PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS ingestion_runs__old;
ALTER TABLE ingestion_runs RENAME TO ingestion_runs__old;

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  row_count_raw INTEGER NOT NULL DEFAULT 0,
  row_count_valid INTEGER NOT NULL DEFAULT 0,
  row_count_rejected INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  meta_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

INSERT INTO ingestion_runs (
  id,
  source_id,
  status,
  started_at,
  finished_at,
  row_count_raw,
  row_count_valid,
  row_count_rejected,
  warning_count,
  error_count,
  checksum,
  triggered_by,
  meta_json
)
SELECT
  id,
  source_id,
  status,
  started_at,
  finished_at,
  row_count_raw,
  row_count_valid,
  row_count_rejected,
  warning_count,
  error_count,
  checksum,
  triggered_by,
  meta_json
FROM ingestion_runs__old;

DROP TABLE ingestion_runs__old;

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source_started_at
  ON ingestion_runs(source_id, started_at DESC);

DROP TABLE IF EXISTS center_source_links__old;
ALTER TABLE center_source_links RENAME TO center_source_links__old;

CREATE TABLE IF NOT EXISTS center_source_links (
  center_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  source_record_updated_at TEXT,
  PRIMARY KEY (center_id, source_id, external_id),
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (run_id) REFERENCES ingestion_runs(id)
);

INSERT INTO center_source_links (
  center_id,
  source_id,
  external_id,
  run_id,
  is_primary,
  source_record_updated_at
)
SELECT
  center_id,
  source_id,
  external_id,
  run_id,
  is_primary,
  source_record_updated_at
FROM center_source_links__old;

DROP TABLE center_source_links__old;

CREATE INDEX IF NOT EXISTS idx_center_source_links_source_external
  ON center_source_links(source_id, external_id);

CREATE INDEX IF NOT EXISTS idx_center_source_links_run
  ON center_source_links(run_id);

PRAGMA foreign_keys = ON;
