-- Migration 0007: Real center attribute ratings (Block 8 controlled advance)
-- Keeps one vote per Google user and center, with six mandatory attributes.
CREATE TABLE IF NOT EXISTS center_attribute_votes (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  silence INTEGER NOT NULL,
  wifi INTEGER NOT NULL,
  cleanliness INTEGER NOT NULL,
  plugs INTEGER NOT NULL,
  temperature INTEGER NOT NULL,
  lighting INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE,
  UNIQUE(center_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_center_attribute_votes_center
  ON center_attribute_votes(center_id);

CREATE INDEX IF NOT EXISTS idx_center_attribute_votes_user
  ON center_attribute_votes(user_id);