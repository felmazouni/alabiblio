import type {
  CenterRecord,
  CenterSourceSummary,
  ListCentersQuery,
  ScheduleHolidayClosure,
  ScheduleParseAnomaly,
  SchedulePartialDayOverride,
  ScheduleRegularRule,
} from "@alabiblio/contracts/centers";
import type { ActiveScheduleRecord } from "@alabiblio/schedule-engine/types";

export type WorkerEnv = Env & {
  APP_ENV: string;
  ASSETS: Fetcher;
  DB: D1Database;
};

type CenterRow = {
  id: string;
  slug: string;
  kind: CenterRecord["kind"];
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  postal_code: string | null;
  municipality: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  raw_lat: number | null;
  raw_lon: number | null;
  lat: number | null;
  lon: number | null;
  coord_status: CenterRecord["coord_status"];
  coord_resolution_method: string | null;
  capacity_value: number | null;
  capacity_text: string | null;
  wifi_flag: number;
  sockets_flag: number;
  accessibility_flag: number;
  open_air_flag: number;
  notes_raw: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type ScheduleVersionRow = {
  schedule_version_id: number;
  center_id: string;
  raw_schedule_text: string | null;
  notes_raw: string | null;
  parse_confidence: number | null;
  open_air_flag: number;
};

type RegularRuleRow = ScheduleRegularRule & {
  schedule_version_id: number;
};

type HolidayClosureRow = ScheduleHolidayClosure & {
  schedule_version_id: number;
};

type PartialDayOverrideRow = SchedulePartialDayOverride & {
  schedule_version_id: number;
};

type ScheduleAnomalyRow = ScheduleParseAnomaly & {
  schedule_version_id: number;
};

type SourceFreshnessRow = {
  center_id: string;
  source_last_updated: string | null;
};

function hydrateCenter(row: CenterRow): CenterRecord {
  return {
    ...row,
    wifi_flag: row.wifi_flag === 1,
    sockets_flag: row.sockets_flag === 1,
    accessibility_flag: row.accessibility_flag === 1,
    open_air_flag: row.open_air_flag === 1,
    is_active: row.is_active === 1,
  };
}

function buildWhereClause(
  filters: Pick<ListCentersQuery, "kind" | "q" | "has_wifi" | "accessible" | "open_air">,
): {
  clause: string;
  bindings: Array<number | string>;
} {
  const clauses = ["is_active = 1"];
  const bindings: Array<number | string> = [];

  if (filters.kind) {
    clauses.push("kind = ?");
    bindings.push(filters.kind);
  }

  const query = filters.q?.trim().toLowerCase();

  if (query) {
    clauses.push("LOWER(name) LIKE ?");
    bindings.push(`%${query}%`);
  }

  if (filters.has_wifi) {
    clauses.push("wifi_flag = 1");
  }

  if (filters.accessible) {
    clauses.push("accessibility_flag = 1");
  }

  if (filters.open_air) {
    clauses.push("open_air_flag = 1");
  }

  return {
    clause: clauses.join(" AND "),
    bindings,
  };
}

function buildPlaceholders(values: string[]): string {
  return values.map(() => "?").join(", ");
}

function chunkValues<T>(values: T[], size = 50): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function loadActiveScheduleRows(
  db: D1Database,
  centerIds: string[],
): Promise<ScheduleVersionRow[]> {
  if (centerIds.length === 0) {
    return [];
  }

  const results: ScheduleVersionRow[] = [];

  for (const centerIdChunk of chunkValues(centerIds)) {
    const placeholders = buildPlaceholders(centerIdChunk);
    const result = await db
      .prepare(
        `WITH ranked AS (
          SELECT
            sv.id AS schedule_version_id,
            sv.center_id,
            sv.raw_schedule_text,
            sv.notes_raw,
            sv.parse_confidence,
            sv.open_air_flag,
            ROW_NUMBER() OVER (
              PARTITION BY sv.center_id
              ORDER BY CASE sv.version_status WHEN 'active' THEN 0 ELSE 1 END, sv.created_at DESC, sv.id DESC
            ) AS row_number
          FROM schedule_versions sv
          WHERE sv.center_id IN (${placeholders})
        )
        SELECT
          schedule_version_id,
          center_id,
          raw_schedule_text,
          notes_raw,
          parse_confidence,
          open_air_flag
        FROM ranked
        WHERE row_number = 1`,
      )
      .bind(...centerIdChunk)
      .all<ScheduleVersionRow>();

    results.push(...(result.results ?? []));
  }

  return results;
}

async function loadRegularRules(
  db: D1Database,
  scheduleVersionIds: number[],
): Promise<RegularRuleRow[]> {
  if (scheduleVersionIds.length === 0) {
    return [];
  }

  const results: RegularRuleRow[] = [];

  for (const scheduleVersionChunk of chunkValues(scheduleVersionIds)) {
    const placeholders = scheduleVersionChunk.map(() => "?").join(", ");
    const result = await db
      .prepare(
        `SELECT
          schedule_version_id,
          audience,
          weekday,
          opens_at,
          closes_at,
          sequence
        FROM regular_rules
        WHERE schedule_version_id IN (${placeholders})
        ORDER BY weekday ASC, sequence ASC`,
      )
      .bind(...scheduleVersionChunk)
      .all<RegularRuleRow>();

    results.push(...(result.results ?? []));
  }

  return results;
}

async function loadHolidayClosures(
  db: D1Database,
  scheduleVersionIds: number[],
): Promise<HolidayClosureRow[]> {
  if (scheduleVersionIds.length === 0) {
    return [];
  }

  const results: HolidayClosureRow[] = [];

  for (const scheduleVersionChunk of chunkValues(scheduleVersionIds)) {
    const placeholders = scheduleVersionChunk.map(() => "?").join(", ");
    const result = await db
      .prepare(
        `SELECT
          schedule_version_id,
          audience,
          month,
          day,
          label
        FROM holiday_closures
        WHERE schedule_version_id IN (${placeholders})
        ORDER BY month ASC, day ASC`,
      )
      .bind(...scheduleVersionChunk)
      .all<HolidayClosureRow>();

    results.push(...(result.results ?? []));
  }

  return results;
}

async function loadPartialDayOverrides(
  db: D1Database,
  scheduleVersionIds: number[],
): Promise<PartialDayOverrideRow[]> {
  if (scheduleVersionIds.length === 0) {
    return [];
  }

  const results: PartialDayOverrideRow[] = [];

  for (const scheduleVersionChunk of chunkValues(scheduleVersionIds)) {
    const placeholders = scheduleVersionChunk.map(() => "?").join(", ");
    const result = await db
      .prepare(
        `SELECT
          schedule_version_id,
          audience,
          month,
          day,
          opens_at,
          closes_at,
          sequence,
          label
        FROM partial_day_overrides
        WHERE schedule_version_id IN (${placeholders})
        ORDER BY month ASC, day ASC, sequence ASC`,
      )
      .bind(...scheduleVersionChunk)
      .all<PartialDayOverrideRow>();

    results.push(...(result.results ?? []));
  }

  return results;
}

async function loadScheduleAnomalies(
  db: D1Database,
  scheduleVersionIds: number[],
): Promise<ScheduleAnomalyRow[]> {
  if (scheduleVersionIds.length === 0) {
    return [];
  }

  const results: ScheduleAnomalyRow[] = [];

  for (const scheduleVersionChunk of chunkValues(scheduleVersionIds)) {
    const placeholders = scheduleVersionChunk.map(() => "?").join(", ");
    const result = await db
      .prepare(
        `SELECT
          schedule_version_id,
          code,
          severity,
          field_name,
          raw_fragment,
          message
        FROM schedule_parse_anomalies
        WHERE schedule_version_id IN (${placeholders})
        ORDER BY id ASC`,
      )
      .bind(...scheduleVersionChunk)
      .all<ScheduleAnomalyRow>();

    results.push(...(result.results ?? []));
  }

  return results;
}

export async function loadActiveSchedulesByCenterIds(
  db: D1Database,
  centerIds: string[],
): Promise<Map<string, ActiveScheduleRecord>> {
  const scheduleRows = await loadActiveScheduleRows(db, centerIds);
  const scheduleVersionIds = scheduleRows.map((row) => row.schedule_version_id);
  const [regularRules, holidayClosures, partialOverrides, anomalies] =
    await Promise.all([
      loadRegularRules(db, scheduleVersionIds),
      loadHolidayClosures(db, scheduleVersionIds),
      loadPartialDayOverrides(db, scheduleVersionIds),
      loadScheduleAnomalies(db, scheduleVersionIds),
    ]);

  const scheduleMap = new Map<string, ActiveScheduleRecord>();

  for (const row of scheduleRows) {
    scheduleMap.set(row.center_id, {
      schedule_version_id: row.schedule_version_id,
      raw_schedule_text: row.raw_schedule_text,
      notes_raw: row.notes_raw,
      schedule_confidence: row.parse_confidence,
      open_air_flag: row.open_air_flag === 1,
      regular_rules: regularRules.filter(
        (rule) => rule.schedule_version_id === row.schedule_version_id,
      ),
      holiday_closures: holidayClosures.filter(
        (rule) => rule.schedule_version_id === row.schedule_version_id,
      ),
      partial_day_overrides: partialOverrides.filter(
        (rule) => rule.schedule_version_id === row.schedule_version_id,
      ),
      warnings: anomalies.filter(
        (rule) => rule.schedule_version_id === row.schedule_version_id,
      ),
    });
  }

  return scheduleMap;
}

export async function loadSourceFreshnessByCenterIds(
  db: D1Database,
  centerIds: string[],
): Promise<Map<string, string | null>> {
  if (centerIds.length === 0) {
    return new Map();
  }

  const rows: SourceFreshnessRow[] = [];

  for (const centerIdChunk of chunkValues(centerIds)) {
    const placeholders = buildPlaceholders(centerIdChunk);
    const result = await db
      .prepare(
        `SELECT
          csl.center_id,
          MAX(COALESCE(csl.source_record_updated_at, ir.finished_at)) AS source_last_updated
        FROM center_source_links csl
        LEFT JOIN ingestion_runs ir ON ir.id = csl.run_id
        WHERE csl.center_id IN (${placeholders})
        GROUP BY csl.center_id`,
      )
      .bind(...centerIdChunk)
      .all<SourceFreshnessRow>();

    rows.push(...(result.results ?? []));
  }

  return new Map(
    rows.map((row) => [row.center_id, row.source_last_updated]),
  );
}

export async function getLatestDataVersion(
  db: D1Database,
): Promise<string | null> {
  const result = await db
    .prepare(
      `SELECT MAX(finished_at) AS latest_data_version
      FROM ingestion_runs
      WHERE status = 'completed'`,
    )
    .first<{ latest_data_version: string | null }>();

  return result?.latest_data_version ?? null;
}

export async function listCenters(
  db: D1Database,
  query: Pick<
    ListCentersQuery,
    "kind" | "q" | "has_wifi" | "accessible" | "open_air"
  >,
): Promise<CenterRecord[]> {
  const where = buildWhereClause(query);

  const result = await db
    .prepare(
      `SELECT
        id, slug, kind, name, district, neighborhood, address_line, postal_code, municipality,
        phone, email, website_url, raw_lat, raw_lon, lat, lon, coord_status, coord_resolution_method,
        capacity_value, capacity_text, wifi_flag, sockets_flag, accessibility_flag, open_air_flag,
        notes_raw, is_active, created_at, updated_at
      FROM centers
      WHERE ${where.clause}
      ORDER BY name ASC, id ASC`,
    )
    .bind(...where.bindings)
    .all<CenterRow>();

  return (result.results ?? []).map(hydrateCenter);
}

export async function getCenterBySlug(
  db: D1Database,
  slug: string,
): Promise<{
  center: CenterRecord;
  schedule: ActiveScheduleRecord | null;
  sources: CenterSourceSummary[];
  source_last_updated: string | null;
} | null> {
  const detailResult = await db
    .prepare(
      `SELECT
        id, slug, kind, name, district, neighborhood, address_line, postal_code, municipality,
        phone, email, website_url, raw_lat, raw_lon, lat, lon, coord_status, coord_resolution_method,
        capacity_value, capacity_text, wifi_flag, sockets_flag, accessibility_flag, open_air_flag,
        notes_raw, is_active, created_at, updated_at
      FROM centers
      WHERE slug = ?
      LIMIT 1`,
    )
    .bind(slug)
    .first<CenterRow>();

  if (!detailResult) {
    return null;
  }

  const center = hydrateCenter(detailResult);
  const [scheduleMap, sourceFreshnessMap, sourcesResult] = await Promise.all([
    loadActiveSchedulesByCenterIds(db, [center.id]),
    loadSourceFreshnessByCenterIds(db, [center.id]),
    db
      .prepare(
        `SELECT
          s.code,
          s.name,
          csl.external_id
        FROM center_source_links csl
        JOIN sources s ON s.id = csl.source_id
        WHERE csl.center_id = ?
        ORDER BY csl.is_primary DESC, s.code ASC`,
      )
      .bind(center.id)
      .all<CenterSourceSummary>(),
  ]);

  return {
    center,
    schedule: scheduleMap.get(center.id) ?? null,
    sources: sourcesResult.results ?? [],
    source_last_updated: sourceFreshnessMap.get(center.id) ?? null,
  };
}
