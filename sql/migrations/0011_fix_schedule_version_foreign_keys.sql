PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS regular_rules__fix_old;
ALTER TABLE regular_rules RENAME TO regular_rules__fix_old;

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

INSERT INTO regular_rules (
  id,
  schedule_version_id,
  audience,
  weekday,
  opens_at,
  closes_at,
  sequence
)
SELECT
  id,
  schedule_version_id,
  audience,
  weekday,
  opens_at,
  closes_at,
  sequence
FROM regular_rules__fix_old;

DROP TABLE regular_rules__fix_old;

CREATE INDEX IF NOT EXISTS idx_regular_rules_schedule_version
  ON regular_rules(schedule_version_id, weekday, sequence);

DROP TABLE IF EXISTS holiday_closures__fix_old;
ALTER TABLE holiday_closures RENAME TO holiday_closures__fix_old;

CREATE TABLE IF NOT EXISTS holiday_closures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_version_id INTEGER NOT NULL,
  audience TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  label TEXT NOT NULL,
  FOREIGN KEY (schedule_version_id) REFERENCES schedule_versions(id)
);

INSERT INTO holiday_closures (
  id,
  schedule_version_id,
  audience,
  month,
  day,
  label
)
SELECT
  id,
  schedule_version_id,
  audience,
  month,
  day,
  label
FROM holiday_closures__fix_old;

DROP TABLE holiday_closures__fix_old;

CREATE INDEX IF NOT EXISTS idx_holiday_closures_schedule_version
  ON holiday_closures(schedule_version_id, month, day);

DROP TABLE IF EXISTS partial_day_overrides__fix_old;
ALTER TABLE partial_day_overrides RENAME TO partial_day_overrides__fix_old;

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

INSERT INTO partial_day_overrides (
  id,
  schedule_version_id,
  audience,
  month,
  day,
  opens_at,
  closes_at,
  sequence,
  label
)
SELECT
  id,
  schedule_version_id,
  audience,
  month,
  day,
  opens_at,
  closes_at,
  sequence,
  label
FROM partial_day_overrides__fix_old;

DROP TABLE partial_day_overrides__fix_old;

CREATE INDEX IF NOT EXISTS idx_partial_day_overrides_schedule_version
  ON partial_day_overrides(schedule_version_id, month, day, sequence);

DROP TABLE IF EXISTS schedule_parse_anomalies__fix_old;
ALTER TABLE schedule_parse_anomalies RENAME TO schedule_parse_anomalies__fix_old;

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

INSERT INTO schedule_parse_anomalies (
  id,
  schedule_version_id,
  code,
  severity,
  field_name,
  raw_fragment,
  message
)
SELECT
  id,
  schedule_version_id,
  code,
  severity,
  field_name,
  raw_fragment,
  message
FROM schedule_parse_anomalies__fix_old;

DROP TABLE schedule_parse_anomalies__fix_old;

CREATE INDEX IF NOT EXISTS idx_schedule_parse_anomalies_schedule_version
  ON schedule_parse_anomalies(schedule_version_id, severity);

PRAGMA foreign_keys = ON;
