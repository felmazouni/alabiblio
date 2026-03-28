CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  format TEXT NOT NULL,
  license_url TEXT,
  refresh_mode TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
  snapshot_r2_key TEXT,
  triggered_by TEXT NOT NULL,
  meta_json TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS centers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  district TEXT,
  neighborhood TEXT,
  address_line TEXT,
  postal_code TEXT,
  municipality TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  raw_lat REAL,
  raw_lon REAL,
  lat REAL,
  lon REAL,
  coord_status TEXT NOT NULL,
  coord_resolution_method TEXT,
  capacity_value INTEGER,
  capacity_text TEXT,
  wifi_flag INTEGER NOT NULL DEFAULT 0,
  sockets_flag INTEGER NOT NULL DEFAULT 0,
  accessibility_flag INTEGER NOT NULL DEFAULT 0,
  open_air_flag INTEGER NOT NULL DEFAULT 0,
  notes_raw TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS center_source_links (
  center_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  source_record_updated_at TEXT,
  raw_payload_r2_key TEXT,
  PRIMARY KEY (center_id, source_id, external_id),
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (run_id) REFERENCES ingestion_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_sources_code ON sources(code);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source_started_at ON ingestion_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_centers_kind_active ON centers(kind, is_active);
CREATE INDEX IF NOT EXISTS idx_centers_name ON centers(name);
CREATE INDEX IF NOT EXISTS idx_centers_district_neighborhood ON centers(district, neighborhood);
CREATE INDEX IF NOT EXISTS idx_center_source_links_source_external ON center_source_links(source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_center_source_links_run ON center_source_links(run_id);
