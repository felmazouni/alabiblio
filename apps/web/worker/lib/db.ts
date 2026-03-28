import type {
  CenterRecord,
  CenterSourceSummary,
  ListCentersQuery,
} from "@alabiblio/contracts/centers";

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

type CenterDetailRow = CenterRow & {
  raw_schedule_text: string | null;
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

function buildWhereClause(filters: Pick<ListCentersQuery, "kind" | "q">): {
  clause: string;
  bindings: string[];
} {
  const clauses = ["is_active = 1"];
  const bindings: string[] = [];

  if (filters.kind) {
    clauses.push("kind = ?");
    bindings.push(filters.kind);
  }

  const query = filters.q?.trim().toLowerCase();

  if (query) {
    clauses.push("LOWER(name) LIKE ?");
    bindings.push(`%${query}%`);
  }

  return {
    clause: clauses.join(" AND "),
    bindings,
  };
}

export async function listCenters(
  db: D1Database,
  query: Required<Pick<ListCentersQuery, "limit" | "offset">> &
    Pick<ListCentersQuery, "kind" | "q">,
): Promise<{ items: CenterRecord[]; total: number }> {
  const where = buildWhereClause(query);

  const listStatement = db
    .prepare(
      `SELECT
        id, slug, kind, name, district, neighborhood, address_line, postal_code, municipality,
        phone, email, website_url, raw_lat, raw_lon, lat, lon, coord_status, coord_resolution_method,
        capacity_value, capacity_text, wifi_flag, sockets_flag, accessibility_flag, open_air_flag,
        notes_raw, is_active, created_at, updated_at
      FROM centers
      WHERE ${where.clause}
      ORDER BY name ASC, id ASC
      LIMIT ? OFFSET ?`,
    )
    .bind(...where.bindings, query.limit, query.offset);

  const totalStatement = db
    .prepare(`SELECT COUNT(*) AS total FROM centers WHERE ${where.clause}`)
    .bind(...where.bindings);

  const [listResult, totalResult] = await Promise.all([
    listStatement.all<CenterRow>(),
    totalStatement.first<{ total: number }>(),
  ]);

  return {
    items: (listResult.results ?? []).map(hydrateCenter),
    total: totalResult?.total ?? 0,
  };
}

export async function getCenterBySlug(
  db: D1Database,
  slug: string,
): Promise<{
  center: CenterRecord;
  rawScheduleText: string | null;
  sources: CenterSourceSummary[];
} | null> {
  const detailResult = await db
    .prepare(
      `SELECT
        c.id, c.slug, c.kind, c.name, c.district, c.neighborhood, c.address_line, c.postal_code,
        c.municipality, c.phone, c.email, c.website_url, c.raw_lat, c.raw_lon, c.lat, c.lon,
        c.coord_status, c.coord_resolution_method, c.capacity_value, c.capacity_text, c.wifi_flag,
        c.sockets_flag, c.accessibility_flag, c.open_air_flag, c.notes_raw, c.is_active,
        c.created_at, c.updated_at,
        (
          SELECT sv.raw_schedule_text
          FROM schedule_versions sv
          WHERE sv.center_id = c.id
          ORDER BY CASE sv.version_status WHEN 'active' THEN 0 ELSE 1 END, sv.created_at DESC, sv.id DESC
          LIMIT 1
        ) AS raw_schedule_text
      FROM centers c
      WHERE c.slug = ?
      LIMIT 1`,
    )
    .bind(slug)
    .first<CenterDetailRow>();

  if (!detailResult) {
    return null;
  }

  const sourcesResult = await db
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
    .bind(detailResult.id)
    .all<CenterSourceSummary>();

  return {
    center: hydrateCenter(detailResult),
    rawScheduleText: detailResult.raw_schedule_text,
    sources: sourcesResult.results ?? [],
  };
}
