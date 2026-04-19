-- Block 3: Schedule overrides tables and manual review queue
-- Adds structured override persistence and the admin review queue for unresolved schedules.

ALTER TABLE centers ADD COLUMN schedule_needs_review INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS center_schedule_overrides (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  rules_json TEXT,
  from_date TEXT,
  to_date TEXT,
  notes TEXT,
  closed INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'parsed',
  created_at TEXT NOT NULL,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS center_schedule_manual_review_queue (
  id TEXT PRIMARY KEY,
  center_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  raw_text TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_action TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_center ON center_schedule_overrides(center_id);
CREATE INDEX IF NOT EXISTS idx_schedule_review_center ON center_schedule_manual_review_queue(center_id);
CREATE INDEX IF NOT EXISTS idx_centers_needs_review ON centers(schedule_needs_review);
