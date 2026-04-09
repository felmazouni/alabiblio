PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS schedule_versions__fix_old;
ALTER TABLE schedule_versions RENAME TO schedule_versions__fix_old;

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

INSERT INTO schedule_versions (
  id,
  center_id,
  source_id,
  run_id,
  version_status,
  raw_schedule_text,
  notes_raw,
  normalized_json,
  parse_confidence,
  parse_warnings_json,
  open_air_flag,
  created_at
)
SELECT
  id,
  center_id,
  source_id,
  run_id,
  version_status,
  raw_schedule_text,
  notes_raw,
  normalized_json,
  parse_confidence,
  parse_warnings_json,
  open_air_flag,
  created_at
FROM schedule_versions__fix_old;

DROP TABLE schedule_versions__fix_old;

CREATE INDEX IF NOT EXISTS idx_schedule_versions_center_created_at
  ON schedule_versions(center_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedule_versions_center_status
  ON schedule_versions(center_id, version_status);

DROP TABLE IF EXISTS center_feature_evidence__fix_old;
ALTER TABLE center_feature_evidence RENAME TO center_feature_evidence__fix_old;

CREATE TABLE IF NOT EXISTS center_feature_evidence (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  feature_code TEXT NOT NULL,
  source_id TEXT,
  run_id TEXT,
  source_type TEXT NOT NULL,
  source_field TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (run_id) REFERENCES ingestion_runs(id),
  FOREIGN KEY (center_id, feature_code) REFERENCES center_features(center_id, feature_code)
);

INSERT INTO center_feature_evidence (
  id,
  center_id,
  feature_code,
  source_id,
  run_id,
  source_type,
  source_field,
  excerpt,
  confidence,
  created_at
)
SELECT
  id,
  center_id,
  feature_code,
  source_id,
  run_id,
  source_type,
  source_field,
  excerpt,
  confidence,
  created_at
FROM center_feature_evidence__fix_old;

DROP TABLE center_feature_evidence__fix_old;

CREATE INDEX IF NOT EXISTS idx_center_feature_evidence_center_feature
  ON center_feature_evidence(center_id, feature_code);

CREATE INDEX IF NOT EXISTS idx_center_feature_evidence_run
  ON center_feature_evidence(run_id);

PRAGMA foreign_keys = ON;
