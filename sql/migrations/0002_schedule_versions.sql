CREATE TABLE IF NOT EXISTS schedule_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  center_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  version_status TEXT NOT NULL,
  raw_schedule_text TEXT,
  notes_raw TEXT,
  normalized_json TEXT,
  parse_confidence REAL,
  parse_warnings_json TEXT,
  open_air_flag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (run_id) REFERENCES ingestion_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_versions_center_created_at
  ON schedule_versions(center_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_versions_center_status
  ON schedule_versions(center_id, version_status);
