CREATE TABLE IF NOT EXISTS sources (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dataset_url TEXT NOT NULL,
  last_ingested_at TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source_code TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS centers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  external_id TEXT NOT NULL,
  source_code TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  address_line TEXT,
  district TEXT,
  neighborhood TEXT,
  postal_code TEXT,
  latitude REAL,
  longitude REAL,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  accessibility INTEGER NOT NULL DEFAULT 0,
  wifi INTEGER NOT NULL DEFAULT 0,
  open_air INTEGER NOT NULL DEFAULT 0,
  capacity_value INTEGER,
  services_text TEXT,
  transport_text TEXT,
  schedule_text_raw TEXT,
  schedule_summary_text TEXT,
  schedule_confidence TEXT,
  schedule_notes_unparsed TEXT,
  rating_average REAL,
  rating_count INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS center_schedule_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  center_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS center_admin_users (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending_activation',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS center_rating_votes (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  rating_value INTEGER NOT NULL,
  voter_fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_centers_source_code ON centers(source_code);
CREATE INDEX IF NOT EXISTS idx_centers_kind ON centers(kind);
CREATE INDEX IF NOT EXISTS idx_schedule_rules_center ON center_schedule_rules(center_id);
CREATE INDEX IF NOT EXISTS idx_center_admin_users_center ON center_admin_users(center_id);
CREATE INDEX IF NOT EXISTS idx_center_rating_votes_center ON center_rating_votes(center_id);
