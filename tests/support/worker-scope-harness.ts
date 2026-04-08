import worker from "../../apps/web/worker/index";

type CenterRow = {
  id: string;
  slug: string;
  kind: "library" | "study_room";
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
  coord_status: "provided" | "missing" | "invalid";
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

type RegularRuleRow = {
  schedule_version_id: number;
  audience: "sala" | "centro" | "secretaria" | "otros";
  weekday: number;
  opens_at: string;
  closes_at: string;
  sequence: number;
};

type SourceSummaryRow = {
  center_id: string;
  code: string;
  name: string;
  external_id: string;
};

type SourceFreshnessRow = {
  center_id: string;
  source_last_updated: string | null;
};

type SerCoverageRow = {
  center_id: string;
  enabled: number;
  zone_name: string | null;
  coverage_method: string | null;
  distance_m: number | null;
};

type TransportNodeRow = {
  center_id?: string;
  id: string;
  kind: "emt_stop" | "metro_station" | "bicimad_station" | "parking";
  external_id: string;
  name: string;
  address_line: string | null;
  lat: number;
  lon: number;
  metadata_json: string | null;
  distance_m: number;
  rank_order: number;
  is_active?: number;
};

type CenterFeatureRow = {
  center_id: string;
  feature_code: string;
  label: string;
  icon_name: string;
  confidence: "high" | "medium" | "low";
  is_card_visible: number;
  is_filterable: number;
};

const CENTERS: CenterRow[] = [
  {
    id: "center_1",
    slug: "biblioteca-centro",
    kind: "library",
    name: "Biblioteca Centro",
    district: "Centro",
    neighborhood: "Sol",
    address_line: "Calle Mayor 1",
    postal_code: "28013",
    municipality: "Madrid",
    phone: "910000000",
    email: "centro@example.org",
    website_url: "https://example.org",
    raw_lat: 40.4168,
    raw_lon: -3.7038,
    lat: 40.4168,
    lon: -3.7038,
    coord_status: "provided",
    coord_resolution_method: "source",
    capacity_value: 120,
    capacity_text: "120 plazas",
    wifi_flag: 1,
    sockets_flag: 1,
    accessibility_flag: 1,
    open_air_flag: 0,
    notes_raw: null,
    is_active: 1,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "center_2",
    slug: "sala-norte",
    kind: "study_room",
    name: "Sala Norte",
    district: "Tetuan",
    neighborhood: "Cuatro Caminos",
    address_line: "Avenida del Norte 2",
    postal_code: "28020",
    municipality: "Madrid",
    phone: null,
    email: null,
    website_url: null,
    raw_lat: 40.447,
    raw_lon: -3.699,
    lat: 40.447,
    lon: -3.699,
    coord_status: "provided",
    coord_resolution_method: "source",
    capacity_value: 80,
    capacity_text: "80 plazas",
    wifi_flag: 1,
    sockets_flag: 0,
    accessibility_flag: 1,
    open_air_flag: 0,
    notes_raw: null,
    is_active: 1,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
  },
];

const SCHEDULE_VERSIONS: ScheduleVersionRow[] = [
  {
    schedule_version_id: 101,
    center_id: "center_1",
    raw_schedule_text: "L-D 00:00-23:59",
    notes_raw: null,
    parse_confidence: 0.95,
    open_air_flag: 0,
  },
  {
    schedule_version_id: 102,
    center_id: "center_2",
    raw_schedule_text: null,
    notes_raw: null,
    parse_confidence: 0.4,
    open_air_flag: 0,
  },
];

const REGULAR_RULES: RegularRuleRow[] = Array.from({ length: 7 }, (_, index) => ({
  schedule_version_id: 101,
  audience: "sala",
  weekday: index + 1,
  opens_at: "00:00",
  closes_at: "23:59",
  sequence: 1,
}));

const SOURCE_SUMMARIES: SourceSummaryRow[] = [
  {
    center_id: "center_1",
    code: "libraries",
    name: "Libraries",
    external_id: "lib-001",
  },
  {
    center_id: "center_2",
    code: "study_rooms",
    name: "Study Rooms",
    external_id: "study-002",
  },
];

const SOURCE_FRESHNESS: SourceFreshnessRow[] = [
  { center_id: "center_1", source_last_updated: "2026-04-07T10:00:00.000Z" },
  { center_id: "center_2", source_last_updated: "2026-04-07T10:00:00.000Z" },
];

const SER_COVERAGE: SerCoverageRow[] = [
  {
    center_id: "center_1",
    enabled: 1,
    zone_name: "Centro",
    coverage_method: "distance",
    distance_m: 45,
  },
  {
    center_id: "center_2",
    enabled: 0,
    zone_name: null,
    coverage_method: null,
    distance_m: null,
  },
];

const TRANSPORT_NODES: TransportNodeRow[] = [
  {
    id: "origin-stop-1",
    kind: "emt_stop",
    external_id: "emt-origin-1",
    name: "Agustin de Foxa",
    address_line: "Plaza de Castilla",
    lat: 40.4502,
    lon: -3.6898,
    metadata_json: JSON.stringify({ lines: ["3", "5"] }),
    distance_m: 0,
    rank_order: 1,
    is_active: 1,
  },
  {
    id: "origin-metro-1",
    kind: "metro_station",
    external_id: "metro-origin-1",
    name: "Chamartin",
    address_line: null,
    lat: 40.451,
    lon: -3.688,
    metadata_json: JSON.stringify({ lines: ["L1", "L10"] }),
    distance_m: 0,
    rank_order: 1,
    is_active: 1,
  },
  {
    id: "origin-bike-1",
    kind: "bicimad_station",
    external_id: "bike-origin-1",
    name: "Bici Origen",
    address_line: null,
    lat: 40.449,
    lon: -3.691,
    metadata_json: JSON.stringify({ station_number: "201", total_bases: 24 }),
    distance_m: 0,
    rank_order: 1,
    is_active: 1,
  },
  {
    center_id: "center_1",
    id: "dest-stop-1",
    kind: "emt_stop",
    external_id: "emt-dest-1",
    name: "Puerta Toledo",
    address_line: "Ronda de Toledo",
    lat: 40.407,
    lon: -3.711,
    metadata_json: JSON.stringify({ lines: ["3"] }),
    distance_m: 180,
    rank_order: 1,
    is_active: 1,
  },
  {
    center_id: "center_1",
    id: "dest-metro-1",
    kind: "metro_station",
    external_id: "metro-dest-1",
    name: "Sol",
    address_line: null,
    lat: 40.416,
    lon: -3.703,
    metadata_json: JSON.stringify({ lines: ["L1"] }),
    distance_m: 220,
    rank_order: 2,
    is_active: 1,
  },
  {
    center_id: "center_1",
    id: "dest-bike-1",
    kind: "bicimad_station",
    external_id: "bike-dest-1",
    name: "Bici Destino",
    address_line: null,
    lat: 40.417,
    lon: -3.704,
    metadata_json: JSON.stringify({ station_number: "301", total_bases: 30 }),
    distance_m: 140,
    rank_order: 3,
    is_active: 1,
  },
  {
    center_id: "center_1",
    id: "parking-1",
    kind: "parking",
    external_id: "parking-1",
    name: "Parking Centro",
    address_line: null,
    lat: 40.417,
    lon: -3.705,
    metadata_json: null,
    distance_m: 260,
    rank_order: 4,
    is_active: 1,
  },
];

const CENTER_FEATURES: CenterFeatureRow[] = [
  {
    center_id: "center_1",
    feature_code: "wifi",
    label: "WiFi",
    icon_name: "wifi",
    confidence: "high",
    is_card_visible: 1,
    is_filterable: 1,
  },
];

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function parseLimit(sql: string): number | null {
  const match = sql.match(/LIMIT (\d+)/i);
  return match ? Number(match[1]) : null;
}

function parseOffset(sql: string): number {
  const match = sql.match(/OFFSET (\d+)/i);
  return match ? Number(match[1]) : 0;
}

function activeCenters(): CenterRow[] {
  return [...CENTERS]
    .filter((center) => center.is_active === 1)
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

function buildFirst(sql: string, bindings: unknown[]) {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.includes("SELECT MAX(finished_at) AS latest_data_version")) {
    return { latest_data_version: "2026-04-07T10:00:00.000Z" };
  }

  if (normalizedSql.includes("SELECT COUNT(*) AS total FROM centers")) {
    return { total: activeCenters().length };
  }

  if (normalizedSql.includes("FROM centers WHERE slug = ? LIMIT 1")) {
    const slug = String(bindings[0] ?? "");
    return CENTERS.find((center) => center.slug === slug) ?? null;
  }

  if (normalizedSql.includes("FROM center_ser_coverage") && normalizedSql.includes("LIMIT 1")) {
    const centerId = String(bindings[0] ?? "");
    return SER_COVERAGE.find((row) => row.center_id === centerId) ?? null;
  }

  return null;
}

function buildAll(sql: string, bindings: unknown[]) {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.includes("FROM centers") && normalizedSql.includes("ORDER BY name ASC, id ASC")) {
    const limit = parseLimit(normalizedSql);
    const offset = parseOffset(normalizedSql);
    const rows = activeCenters();
    return limit === null ? rows : rows.slice(offset, offset + limit);
  }

  if (normalizedSql.includes("FROM ranked") && normalizedSql.includes("WHERE row_number = 1")) {
    const centerIds = bindings.map(String);
    return SCHEDULE_VERSIONS.filter((row) => centerIds.includes(row.center_id));
  }

  if (normalizedSql.includes("FROM regular_rules")) {
    const scheduleVersionIds = bindings.map(Number);
    return REGULAR_RULES.filter((row) => scheduleVersionIds.includes(row.schedule_version_id));
  }

  if (normalizedSql.includes("FROM holiday_closures")) {
    return [];
  }

  if (normalizedSql.includes("FROM partial_day_overrides")) {
    return [];
  }

  if (normalizedSql.includes("FROM schedule_parse_anomalies")) {
    return [];
  }

  if (normalizedSql.includes("MAX(COALESCE(csl.source_record_updated_at, ir.finished_at)) AS source_last_updated")) {
    const centerIds = bindings.map(String);
    return SOURCE_FRESHNESS.filter((row) => centerIds.includes(row.center_id));
  }

  if (normalizedSql.includes("FROM center_source_links csl JOIN sources s ON s.id = csl.source_id")) {
    const centerId = String(bindings[0] ?? "");
    return SOURCE_SUMMARIES
      .filter((row) => row.center_id === centerId)
      .map(({ center_id: _centerId, ...row }) => row);
  }

  if (normalizedSql.includes("FROM center_ser_coverage") && normalizedSql.includes("IN (")) {
    const centerIds = bindings.map(String);
    return SER_COVERAGE.filter((row) => centerIds.includes(row.center_id));
  }

  if (normalizedSql.includes("FROM center_transport_links ctl JOIN transport_nodes tn ON tn.id = ctl.transport_node_id") && normalizedSql.includes("WHERE ctl.center_id = ?")) {
    const centerId = String(bindings[0] ?? "");
    return TRANSPORT_NODES.filter((row) => row.center_id === centerId).map(({ is_active: _isActive, ...row }) => row);
  }

  if (normalizedSql.includes("FROM center_transport_links ctl JOIN transport_nodes tn ON tn.id = ctl.transport_node_id") && normalizedSql.includes("WHERE ctl.center_id IN")) {
    const centerIds = bindings.map(String);
    return TRANSPORT_NODES.filter((row) => row.center_id && centerIds.includes(row.center_id))
      .map(({ is_active: _isActive, ...row }) => row);
  }

  if (normalizedSql.includes("FROM transport_nodes") && normalizedSql.includes("WHERE is_active = 1") && normalizedSql.includes("kind IN")) {
    const kinds = bindings.map(String);
    return TRANSPORT_NODES
      .filter((row) => row.is_active === 1 && kinds.includes(row.kind))
      .map(({ center_id: _centerId, distance_m: _distanceM, rank_order: _rankOrder, is_active: _isActive, ...row }) => row);
  }

  if (normalizedSql.includes("FROM center_features")) {
    const centerIds = bindings.map(String);
    return CENTER_FEATURES.filter((row) => centerIds.includes(row.center_id));
  }

  return [];
}

function createFakeDb() {
  function createStatement(sql: string, bindings: unknown[] = []) {
    return {
      bind(...nextBindings: unknown[]) {
        return createStatement(sql, nextBindings);
      },
      async first() {
        return buildFirst(sql, bindings);
      },
      async all() {
        return {
          results: buildAll(sql, bindings),
        };
      },
    };
  }

  return {
    prepare(sql: string) {
      return createStatement(sql);
    },
  };
}

function installMemoryCache() {
  const store = new Map<string, Response>();
  const previousCaches = (globalThis as typeof globalThis & { caches?: unknown }).caches;

  (globalThis as typeof globalThis & {
    caches: {
      default: {
        match(request: Request): Promise<Response | undefined>;
        put(request: Request, response: Response): Promise<void>;
      };
    };
  }).caches = {
    default: {
      async match(request: Request) {
        return store.get(request.url)?.clone();
      },
      async put(request: Request, response: Response) {
        store.set(request.url, response.clone());
      },
    },
  };

  return () => {
    if (previousCaches === undefined) {
      delete (globalThis as typeof globalThis & { caches?: unknown }).caches;
      return;
    }

    (globalThis as typeof globalThis & { caches?: unknown }).caches = previousCaches;
  };
}

export function createWorkerScopeHarness() {
  const restoreCaches = installMemoryCache();
  const pendingWaitUntil: Promise<unknown>[] = [];
  const env = {
    APP_ENV: "test",
    ASSETS: {
      fetch: async () => new Response("asset", { status: 200 }),
    },
    DB: createFakeDb(),
  };
  const ctx = {
    waitUntil(promise: Promise<unknown>) {
      pendingWaitUntil.push(promise);
      return undefined;
    },
  };

  return {
    centerSlug: "biblioteca-centro",
    origin: {
      lat: 40.4502,
      lon: -3.6898,
    },
    async request(pathname: string): Promise<Response> {
      const response = await worker.fetch(
        new Request(`https://example.test${pathname}`),
        env as never,
        ctx as never,
      );
      await Promise.allSettled(pendingWaitUntil.splice(0));
      return response;
    },
    async requestJson<T>(pathname: string): Promise<T> {
      const response = await this.request(pathname);
      return await response.json() as T;
    },
    cleanup() {
      restoreCaches();
    },
  };
}

export default {
  createWorkerScopeHarness,
};
