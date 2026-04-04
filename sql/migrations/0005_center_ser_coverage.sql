CREATE TABLE IF NOT EXISTS center_ser_coverage (
  center_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  zone_name TEXT,
  coverage_method TEXT NOT NULL,
  distance_m REAL,
  computed_at TEXT NOT NULL,
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE INDEX IF NOT EXISTS idx_center_ser_coverage_enabled
  ON center_ser_coverage(enabled, zone_name);
