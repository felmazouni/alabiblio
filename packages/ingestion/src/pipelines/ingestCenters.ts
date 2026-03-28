import { createHash, randomUUID } from "node:crypto";
import { librariesSource, loadLibraryRows } from "../sources/libraries";
import { loadStudyRoomRows, studyRoomsSource } from "../sources/studyRooms";
import { normalizeMadridCenterRecord } from "../normalizers/center";
import type {
  IngestionRunSummary,
  NormalizedCenterEnvelope,
  SourceCode,
  SourceDefinition,
} from "../types";

function buildChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function sqlValue(value: boolean | number | string | null): string {
  if (value === null) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function buildRunSql(summary: IngestionRunSummary): string {
  const centerStatements = summary.records.map(({ center }) => {
    return `INSERT INTO centers (
      id, slug, kind, name, district, neighborhood, address_line, postal_code, municipality,
      phone, email, website_url, raw_lat, raw_lon, lat, lon, coord_status, coord_resolution_method,
      capacity_value, capacity_text, wifi_flag, sockets_flag, accessibility_flag, open_air_flag,
      notes_raw, is_active, created_at, updated_at
    ) VALUES (
      ${sqlValue(center.id)},
      ${sqlValue(center.slug)},
      ${sqlValue(center.kind)},
      ${sqlValue(center.name)},
      ${sqlValue(center.district)},
      ${sqlValue(center.neighborhood)},
      ${sqlValue(center.address_line)},
      ${sqlValue(center.postal_code)},
      ${sqlValue(center.municipality)},
      ${sqlValue(center.phone)},
      ${sqlValue(center.email)},
      ${sqlValue(center.website_url)},
      ${sqlValue(center.raw_lat)},
      ${sqlValue(center.raw_lon)},
      ${sqlValue(center.lat)},
      ${sqlValue(center.lon)},
      ${sqlValue(center.coord_status)},
      ${sqlValue(center.coord_resolution_method)},
      ${sqlValue(center.capacity_value)},
      ${sqlValue(center.capacity_text)},
      ${sqlValue(center.wifi_flag)},
      ${sqlValue(center.sockets_flag)},
      ${sqlValue(center.accessibility_flag)},
      ${sqlValue(center.open_air_flag)},
      ${sqlValue(center.notes_raw)},
      ${sqlValue(center.is_active)},
      ${sqlValue(summary.finishedAt)},
      ${sqlValue(summary.finishedAt)}
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      kind = excluded.kind,
      name = excluded.name,
      district = excluded.district,
      neighborhood = excluded.neighborhood,
      address_line = excluded.address_line,
      postal_code = excluded.postal_code,
      municipality = excluded.municipality,
      phone = excluded.phone,
      email = excluded.email,
      website_url = excluded.website_url,
      raw_lat = excluded.raw_lat,
      raw_lon = excluded.raw_lon,
      lat = excluded.lat,
      lon = excluded.lon,
      coord_status = excluded.coord_status,
      coord_resolution_method = excluded.coord_resolution_method,
      capacity_value = excluded.capacity_value,
      capacity_text = excluded.capacity_text,
      wifi_flag = excluded.wifi_flag,
      sockets_flag = excluded.sockets_flag,
      accessibility_flag = excluded.accessibility_flag,
      open_air_flag = excluded.open_air_flag,
      notes_raw = excluded.notes_raw,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at;`;
  });

  const linkStatements = summary.records.map(({ link }) => {
    return `INSERT INTO center_source_links (
      center_id, source_id, external_id, run_id, is_primary,
      source_record_updated_at, raw_payload_r2_key
    ) VALUES (
      ${sqlValue(link.center_id)},
      ${sqlValue(link.source_id)},
      ${sqlValue(link.external_id)},
      ${sqlValue(summary.id)},
      ${sqlValue(link.is_primary)},
      ${sqlValue(link.source_record_updated_at)},
      ${sqlValue(link.raw_payload_r2_key)}
    )
    ON CONFLICT(center_id, source_id, external_id) DO UPDATE SET
      run_id = excluded.run_id,
      is_primary = excluded.is_primary,
      source_record_updated_at = excluded.source_record_updated_at,
      raw_payload_r2_key = excluded.raw_payload_r2_key;`;
  });

  return [
    `INSERT INTO ingestion_runs (
      id, source_id, status, started_at, finished_at, row_count_raw, row_count_valid,
      row_count_rejected, warning_count, error_count, checksum, snapshot_r2_key,
      triggered_by, meta_json
    ) VALUES (
      ${sqlValue(summary.id)},
      ${sqlValue(summary.sourceCode)},
      'running',
      ${sqlValue(summary.startedAt)},
      NULL,
      ${sqlValue(summary.rowCountRaw)},
      0,
      0,
      0,
      0,
      ${sqlValue(summary.checksum)},
      NULL,
      'script',
      NULL
    )
    ON CONFLICT(id) DO NOTHING;`,
    ...centerStatements,
    ...linkStatements,
    `UPDATE ingestion_runs SET
      status = 'completed',
      finished_at = ${sqlValue(summary.finishedAt)},
      row_count_valid = ${sqlValue(summary.rowCountValid)},
      row_count_rejected = ${sqlValue(summary.rowCountRejected)},
      warning_count = ${sqlValue(summary.warningCount)},
      error_count = ${sqlValue(summary.errorCount)}
    WHERE id = ${sqlValue(summary.id)};`,
    "",
  ].join("\n");
}

async function buildSourceRun(
  source: SourceDefinition,
  rowsLoader: typeof loadStudyRoomRows | typeof loadLibraryRows,
): Promise<IngestionRunSummary> {
  const startedAt = new Date().toISOString();
  const { csv, rows } = await rowsLoader();
  const records: NormalizedCenterEnvelope[] = [];
  let rejected = 0;

  for (const row of rows) {
    const normalized = normalizeMadridCenterRecord(row, {
      sourceCode: source.code,
      sourceId: source.code,
      kind: source.code === "study_rooms" ? "study_room" : "library",
      sourceRecordUpdatedAt: null,
    });

    if (normalized) {
      records.push(normalized);
    } else {
      rejected += 1;
    }
  }

  return {
    id: `run_${source.code}_${randomUUID()}`,
    sourceCode: source.code,
    checksum: buildChecksum(csv),
    startedAt,
    finishedAt: new Date().toISOString(),
    rowCountRaw: rows.length,
    rowCountValid: records.length,
    rowCountRejected: rejected,
    warningCount: 0,
    errorCount: 0,
    records,
  };
}

export async function buildCentersIngestionSql(): Promise<string> {
  const studyRun = await buildSourceRun(studyRoomsSource, loadStudyRoomRows);
  const librariesRun = await buildSourceRun(librariesSource, loadLibraryRows);

  return [buildRunSql(studyRun), buildRunSql(librariesRun)].join("\n");
}

export function getDatabaseName(target: string): string {
  switch (target) {
    case "local":
      return "alabiblio-local-db";
    case "staging":
      return "alabiblio-staging-db";
    case "production":
      return "alabiblio-production-db";
    default:
      throw new Error(`Unsupported target: ${target}`);
  }
}
