CREATE TABLE IF NOT EXISTS regular_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version_id INTEGER NOT NULL,
  audience TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  FOREIGN KEY (schedule_version_id) REFERENCES schedule_versions(id)
);

CREATE TABLE IF NOT EXISTS holiday_closures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version_id INTEGER NOT NULL,
  audience TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  label TEXT NOT NULL,
  FOREIGN KEY (schedule_version_id) REFERENCES schedule_versions(id)
);

CREATE TABLE IF NOT EXISTS partial_day_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version_id INTEGER NOT NULL,
  audience TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  label TEXT NOT NULL,
  FOREIGN KEY (schedule_version_id) REFERENCES schedule_versions(id)
);

CREATE TABLE IF NOT EXISTS schedule_parse_anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  field_name TEXT,
  raw_fragment TEXT,
  message TEXT NOT NULL,
  FOREIGN KEY (schedule_version_id) REFERENCES schedule_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_regular_rules_schedule_version
  ON regular_rules(schedule_version_id, weekday, sequence);

CREATE INDEX IF NOT EXISTS idx_holiday_closures_schedule_version
  ON holiday_closures(schedule_version_id, month, day);

CREATE INDEX IF NOT EXISTS idx_partial_day_overrides_schedule_version
  ON partial_day_overrides(schedule_version_id, month, day, sequence);

CREATE INDEX IF NOT EXISTS idx_schedule_parse_anomalies_schedule_version
  ON schedule_parse_anomalies(schedule_version_id, severity);
