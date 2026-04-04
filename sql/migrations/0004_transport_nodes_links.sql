CREATE TABLE IF NOT EXISTS transport_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address_line TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  metadata_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES sources(id),
  UNIQUE (kind, external_id)
);

CREATE TABLE IF NOT EXISTS center_transport_links (
  center_id TEXT NOT NULL,
  transport_node_id TEXT NOT NULL,
  distance_m REAL NOT NULL,
  rank_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (center_id, transport_node_id),
  FOREIGN KEY (center_id) REFERENCES centers(id),
  FOREIGN KEY (transport_node_id) REFERENCES transport_nodes(id)
);

CREATE INDEX IF NOT EXISTS idx_transport_nodes_kind_active
  ON transport_nodes(kind, is_active);

CREATE INDEX IF NOT EXISTS idx_transport_nodes_source_external
  ON transport_nodes(source_id, external_id);

CREATE INDEX IF NOT EXISTS idx_center_transport_links_center_rank
  ON center_transport_links(center_id, rank_order);
