CREATE TABLE IF NOT EXISTS center_ingestion_rejections (
  id TEXT PRIMARY KEY,
  source_code TEXT NOT NULL,
  external_id TEXT,
  title TEXT,
  reason TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
