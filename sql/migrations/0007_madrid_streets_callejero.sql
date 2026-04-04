-- Madrid official callejero for address autocomplete
-- Load data with: pnpm ingest:callejero:staging / pnpm ingest:callejero:production
-- Source: https://datos.madrid.es/dataset/200075-0-callejero/downloads

CREATE TABLE IF NOT EXISTS madrid_streets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  via_type      TEXT    NOT NULL DEFAULT '',
  via_name      TEXT    NOT NULL,
  full_via      TEXT    NOT NULL,
  num_from      INTEGER,
  num_to        INTEGER,
  district      TEXT,
  neighborhood  TEXT,
  lat           REAL,
  lon           REAL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_madrid_streets_via_name  ON madrid_streets (via_name);
CREATE INDEX IF NOT EXISTS idx_madrid_streets_district  ON madrid_streets (district);
CREATE INDEX IF NOT EXISTS idx_madrid_streets_coords    ON madrid_streets (lat, lon);

CREATE VIRTUAL TABLE IF NOT EXISTS madrid_streets_fts USING fts5 (
  full_via,
  district,
  neighborhood,
  content     = madrid_streets,
  content_rowid = id
);
