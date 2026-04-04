CREATE TABLE IF NOT EXISTS center_features (
  center_id TEXT NOT NULL,
  feature_code TEXT NOT NULL,
  label TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  is_card_visible INTEGER NOT NULL DEFAULT 0,
  is_filterable INTEGER NOT NULL DEFAULT 0,
  source_summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (center_id, feature_code),
  FOREIGN KEY (center_id) REFERENCES centers(id)
);

CREATE INDEX IF NOT EXISTS idx_center_features_card_visible
  ON center_features(is_card_visible, feature_code);

CREATE INDEX IF NOT EXISTS idx_center_features_filterable
  ON center_features(is_filterable, feature_code);

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

CREATE INDEX IF NOT EXISTS idx_center_feature_evidence_center_feature
  ON center_feature_evidence(center_id, feature_code);

CREATE INDEX IF NOT EXISTS idx_center_feature_evidence_run
  ON center_feature_evidence(run_id);
