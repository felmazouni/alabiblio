import type { CenterRecord } from "@alabiblio/contracts/centers";

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

export async function listCenters(db: D1Database): Promise<CenterRecord[]> {
  const result = await db
    .prepare(
      `SELECT
        id, slug, kind, name, district, neighborhood, address_line, postal_code, municipality,
        phone, email, website_url, raw_lat, raw_lon, lat, lon, coord_status, coord_resolution_method,
        capacity_value, capacity_text, wifi_flag, sockets_flag, accessibility_flag, open_air_flag,
        notes_raw, is_active, created_at, updated_at
      FROM centers
      WHERE is_active = 1
      ORDER BY name ASC`,
    )
    .all<CenterRow>();

  const rows = result.results ?? [];

  return rows.map((row) => ({
    ...row,
    wifi_flag: row.wifi_flag === 1,
    sockets_flag: row.sockets_flag === 1,
    accessibility_flag: row.accessibility_flag === 1,
    open_air_flag: row.open_air_flag === 1,
    is_active: row.is_active === 1,
  }));
}
