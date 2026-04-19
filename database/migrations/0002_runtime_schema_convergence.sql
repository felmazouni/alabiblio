CREATE TABLE IF NOT EXISTS center_transport_snapshots (
  center_id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  snapshot_version TEXT NOT NULL,
  active_option_count INTEGER NOT NULL DEFAULT 0,
  realtime_option_count INTEGER NOT NULL DEFAULT 0,
  structured_option_count INTEGER NOT NULL DEFAULT 0,
  parsed_option_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS center_transport_nodes (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  external_node_id TEXT,
  node_role TEXT NOT NULL,
  node_name TEXT NOT NULL,
  node_label TEXT,
  latitude REAL,
  longitude REAL,
  line_codes_json TEXT,
  walking_distance_m_to_center INTEGER,
  walking_time_min_to_center INTEGER,
  relevance_score REAL NOT NULL DEFAULT 0,
  display_priority INTEGER NOT NULL DEFAULT 0,
  cache_ttl_seconds INTEGER NOT NULL DEFAULT 86400,
  fetched_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS center_transport_options (
  option_id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  source_label TEXT NOT NULL,
  data_origin TEXT NOT NULL,
  destination_node_id TEXT,
  destination_node_name TEXT,
  summary TEXT NOT NULL,
  lines_json TEXT,
  origin_label TEXT,
  destination_label TEXT,
  walk_distance_m_to_center INTEGER,
  walk_time_min_to_center INTEGER,
  wait_minutes INTEGER,
  total_minutes INTEGER,
  station_name TEXT,
  stop_name TEXT,
  ser_zone_label TEXT,
  availability_text TEXT,
  note TEXT,
  external_url TEXT,
  display_priority INTEGER NOT NULL DEFAULT 0,
  relevance_score REAL NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL,
  cache_ttl_seconds INTEGER NOT NULL DEFAULT 86400,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS center_transport_relevance (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  relevance_score REAL NOT NULL,
  display_priority INTEGER NOT NULL,
  computed_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS center_ser_coverage (
  center_id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  zone_label TEXT,
  district TEXT,
  neighborhood TEXT,
  fetched_at TEXT NOT NULL,
  cache_ttl_seconds INTEGER NOT NULL DEFAULT 604800,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_center_admin_users_center ON center_admin_users(center_id);
CREATE INDEX IF NOT EXISTS idx_center_rating_votes_center ON center_rating_votes(center_id);
CREATE INDEX IF NOT EXISTS idx_transport_options_center ON center_transport_options(center_id);
CREATE INDEX IF NOT EXISTS idx_transport_nodes_center ON center_transport_nodes(center_id);
CREATE INDEX IF NOT EXISTS idx_transport_relevance_center ON center_transport_relevance(center_id);
