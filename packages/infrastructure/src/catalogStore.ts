import type {
  CenterCatalogItem,
  CenterKind,
  DataOrigin,
  DataQualityFlags,
  PublicCatalogQuery,
  PublicCatalogResponse,
  PublicCenterDetailResponse,
  PublicFiltersResponse,
  ScheduleRule,
  ScheduleSummary,
  SortMode,
  TransportMode,
  TransportOption,
} from "@alabiblio/contracts";
import {
  buildCenterSlug,
  formatDistance,
  haversineDistanceMeters,
  isInteriorStudySpaceCandidate,
  kindLabel,
  normalizePhone,
  normalizeSearch,
  parseOfficialTransportText,
  parseSchedule,
  repairSourceText,
  walkingMinutesFromDistance,
} from "@alabiblio/domain";
import {
  type BicimadStation,
  type CrtmStop,
  type EmtStop,
  type SerZone,
  findNearestBicimadStation,
  findNearestBicimadStationToUser,
  findNearestCrtmStopByName,
  findNearestEmtStop,
  findNearestEmtStopByLines,
  findSerZone,
  loadBicimadStations,
  loadCrtmCercaniasStops,
  loadCrtmInterurbanStops,
  loadCrtmMetroStops,
  loadEmtStops,
  loadSerZones,
} from "./transportData";

type SourceCode = "libraries" | "study_rooms";

interface SourceConfig {
  libraries: string;
  studyRooms: string;
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
}

interface D1LikeDatabase {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

interface CatalogStoreOptions {
  database?: unknown;
  sources: SourceConfig;
}

interface MadridOpenDataRecord {
  id?: string | number;
  title?: string;
  relation?: string;
  address?: {
    locality?: string;
    "postal-code"?: string;
    "street-address"?: string;
    district?: { "@id"?: string };
    area?: { "@id"?: string };
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  organization?: {
    accesibility?: string;
    schedule?: string;
    services?: string;
    "organization-desc"?: string;
    "organization-name"?: string;
    telephone?: string;
    email?: string;
  };
}

interface NormalizedCenter {
  id: string;
  slug: string;
  kind: CenterKind;
  sourceCode: SourceCode;
  externalId: string;
  name: string;
  addressLine: string | null;
  district: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  accessibility: boolean;
  accessibilityOrigin: DataOrigin;
  wifi: boolean;
  wifiOrigin: DataOrigin;
  openAir: boolean;
  capacityValue: number | null;
  capacityOrigin: DataOrigin;
  servicesText: string | null;
  transportText: string | null;
  schedule: ScheduleSummary;
  rawJson: string;
}

interface RejectedCenter {
  id: string;
  sourceCode: SourceCode;
  externalId: string;
  title: string | null;
  reason: "missing_external_id_or_name" | "not_interior_study_space_candidate";
  rawJson: string;
}

interface StoredCenterRow {
  id: string;
  slug: string;
  kind: CenterKind;
  name: string;
  address_line: string | null;
  district: string | null;
  neighborhood: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  accessibility: number;
  wifi: number;
  open_air: number;
  capacity_value: number | null;
  services_text: string | null;
  transport_text: string | null;
  source_code: string;
  rating_average: number | null;
  rating_count: number;
  schedule_text_raw: string | null;
  schedule_summary_text: string | null;
  schedule_confidence: ScheduleSummary["confidence"];
  schedule_notes_unparsed: string | null;
  schedule_needs_review: number;
}

interface BaseCenterRecord {
  id: string;
  slug: string;
  kind: CenterKind;
  kindLabel: string;
  name: string;
  addressLine: string | null;
  district: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  accessibility: boolean;
  accessibilityOrigin: DataOrigin;
  wifi: boolean;
  wifiOrigin: DataOrigin;
  openAir: boolean;
  capacityValue: number | null;
  capacityOrigin: DataOrigin;
  servicesText: string | null;
  transportText: string | null;
  sourceCode: string;
  ratingAverage: number | null;
  ratingCount: number;
  schedule: ScheduleSummary;
}

type EnrichedCenterRecord = CenterCatalogItem;

interface StoredTransportOptionRow {
  center_id: string;
  option_id: string;
  mode: TransportMode;
  title: string;
  source_label: string;
  data_origin: CenterCatalogItem["ratingOrigin"];
  destination_node_id: string | null;
  destination_node_name: string | null;
  summary: string;
  lines_json: string | null;
  origin_label: string | null;
  destination_label: string | null;
  walk_distance_m_to_center: number | null;
  walk_time_min_to_center: number | null;
  wait_minutes: number | null;
  total_minutes: number | null;
  station_name: string | null;
  stop_name: string | null;
  ser_zone_label: string | null;
  availability_text: string | null;
  note: string | null;
  external_url: string | null;
  display_priority: number;
  relevance_score: number;
  fetched_at: string;
  cache_ttl_seconds: number;
  is_active: number;
  destination_latitude: number | null;
  destination_longitude: number | null;
  destination_node_label: string | null;
}

interface StoredTransportOption {
  centerId: string;
  optionId: string;
  mode: TransportMode;
  title: string;
  sourceLabel: string;
  dataOrigin: CenterCatalogItem["ratingOrigin"];
  destinationNodeId: string | null;
  destinationNodeName: string | null;
  summary: string;
  lines: string[];
  originLabel: string | null;
  destinationLabel: string | null;
  metrics: TransportOption["metrics"];
  stationName: string | null;
  stopName: string | null;
  serZoneLabel: string | null;
  availabilityText: string | null;
  note: string | null;
  externalUrl: string | null;
  displayPriority: number;
  relevanceScore: number;
  fetchedAt: string;
  cacheTtlSeconds: number;
  isActive: boolean;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationNodeLabel: string | null;
}

interface CenterTransportSnapshot {
  options: StoredTransportOption[];
  serZoneLabel: string | null;
}

interface UserResolvedTransportCacheEntry {
  expiresAt: number;
  options: TransportOption[];
  serZoneLabel: string | null;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sources (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dataset_url TEXT NOT NULL,
    last_ingested_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ingestion_runs (
    id TEXT PRIMARY KEY,
    source_code TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    item_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS center_ingestion_rejections (
    id TEXT PRIMARY KEY,
    source_code TEXT NOT NULL,
    external_id TEXT,
    title TEXT,
    reason TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS centers (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    external_id TEXT NOT NULL,
    source_code TEXT NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    address_line TEXT,
    district TEXT,
    neighborhood TEXT,
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    phone TEXT,
    email TEXT,
    website_url TEXT,
    accessibility INTEGER NOT NULL DEFAULT 0,
    wifi INTEGER NOT NULL DEFAULT 0,
    open_air INTEGER NOT NULL DEFAULT 0,
    capacity_value INTEGER,
    services_text TEXT,
    transport_text TEXT,
    schedule_text_raw TEXT,
    schedule_summary_text TEXT,
    schedule_confidence TEXT,
    schedule_notes_unparsed TEXT,
    schedule_needs_review INTEGER NOT NULL DEFAULT 0,
    rating_average REAL,
    rating_count INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS center_schedule_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    center_id TEXT NOT NULL,
    weekday INTEGER NOT NULL,
    opens_at TEXT NOT NULL,
    closes_at TEXT NOT NULL,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS center_admin_users (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending_activation',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS center_rating_votes (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL,
    rating_value INTEGER NOT NULL,
    voter_fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS center_transport_snapshots (
    center_id TEXT PRIMARY KEY,
    generated_at TEXT NOT NULL,
    snapshot_version TEXT NOT NULL,
    active_option_count INTEGER NOT NULL DEFAULT 0,
    realtime_option_count INTEGER NOT NULL DEFAULT 0,
    structured_option_count INTEGER NOT NULL DEFAULT 0,
    parsed_option_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS center_transport_nodes (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    external_node_id TEXT,
    destination_node_id TEXT,
    node_role TEXT NOT NULL,
    node_name TEXT NOT NULL,
    node_label TEXT,
    latitude REAL,
    longitude REAL,
    line_codes_json TEXT,
    walking_distance_m_to_center INTEGER,
    walking_time_min_to_center INTEGER,
    relevance_score REAL NOT NULL DEFAULT 0,
    display_priority INTEGER NOT NULL DEFAULT 0,
    cache_ttl_seconds INTEGER NOT NULL DEFAULT 86400,
    fetched_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS center_transport_options (
    option_id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    title TEXT NOT NULL,
    source_label TEXT NOT NULL,
    data_origin TEXT NOT NULL,
    destination_node_id TEXT,
    destination_node_name TEXT,
    summary TEXT NOT NULL,
    lines_json TEXT,
    origin_label TEXT,
    destination_label TEXT,
    walk_distance_m_to_center INTEGER,
    walk_time_min_to_center INTEGER,
    wait_minutes INTEGER,
    total_minutes INTEGER,
    station_name TEXT,
    stop_name TEXT,
    ser_zone_label TEXT,
    availability_text TEXT,
    note TEXT,
    external_url TEXT,
    display_priority INTEGER NOT NULL DEFAULT 0,
    relevance_score REAL NOT NULL DEFAULT 0,
    fetched_at TEXT NOT NULL,
    cache_ttl_seconds INTEGER NOT NULL DEFAULT 86400,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS center_transport_relevance (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    relevance_score REAL NOT NULL,
    display_priority INTEGER NOT NULL,
    computed_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS center_ser_coverage (
    center_id TEXT PRIMARY KEY,
    source_kind TEXT NOT NULL,
    zone_label TEXT,
    district TEXT,
    neighborhood TEXT,
    fetched_at TEXT NOT NULL,
    cache_ttl_seconds INTEGER NOT NULL DEFAULT 604800,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS transport_source_runs (
    id TEXT PRIMARY KEY,
    source_code TEXT NOT NULL,
    source_url TEXT NOT NULL,
    item_count INTEGER NOT NULL DEFAULT 0,
    fetched_at TEXT NOT NULL,
    source_kind TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_json TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_centers_source_code ON centers(source_code)`,
  `CREATE INDEX IF NOT EXISTS idx_centers_kind ON centers(kind)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_rules_center ON center_schedule_rules(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_center_admin_users_center ON center_admin_users(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_center_rating_votes_center ON center_rating_votes(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transport_options_center ON center_transport_options(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transport_nodes_center ON center_transport_nodes(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transport_relevance_center ON center_transport_relevance(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transport_source_runs_code ON transport_source_runs(source_code)`,
  `CREATE INDEX IF NOT EXISTS idx_transport_source_runs_fetched ON transport_source_runs(fetched_at)`,
  `CREATE TABLE IF NOT EXISTS center_schedule_overrides (
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
  )`,
  `CREATE TABLE IF NOT EXISTS center_schedule_manual_review_queue (
    id TEXT PRIMARY KEY,
    center_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    raw_text TEXT,
    reviewed_at TEXT,
    reviewed_by TEXT,
    review_action TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(center_id) REFERENCES centers(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_overrides_center ON center_schedule_overrides(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_review_center ON center_schedule_manual_review_queue(center_id)`,
  `CREATE INDEX IF NOT EXISTS idx_centers_needs_review ON centers(schedule_needs_review)`,
];

const DEFAULT_PUBLIC_QUERY: Required<PublicCatalogQuery> = {
  q: "",
  lat: Number.NaN,
  lon: Number.NaN,
  radiusMeters: 120000,
  kinds: [],
  transportModes: [],
  openNow: false,
  accessible: false,
  withWifi: false,
  withCapacity: false,
  sort: "relevance",
  limit: 500,
};

const TRANSPORT_ORDER: Record<TransportMode, number> = {
  metro: 1,
  cercanias: 2,
  metro_ligero: 3,
  emt_bus: 4,
  interurban_bus: 5,
  bicimad: 6,
  car: 7,
};

const TRANSPORT_SNAPSHOT_VERSION = "2026-04-19.v2";
const TRANSPORT_SOURCE_URLS = {
  emt: "https://datos.madrid.es/dataset/900023-0-emt-paradas-autobus/resource/900023-0-emt-paradas-autobus/download/900023-0-emt-paradas-autobus.csv",
  crtmMetro: "https://crtm.maps.arcgis.com/sharing/rest/content/items/5c7f2951962540d69ffe8f640d94c246/data",
  crtmCercanias: "https://crtm.maps.arcgis.com/sharing/rest/content/items/1a25440bf66f499bae2657ec7fb40144/data",
  crtmInterurban: "https://crtm.maps.arcgis.com/sharing/rest/content/items/885399f83408473c8d815e40c5e702b7/data",
  bicimad: "https://datos.emtmadrid.es/dataset/5fcc0945-2cbd-46c3-801a-6a83f4167c11/resource/105ce5df-793f-4e0a-a88e-5d3b3f024a5d/download/bikestationbicimad_geojson.json",
  ser: "https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/SERVICIO_DE_ESTACIONAMIENTO_REGULADO/MapServer/3/query?where=1%3D1&outFields=OBJECTID%2CNOMBAR%2CNOMDIS&returnGeometry=true&f=geojson",
} as const;

const transportResolutionCache = new Map<string, UserResolvedTransportCacheEntry>();
const inflightTransportResolutions = new Map<string, Promise<UserResolvedTransportCacheEntry>>();
let transportSnapshotRefreshPromise: Promise<void> | null = null;

function asDatabase(database: unknown): D1LikeDatabase | null {
  if (database && typeof database === "object" && "prepare" in database) {
    return database as D1LikeDatabase;
  }

  return null;
}

async function runStatementsInChunks(
  database: D1LikeDatabase,
  statements: D1Statement[],
  chunkSize = 20,
): Promise<void> {
  for (let index = 0; index < statements.length; index += chunkSize) {
    await database.batch(statements.slice(index, index + chunkSize));
  }
}

function coarseLocationKey(lat: number, lon: number): string {
  const bucketSize = 0.01;
  const bucketedLat = Math.round(lat / bucketSize) * bucketSize;
  const bucketedLon = Math.round(lon / bucketSize) * bucketSize;
  return `${bucketedLat.toFixed(2)}:${bucketedLon.toFixed(2)}`;
}

function ttlSecondsForOrigin(origin: CenterCatalogItem["ratingOrigin"], mode: TransportMode): number {
  if (origin === "realtime") {
    return mode === "emt_bus" ? 90 : 180;
  }

  if (origin === "heuristic") {
    return 1800;
  }

  if (origin === "official_text_parsed") {
    return 86400;
  }

  return mode === "car" ? 604800 : 86400;
}

function transportNodeRowId(centerId: string, option: StoredTransportOption): string {
  return `${centerId}:${option.destinationNodeId ?? option.optionId}`;
}

function inferWifi(servicesText: string | null, transportText: string | null): boolean {
  const haystack = `${servicesText ?? ""} ${transportText ?? ""}`.toLowerCase();
  return haystack.includes("wifi") || haystack.includes("wi-fi");
}

function inferCapacity(servicesText: string | null): number | null {
  if (!servicesText) {
    return null;
  }

  const match = servicesText.match(/aforo\s*:?\s*(\d{1,4})/i);
  return match?.[1] ? Number(match[1]) : null;
}

function toBooleanFlag(value: string | undefined): boolean {
  return value === "1";
}

function normalizeRecord(
  record: MadridOpenDataRecord,
  sourceCode: SourceCode,
): { accepted: NormalizedCenter | null; rejected: RejectedCenter | null } {
  const externalId = String(record.id ?? "").trim();
  const name = repairSourceText(record.organization?.["organization-name"] ?? record.title);
  const servicesText = repairSourceText(record.organization?.services);
  const schedule = parseSchedule(record.organization?.schedule);

  if (!externalId || !name) {
    return {
      accepted: null,
      rejected: {
        id: `${sourceCode}:${externalId || "missing"}:missing_external_id_or_name`,
        sourceCode,
        externalId,
        title: name,
        reason: "missing_external_id_or_name",
        rawJson: JSON.stringify(record),
      },
    };
  }

  const kind: CenterKind = sourceCode === "libraries" ? "library" : "study_room";

  if (
    !isInteriorStudySpaceCandidate({
      kind,
      title: name,
      services: servicesText,
      schedule: schedule.rawText,
    })
  ) {
    return {
      accepted: null,
      rejected: {
        id: `${sourceCode}:${externalId}:not_interior_study_space_candidate`,
        sourceCode,
        externalId,
        title: name,
        reason: "not_interior_study_space_candidate",
        rawJson: JSON.stringify(record),
      },
    };
  }

  const district = repairSourceText(record.address?.district?.["@id"]?.split("/").filter(Boolean).at(-1) ?? null);
  const neighborhood = repairSourceText(record.address?.area?.["@id"]?.split("/").filter(Boolean).at(-1) ?? null);
  const slug = buildCenterSlug([kind, district ?? "", externalId, name]);
  const addressLine = repairSourceText(record.address?.["street-address"]);
  const transportText = repairSourceText(record.organization?.["organization-desc"]);
  const accessibility = toBooleanFlag(record.organization?.accesibility);
  const wifi = inferWifi(servicesText, transportText);
  const capacityValue = inferCapacity(servicesText);

  return {
    accepted: {
      id: `${sourceCode}:${externalId}`,
      slug,
      kind,
      sourceCode,
      externalId,
      name,
      addressLine,
      district,
      neighborhood,
      postalCode: repairSourceText(record.address?.["postal-code"]),
      latitude:
        typeof record.location?.latitude === "number" ? record.location.latitude : null,
      longitude:
        typeof record.location?.longitude === "number" ? record.location.longitude : null,
      phone: normalizePhone(record.organization?.telephone),
      email: repairSourceText(record.organization?.email),
      websiteUrl: repairSourceText(record.relation),
      accessibility,
      accessibilityOrigin: accessibility ? "official_structured" : "not_available",
      wifi,
      wifiOrigin: wifi ? "official_text_parsed" : "not_available",
      openAir: false,
      capacityValue,
      capacityOrigin: capacityValue !== null ? "official_text_parsed" : "not_available",
      servicesText,
      transportText,
      schedule,
      rawJson: JSON.stringify(record),
    },
    rejected: null,
  };
}

async function fetchOfficialDataset(url: string): Promise<MadridOpenDataRecord[]> {
  console.log(
    JSON.stringify({
      event: "ingest_fetch_start",
      source_url: url,
    }),
  );

  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      "user-agent": "alabiblio-catalog-ingest/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Official dataset fetch failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { "@graph"?: MadridOpenDataRecord[] };
  const records = payload["@graph"] ?? [];

  console.log(
    JSON.stringify({
      event: "ingest_fetch_complete",
      source_url: url,
      status: response.status,
      item_count: records.length,
    }),
  );

  return records;
}

async function hydrateLiveCatalog(
  sources: SourceConfig,
): Promise<{ centers: NormalizedCenter[]; rejections: RejectedCenter[] }> {
  const [libraries, studyRooms] = await Promise.all([
    fetchOfficialDataset(sources.libraries),
    fetchOfficialDataset(sources.studyRooms),
  ]);

  const normalized = [
    ...libraries.map((record) => normalizeRecord(record, "libraries")),
    ...studyRooms.map((record) => normalizeRecord(record, "study_rooms")),
  ];
  const centers = normalized
    .map((item) => item.accepted)
    .filter((center): center is NormalizedCenter => center !== null);
  const rejections = normalized
    .map((item) => item.rejected)
    .filter((item): item is RejectedCenter => item !== null);

  console.log(
    JSON.stringify({
      event: "ingest_normalized",
      source_libraries: libraries.length,
      source_study_rooms: studyRooms.length,
      kept_centers: centers.length,
      rejected_centers: rejections.length,
    }),
  );

  return { centers, rejections };
}

async function ensureSchema(database: D1LikeDatabase): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await database.prepare(statement).run();
  }
}

async function countCenters(database: D1LikeDatabase): Promise<number> {
  const row = await database
    .prepare("SELECT COUNT(*) AS total FROM centers")
    .first<{ total: number }>();

  return row?.total ?? 0;
}

async function replaceCatalog(
  database: D1LikeDatabase,
  centers: NormalizedCenter[],
  rejections: RejectedCenter[],
  sources: SourceConfig,
) {
  await database.prepare("DELETE FROM center_ingestion_rejections").run();
  await database.prepare("DELETE FROM center_schedule_rules").run();
  await database.prepare("DELETE FROM center_schedule_overrides").run();
  await database.prepare("DELETE FROM center_schedule_manual_review_queue").run();
  await database.prepare("DELETE FROM center_transport_relevance").run();
  await database.prepare("DELETE FROM center_transport_options").run();
  await database.prepare("DELETE FROM center_transport_nodes").run();
  await database.prepare("DELETE FROM center_transport_snapshots").run();
  await database.prepare("DELETE FROM center_ser_coverage").run();
  await database.prepare("DELETE FROM centers").run();

  const now = new Date().toISOString();
  const statements: D1Statement[] = [];

  statements.push(
    database
      .prepare(
        "INSERT OR REPLACE INTO sources (code, name, dataset_url, last_ingested_at) VALUES (?, ?, ?, ?)",
      )
      .bind("libraries", "Bibliotecas de Madrid", sources.libraries, now),
    database
      .prepare(
        "INSERT OR REPLACE INTO sources (code, name, dataset_url, last_ingested_at) VALUES (?, ?, ?, ?)",
      )
      .bind("study_rooms", "Salas de estudio y lectura", sources.studyRooms, now),
  );

  for (const center of centers) {
    statements.push(
      database
        .prepare(
          `INSERT INTO centers (
            id, slug, external_id, source_code, kind, name, address_line, district, neighborhood,
            postal_code, latitude, longitude, phone, email, website_url, accessibility, wifi,
            open_air, capacity_value, services_text, transport_text, schedule_text_raw,
            schedule_summary_text, schedule_confidence, schedule_notes_unparsed, schedule_needs_review,
            rating_average, rating_count, raw_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          center.id,
          center.slug,
          center.externalId,
          center.sourceCode,
          center.kind,
          center.name,
          center.addressLine,
          center.district,
          center.neighborhood,
          center.postalCode,
          center.latitude,
          center.longitude,
          center.phone,
          center.email,
          center.websiteUrl,
          center.accessibility ? 1 : 0,
          center.wifi ? 1 : 0,
          center.openAir ? 1 : 0,
          center.capacityValue,
          center.servicesText,
          center.transportText,
          center.schedule.rawText,
          center.schedule.displayText,
          center.schedule.confidence,
          center.schedule.notesUnparsed,
          center.schedule.needsManualReview ? 1 : 0,
          null,
          0,
          center.rawJson,
          now,
          now,
        ),
    );

    for (const rule of center.schedule.rules) {
      statements.push(
        database
          .prepare(
            "INSERT INTO center_schedule_rules (center_id, weekday, opens_at, closes_at) VALUES (?, ?, ?, ?)",
          )
          .bind(center.id, rule.weekday, rule.opensAt, rule.closesAt),
      );
    }

    for (const [overrideIndex, override] of center.schedule.overrides.entries()) {
      const overrideId = `${center.id}:override:${override.kind}:${override.fromDate ?? "nodate"}:${overrideIndex}`;
      statements.push(
        database
          .prepare(
            `INSERT INTO center_schedule_overrides
              (id, center_id, kind, label, rules_json, from_date, to_date, notes, closed, source, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'parsed', ?)`,
          )
          .bind(
            overrideId,
            center.id,
            override.kind,
            override.label,
            override.rules.length > 0 ? JSON.stringify(override.rules) : null,
            override.fromDate,
            override.toDate,
            override.notes,
            override.closed ? 1 : 0,
            now,
          ),
      );
    }

    if (center.schedule.needsManualReview) {
      statements.push(
        database
          .prepare(
            `INSERT INTO center_schedule_manual_review_queue
              (id, center_id, reason, raw_text, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(
            `${center.id}:review`,
            center.id,
            center.schedule.confidence === "needs_manual_review"
              ? "no_rules_found"
              : "low_confidence",
            center.schedule.rawText,
            now,
          ),
      );
    }
  }

  for (const rejection of rejections) {
    statements.push(
      database
        .prepare(
          "INSERT INTO center_ingestion_rejections (id, source_code, external_id, title, reason, raw_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          rejection.id,
          rejection.sourceCode,
          rejection.externalId || null,
          rejection.title,
          rejection.reason,
          rejection.rawJson,
          now,
        ),
    );
  }

  await runStatementsInChunks(database, statements);

  await replaceTransportSnapshots(
    database,
    centers.map((center) => toBaseCenterRecord(center)),
  );

  console.log(
    JSON.stringify({
      event: "catalog_replace_complete",
      total_centers: centers.length,
      total_rejections: rejections.length,
    }),
  );
}

function formatTimeFromIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildScheduleLabel(schedule: ScheduleSummary): string {
  const nextChange = formatTimeFromIso(schedule.nextChangeAt);

  if (schedule.isOpenNow === true) {
    return nextChange ? `Abierta hasta ${nextChange}` : "Abierta ahora";
  }

  if (schedule.isOpenNow === false) {
    return nextChange ? `Abre a las ${nextChange}` : "Cerrada ahora";
  }

  return schedule.todaySummary ?? schedule.displayText ?? "Horario pendiente de revision";
}

function buildHeadlineStatus(schedule: ScheduleSummary): CenterCatalogItem["headlineStatus"] {
  if (schedule.isOpenNow === true) {
    return "Abierta";
  }

  if (schedule.isOpenNow === false) {
    return "Cerrada";
  }

  return "Revision manual";
}

function buildMapsUrl(item: BaseCenterRecord): string | null {
  if (item.latitude === null || item.longitude === null) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
}

function buildDataQualityFlags(item: BaseCenterRecord, transportOptions: TransportOption[], distanceMeters: number | null): DataQualityFlags {
  return {
    hasRealDistance: distanceMeters !== null,
    hasRealCapacity: item.capacityValue !== null,
    hasStructuredTransport: transportOptions.some(
      (option) => option.dataOrigin === "official_structured" || option.dataOrigin === "realtime",
    ),
    hasRealtimeTransport: transportOptions.some((option) => option.dataOrigin === "realtime"),
    hasIncidents: false,
    hasRatings: item.ratingCount > 0 && item.ratingAverage !== null,
    needsManualScheduleReview: item.schedule.needsManualReview,
  };
}

function buildTransportSummary(mode: TransportMode, name: string | null, lines: string[], distanceMeters: number | null): string {
  const lineSummary = lines.length > 0 ? ` ${lines.join(", ")}` : "";
  const distanceLabel = formatDistance(distanceMeters);

  if (mode === "emt_bus") {
    return [name ? `Parada ${name}` : "Parada EMT", lineSummary.trim(), distanceLabel ? `a ${distanceLabel}` : null]
      .filter(Boolean)
      .join(" · ");
  }

  if (mode === "bicimad") {
    return [name ?? "Estacion BiciMAD", distanceLabel ? `a ${distanceLabel}` : null]
      .filter(Boolean)
      .join(" · ");
  }

  return [name ?? "Conexion", lineSummary.trim()].filter(Boolean).join(" · ");
}

function toStoredTransportOption(row: StoredTransportOptionRow): StoredTransportOption {
  return {
    centerId: row.center_id,
    optionId: row.option_id,
    mode: row.mode,
    title: row.title,
    sourceLabel: row.source_label,
    dataOrigin: row.data_origin,
    destinationNodeId: row.destination_node_id,
    destinationNodeName: row.destination_node_name,
    summary: row.summary,
    lines: row.lines_json ? (JSON.parse(row.lines_json) as string[]) : [],
    originLabel: row.origin_label,
    destinationLabel: row.destination_label,
    metrics: {
      walkDistanceMeters: row.walk_distance_m_to_center,
      walkMinutes: row.walk_time_min_to_center,
      waitMinutes: row.wait_minutes,
      totalMinutes: row.total_minutes,
    },
    stationName: row.station_name,
    stopName: row.stop_name,
    serZoneLabel: row.ser_zone_label,
    availabilityText: row.availability_text,
    note: row.note,
    externalUrl: row.external_url,
    displayPriority: row.display_priority,
    relevanceScore: row.relevance_score,
    fetchedAt: row.fetched_at,
    cacheTtlSeconds: row.cache_ttl_seconds,
    isActive: Boolean(row.is_active),
    destinationLatitude: row.destination_latitude,
    destinationLongitude: row.destination_longitude,
    destinationNodeLabel: row.destination_node_label,
  };
}

function toTransportOption(option: StoredTransportOption): TransportOption {
  return {
    id: option.optionId,
    mode: option.mode,
    title: option.title,
    sourceLabel: option.sourceLabel,
    dataOrigin: option.dataOrigin,
    destinationNodeId: option.destinationNodeId,
    destinationNodeName: option.destinationNodeName,
    summary: option.summary,
    lines: option.lines,
    originLabel: option.originLabel,
    destinationLabel: option.destinationLabel,
    metrics: option.metrics,
    stationName: option.stationName,
    stopName: option.stopName,
    serZoneLabel: option.serZoneLabel,
    availabilityText: option.availabilityText,
    note: option.note,
    externalUrl: option.externalUrl,
    displayPriority: option.displayPriority,
    relevanceScore: option.relevanceScore,
    fetchedAt: option.fetchedAt,
    cacheTtlSeconds: option.cacheTtlSeconds,
  };
}

function buildParsedTransportSnapshotOptions(
  item: BaseCenterRecord,
  fetchedAt: string,
): StoredTransportOption[] {
  const parsedReferences = parseOfficialTransportText(item.transportText);

  return parsedReferences
    .filter((reference) =>
      reference.mode === "metro" ||
      reference.mode === "cercanias" ||
      reference.mode === "metro_ligero" ||
      reference.mode === "emt_bus",
    )
    .map((reference) => {
      const title =
        reference.mode === "metro"
          ? "Metro"
          : reference.mode === "cercanias"
            ? "Cercanias"
            : reference.mode === "metro_ligero"
              ? "Metro Ligero"
              : "Bus";
      const baseScore =
        reference.mode === "metro"
          ? 88
          : reference.mode === "cercanias"
            ? 84
            : reference.mode === "metro_ligero"
              ? 80
              : 72;

      return {
        centerId: item.id,
        optionId: `${item.id}:${reference.mode}:${reference.stationName ?? reference.raw}`,
        mode: reference.mode,
        title,
        sourceLabel: "Texto oficial del centro",
        dataOrigin: "official_text_parsed",
        destinationNodeId: null,
        destinationNodeName: reference.stationName,
        summary: buildTransportSummary(reference.mode, reference.stationName, reference.lines, null),
        lines: reference.lines,
        originLabel: null,
        destinationLabel: reference.stationName,
        metrics: {
          walkDistanceMeters: null,
          walkMinutes: null,
          waitMinutes: null,
          totalMinutes: null,
        },
        stationName: reference.stationName,
        stopName: null,
        serZoneLabel: null,
        availabilityText: null,
        note: "Conexion publicada en la fuente oficial del centro.",
        externalUrl: null,
        displayPriority: TRANSPORT_ORDER[reference.mode],
        relevanceScore: baseScore,
        fetchedAt,
        cacheTtlSeconds: ttlSecondsForOrigin("official_text_parsed", reference.mode),
        isActive: true,
        destinationLatitude: null,
        destinationLongitude: null,
        destinationNodeLabel: reference.stationName,
      } satisfies StoredTransportOption;
    });
}

function stationHintsForMode(
  parsedOptions: StoredTransportOption[],
  mode: Extract<TransportMode, "metro" | "cercanias" | "interurban_bus">,
): string[] {
  return parsedOptions
    .filter((option) => option.mode === mode)
    .map((option) => option.destinationNodeName ?? option.stationName ?? option.stopName ?? "")
    .filter(Boolean);
}

function buildCrtmStructuredOption(args: {
  item: BaseCenterRecord;
  fetchedAt: string;
  mode: Extract<TransportMode, "metro" | "cercanias" | "interurban_bus">;
  title: string;
  sourceLabel: string;
  parsedOptions: StoredTransportOption[];
  stops: CrtmStop[];
  maxDistanceMeters: number;
  scoreBase: number;
}): StoredTransportOption | null {
  const { item, fetchedAt, mode, title, sourceLabel, parsedOptions, stops, maxDistanceMeters, scoreBase } = args;
  const nameHints = stationHintsForMode(parsedOptions, mode);
  const nearestStop = findNearestCrtmStopByName(item.latitude, item.longitude, stops, nameHints);

  if (!nearestStop || nearestStop.distanceMeters > maxDistanceMeters) {
    return null;
  }

  const parsedLines = parsedOptions
    .filter((option) => option.mode === mode)
    .flatMap((option) => option.lines);
  const lines = [...new Set(parsedLines)];

  return {
    centerId: item.id,
    optionId: `${item.id}:${mode}:${nearestStop.stopId}`,
    mode,
    title,
    sourceLabel,
    dataOrigin: "official_structured",
    destinationNodeId: nearestStop.stopId,
    destinationNodeName: nearestStop.name,
    summary: buildTransportSummary(mode, nearestStop.name, lines, nearestStop.distanceMeters),
    lines,
    originLabel: null,
    destinationLabel: item.addressLine,
    metrics: {
      walkDistanceMeters: Math.round(nearestStop.distanceMeters),
      walkMinutes: walkingMinutesFromDistance(nearestStop.distanceMeters),
      waitMinutes: null,
      totalMinutes: null,
    },
    stationName: nearestStop.name,
    stopName: nearestStop.name,
    serZoneLabel: null,
    availabilityText: null,
    note: "Nodo oficial CRTM del destino. Solo se publica movilidad estructurada y distancia peatonal aproximada al centro, sin simular tiempos puerta a puerta.",
    externalUrl: null,
    displayPriority: TRANSPORT_ORDER[mode],
    relevanceScore: Math.max(52, scoreBase - Math.round(nearestStop.distanceMeters / 28)),
    fetchedAt,
    cacheTtlSeconds: ttlSecondsForOrigin("official_structured", mode),
    isActive: true,
    destinationLatitude: nearestStop.lat,
    destinationLongitude: nearestStop.lon,
    destinationNodeLabel: nearestStop.name,
  } satisfies StoredTransportOption;
}

function buildPrecomputedTransportSnapshot(
  item: BaseCenterRecord,
  datasets: {
    emtStops: EmtStop[];
    crtmMetroStops: CrtmStop[];
    crtmCercaniasStops: CrtmStop[];
    crtmInterurbanStops: CrtmStop[];
    bicimadStations: BicimadStation[];
    serZones: SerZone[];
  },
  fetchedAt: string,
): CenterTransportSnapshot {
  const parsedOptions = buildParsedTransportSnapshotOptions(item, fetchedAt);
  const options = [...parsedOptions];
  const nearestStop = findNearestEmtStop(item.latitude, item.longitude, datasets.emtStops);
  const nearestBicimad = findNearestBicimadStation(
    item.latitude,
    item.longitude,
    datasets.bicimadStations,
  );
  const serZone = findSerZone(item.latitude, item.longitude, datasets.serZones);
  const mapsUrl = buildMapsUrl(item);

  const metroStructured = buildCrtmStructuredOption({
    item,
    fetchedAt,
    mode: "metro",
    title: "Metro",
    sourceLabel: "CRTM GTFS Metro",
    parsedOptions,
    stops: datasets.crtmMetroStops,
    maxDistanceMeters: 1400,
    scoreBase: 92,
  });
  const cercaniasStructured = buildCrtmStructuredOption({
    item,
    fetchedAt,
    mode: "cercanias",
    title: "Cercanias",
    sourceLabel: "CRTM GTFS Cercanias",
    parsedOptions,
    stops: datasets.crtmCercaniasStops,
    maxDistanceMeters: 1800,
    scoreBase: 88,
  });
  const interurbanStructured = buildCrtmStructuredOption({
    item,
    fetchedAt,
    mode: "interurban_bus",
    title: "Interurbano CRTM",
    sourceLabel: "CRTM GTFS Interurbanos",
    parsedOptions,
    stops: datasets.crtmInterurbanStops,
    maxDistanceMeters: 1800,
    scoreBase: 78,
  });

  if (metroStructured) {
    options.push(metroStructured);
  }

  if (cercaniasStructured) {
    options.push(cercaniasStructured);
  }

  if (interurbanStructured) {
    options.push(interurbanStructured);
  }

  if (nearestStop && nearestStop.distanceMeters <= 850) {
    const parsedBus = parsedOptions.find((option) => option.mode === "emt_bus");
    const lines = parsedBus?.lines.length ? parsedBus.lines : nearestStop.lines.slice(0, 6);
    options.push({
      centerId: item.id,
      optionId: `${item.id}:emt:${nearestStop.stopId}`,
      mode: "emt_bus",
      title: "Bus EMT",
      sourceLabel: "EMT paradas oficiales",
      dataOrigin: "official_structured",
      destinationNodeId: nearestStop.stopId,
      destinationNodeName: nearestStop.name,
      summary: buildTransportSummary("emt_bus", nearestStop.name, lines, nearestStop.distanceMeters),
      lines,
      originLabel: null,
      destinationLabel: item.addressLine,
      metrics: {
        walkDistanceMeters: Math.round(nearestStop.distanceMeters),
        walkMinutes: walkingMinutesFromDistance(nearestStop.distanceMeters),
        waitMinutes: null,
        totalMinutes: null,
      },
      stationName: null,
      stopName: nearestStop.name,
      serZoneLabel: null,
      availabilityText: null,
      note: "Parada EMT oficial cercana al centro. La espera solo se mostrara cuando la ETA realtime este integrada de forma robusta.",
      externalUrl: null,
      displayPriority: TRANSPORT_ORDER.emt_bus,
      relevanceScore: Math.max(58, 86 - Math.round(nearestStop.distanceMeters / 25)),
      fetchedAt,
      cacheTtlSeconds: ttlSecondsForOrigin("official_structured", "emt_bus"),
      isActive: true,
      destinationLatitude: nearestStop.lat,
      destinationLongitude: nearestStop.lon,
      destinationNodeLabel: nearestStop.address ?? nearestStop.name,
    });
  }

  if (nearestBicimad && nearestBicimad.distanceMeters <= 1000) {
    options.push({
      centerId: item.id,
      optionId: `${item.id}:bicimad:${nearestBicimad.stationId}`,
      mode: "bicimad",
      title: "BiciMAD",
      sourceLabel: "Estaciones oficiales BiciMAD",
      dataOrigin: "official_structured",
      destinationNodeId: nearestBicimad.stationId,
      destinationNodeName: nearestBicimad.name,
      summary: buildTransportSummary("bicimad", nearestBicimad.name, [], nearestBicimad.distanceMeters),
      lines: [],
      originLabel: null,
      destinationLabel: nearestBicimad.address ?? nearestBicimad.name,
      metrics: {
        walkDistanceMeters: Math.round(nearestBicimad.distanceMeters),
        walkMinutes: walkingMinutesFromDistance(nearestBicimad.distanceMeters),
        waitMinutes: null,
        totalMinutes: null,
      },
      stationName: nearestBicimad.name,
      stopName: null,
      serZoneLabel: null,
      availabilityText:
        nearestBicimad.totalBases !== null ? `${nearestBicimad.totalBases} bases` : null,
      note: nearestBicimad.state ? `Estado de estacion: ${nearestBicimad.state}.` : null,
      externalUrl: null,
      displayPriority: TRANSPORT_ORDER.bicimad,
      relevanceScore: Math.max(54, 82 - Math.round(nearestBicimad.distanceMeters / 30)),
      fetchedAt,
      cacheTtlSeconds: ttlSecondsForOrigin("official_structured", "bicimad"),
      isActive: true,
      destinationLatitude: nearestBicimad.lat,
      destinationLongitude: nearestBicimad.lon,
      destinationNodeLabel: nearestBicimad.address ?? nearestBicimad.name,
    });
  }

  if (mapsUrl) {
    options.push({
      centerId: item.id,
      optionId: `${item.id}:car`,
      mode: "car",
      title: "En coche",
      sourceLabel: "Geoportal SER + Maps",
      dataOrigin: "heuristic",
      destinationNodeId: item.id,
      destinationNodeName: item.name,
      summary: serZone
        ? `Zona SER ${serZone.neighborhood ?? serZone.district ?? "disponible"}`
        : "Sin zona SER en el punto del centro",
      lines: [],
      originLabel: null,
      destinationLabel: item.addressLine,
      metrics: {
        walkDistanceMeters: null,
        walkMinutes: null,
        waitMinutes: null,
        totalMinutes: null,
      },
      stationName: null,
      stopName: null,
      serZoneLabel: serZone?.neighborhood ?? serZone?.district ?? null,
      availabilityText: null,
      note: "Se muestra la cobertura SER y la accion de abrir ruta, sin prometer tiempo de coche mientras no exista motor de routing sostenible.",
      externalUrl: mapsUrl,
      displayPriority: TRANSPORT_ORDER.car,
      relevanceScore: serZone ? 48 : 42,
      fetchedAt,
      cacheTtlSeconds: ttlSecondsForOrigin("heuristic", "car"),
      isActive: true,
      destinationLatitude: item.latitude,
      destinationLongitude: item.longitude,
      destinationNodeLabel: item.addressLine ?? item.name,
    });
  }

  return {
    options: options.sort((left, right) => {
      if (left.displayPriority !== right.displayPriority) {
        return left.displayPriority - right.displayPriority;
      }

      return right.relevanceScore - left.relevanceScore;
    }),
    serZoneLabel: serZone?.neighborhood ?? serZone?.district ?? null,
  };
}

function buildSnapshotStatements(
  database: D1LikeDatabase,
  center: BaseCenterRecord,
  snapshot: CenterTransportSnapshot,
  fetchedAt: string,
): D1Statement[] {
  const statements: D1Statement[] = [];
  const activeOptions = snapshot.options.filter((option) => option.isActive);

  statements.push(
    database
      .prepare(
        `INSERT OR REPLACE INTO center_transport_snapshots (
          center_id, generated_at, snapshot_version, active_option_count,
          realtime_option_count, structured_option_count, parsed_option_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        center.id,
        fetchedAt,
        TRANSPORT_SNAPSHOT_VERSION,
        activeOptions.length,
        activeOptions.filter((option) => option.dataOrigin === "realtime").length,
        activeOptions.filter((option) => option.dataOrigin === "official_structured").length,
        activeOptions.filter((option) => option.dataOrigin === "official_text_parsed").length,
      ),
  );

  if (snapshot.serZoneLabel) {
    statements.push(
      database
        .prepare(
          `INSERT OR REPLACE INTO center_ser_coverage (
            center_id, source_kind, zone_label, district, neighborhood, fetched_at, cache_ttl_seconds, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          center.id,
          "official_structured",
          snapshot.serZoneLabel,
          center.district,
          center.neighborhood,
          fetchedAt,
          604800,
          1,
        ),
    );
  }

  for (const option of activeOptions) {
    if (option.destinationNodeName) {
      const nodeId = transportNodeRowId(center.id, option);
      const nodeDestinationId = option.destinationNodeId ?? option.optionId;

      statements.push(
        database
          .prepare(
            `INSERT OR REPLACE INTO center_transport_nodes (
              id, center_id, mode, source_kind, external_node_id, destination_node_id, node_role, node_name, node_label,
              latitude, longitude, line_codes_json, walking_distance_m_to_center, walking_time_min_to_center,
              relevance_score, display_priority, cache_ttl_seconds, fetched_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            nodeId,
            center.id,
            option.mode,
            option.dataOrigin,
            option.destinationNodeId,
            nodeDestinationId,
            "destination",
            option.destinationNodeName,
            option.destinationNodeLabel,
            option.destinationLatitude,
            option.destinationLongitude,
            JSON.stringify(option.lines),
            option.metrics.walkDistanceMeters,
            option.metrics.walkMinutes,
            option.relevanceScore,
            option.displayPriority,
            option.cacheTtlSeconds,
            fetchedAt,
            option.isActive ? 1 : 0,
          ),
      );
    }

    statements.push(
      database
        .prepare(
          `INSERT OR REPLACE INTO center_transport_options (
            option_id, center_id, mode, title, source_label, data_origin, destination_node_id,
            destination_node_name, summary, lines_json, origin_label, destination_label,
            walk_distance_m_to_center, walk_time_min_to_center, wait_minutes, total_minutes,
            station_name, stop_name, ser_zone_label, availability_text, note, external_url,
            display_priority, relevance_score, fetched_at, cache_ttl_seconds, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          option.optionId,
          center.id,
          option.mode,
          option.title,
          option.sourceLabel,
          option.dataOrigin,
          option.destinationNodeId ?? option.optionId,
          option.destinationNodeName,
          option.summary,
          JSON.stringify(option.lines),
          option.originLabel,
          option.destinationLabel,
          option.metrics.walkDistanceMeters,
          option.metrics.walkMinutes,
          option.metrics.waitMinutes,
          option.metrics.totalMinutes,
          option.stationName,
          option.stopName,
          option.serZoneLabel,
          option.availabilityText,
          option.note,
          option.externalUrl,
          option.displayPriority,
          option.relevanceScore,
          fetchedAt,
          option.cacheTtlSeconds,
          option.isActive ? 1 : 0,
        ),
    );

    statements.push(
      database
        .prepare(
          `INSERT OR REPLACE INTO center_transport_relevance (
            id, center_id, option_id, mode, relevance_score, display_priority, computed_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `${center.id}:${option.mode}:${option.optionId}`,
          center.id,
          option.optionId,
          option.mode,
          option.relevanceScore,
          option.displayPriority,
          fetchedAt,
          option.isActive ? 1 : 0,
        ),
    );
  }

  return statements;
}

async function countTransportOptions(database: D1LikeDatabase): Promise<number> {
  const row = await database
    .prepare("SELECT COUNT(*) AS total FROM center_transport_options WHERE is_active = 1")
    .first<{ total: number }>();

  return row?.total ?? 0;
}

async function countTransportSnapshots(database: D1LikeDatabase): Promise<number> {
  const row = await database
    .prepare("SELECT COUNT(*) AS total FROM center_transport_snapshots")
    .first<{ total: number }>();

  return row?.total ?? 0;
}

async function countOutdatedTransportSnapshots(database: D1LikeDatabase): Promise<number> {
  const row = await database
    .prepare("SELECT COUNT(*) AS total FROM center_transport_snapshots WHERE snapshot_version != ?")
    .bind(TRANSPORT_SNAPSHOT_VERSION)
    .first<{ total: number }>();

  return row?.total ?? 0;
}

async function replaceTransportSnapshots(
  database: D1LikeDatabase,
  centers: BaseCenterRecord[],
): Promise<void> {
  if (transportSnapshotRefreshPromise) {
    await transportSnapshotRefreshPromise;
    return;
  }

  transportSnapshotRefreshPromise = (async () => {
    await database.prepare("DELETE FROM center_transport_relevance").run();
    await database.prepare("DELETE FROM center_transport_options").run();
    await database.prepare("DELETE FROM center_transport_nodes").run();
    await database.prepare("DELETE FROM center_transport_snapshots").run();
    await database.prepare("DELETE FROM center_ser_coverage").run();

    const fetchedAt = new Date().toISOString();
    const [emtStops, crtmMetroStops, crtmCercaniasStops, crtmInterurbanStops, bicimadStations, serZones] = await Promise.all([
      loadEmtStops(),
      loadCrtmMetroStops(),
      loadCrtmCercaniasStops(),
      loadCrtmInterurbanStops(),
      loadBicimadStations(),
      loadSerZones(),
    ]);
    const statements: D1Statement[] = [];

    statements.push(
      database
        .prepare(
          `INSERT INTO transport_source_runs (id, source_code, source_url, item_count, fetched_at, source_kind)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${fetchedAt}:emt`, "emt", TRANSPORT_SOURCE_URLS.emt, emtStops.length, fetchedAt, "official_structured"),
      database
        .prepare(
          `INSERT INTO transport_source_runs (id, source_code, source_url, item_count, fetched_at, source_kind)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${fetchedAt}:crtm_metro`, "crtm_metro", TRANSPORT_SOURCE_URLS.crtmMetro, crtmMetroStops.length, fetchedAt, "official_structured"),
      database
        .prepare(
          `INSERT INTO transport_source_runs (id, source_code, source_url, item_count, fetched_at, source_kind)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${fetchedAt}:crtm_cercanias`, "crtm_cercanias", TRANSPORT_SOURCE_URLS.crtmCercanias, crtmCercaniasStops.length, fetchedAt, "official_structured"),
      database
        .prepare(
          `INSERT INTO transport_source_runs (id, source_code, source_url, item_count, fetched_at, source_kind)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${fetchedAt}:crtm_interurbanos`, "crtm_interurbanos", TRANSPORT_SOURCE_URLS.crtmInterurban, crtmInterurbanStops.length, fetchedAt, "official_structured"),
      database
        .prepare(
          `INSERT INTO transport_source_runs (id, source_code, source_url, item_count, fetched_at, source_kind)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${fetchedAt}:bicimad`, "bicimad", TRANSPORT_SOURCE_URLS.bicimad, bicimadStations.length, fetchedAt, "official_structured"),
      database
        .prepare(
          `INSERT INTO transport_source_runs (id, source_code, source_url, item_count, fetched_at, source_kind)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(`${fetchedAt}:ser`, "ser", TRANSPORT_SOURCE_URLS.ser, serZones.length, fetchedAt, "official_structured"),
    );

    console.log(
      JSON.stringify({
        event: "transport_snapshot_build_start",
        centers: centers.length,
        emt_stops: emtStops.length,
        crtm_metro_stops: crtmMetroStops.length,
        crtm_cercanias_stops: crtmCercaniasStops.length,
        crtm_interurban_stops: crtmInterurbanStops.length,
        bicimad_stations: bicimadStations.length,
        ser_zones: serZones.length,
      }),
    );

    for (const center of centers) {
      const snapshot = buildPrecomputedTransportSnapshot(
        center,
        {
          emtStops,
          crtmMetroStops,
          crtmCercaniasStops,
          crtmInterurbanStops,
          bicimadStations,
          serZones,
        },
        fetchedAt,
      );

      statements.push(...buildSnapshotStatements(database, center, snapshot, fetchedAt));
    }

    await runStatementsInChunks(database, statements);

    console.log(
      JSON.stringify({
        event: "transport_snapshot_build_complete",
        centers: centers.length,
        option_rows: statements.length,
      }),
    );
  })();

  try {
    await transportSnapshotRefreshPromise;
  } finally {
    transportSnapshotRefreshPromise = null;
  }
}

async function readTransportSnapshotsForCenters(
  database: D1LikeDatabase,
  centerIds: string[],
): Promise<Map<string, CenterTransportSnapshot>> {
  const grouped = new Map<string, CenterTransportSnapshot>();

  if (centerIds.length === 0) {
    return grouped;
  }

  for (let index = 0; index < centerIds.length; index += 60) {
    const batchIds = centerIds.slice(index, index + 60);
    const placeholders = batchIds.map(() => "?").join(", ");
    const rows = await database
      .prepare(
        `SELECT
          options.center_id, options.option_id, options.mode, options.title, options.source_label, options.data_origin,
          options.destination_node_id, options.destination_node_name, options.summary, options.lines_json,
          options.origin_label, options.destination_label, options.walk_distance_m_to_center, options.walk_time_min_to_center,
          options.wait_minutes, options.total_minutes, options.station_name, options.stop_name, options.ser_zone_label,
          options.availability_text, options.note, options.external_url, options.display_priority, options.relevance_score,
          options.fetched_at, options.cache_ttl_seconds, options.is_active,
          nodes.latitude AS destination_latitude, nodes.longitude AS destination_longitude, nodes.node_label AS destination_node_label
        FROM center_transport_options AS options
        LEFT JOIN center_transport_nodes AS nodes ON nodes.center_id = options.center_id AND nodes.destination_node_id = options.destination_node_id
        WHERE options.center_id IN (${placeholders}) AND options.is_active = 1
        ORDER BY options.center_id ASC, options.display_priority ASC, options.relevance_score DESC`,
      )
      .bind(...batchIds)
      .all<StoredTransportOptionRow>();

    for (const row of rows.results) {
      const snapshot = grouped.get(row.center_id) ?? {
        options: [],
        serZoneLabel: null,
      };
      const option = toStoredTransportOption(row);
      snapshot.options.push(option);
      snapshot.serZoneLabel ??= option.serZoneLabel;
      grouped.set(row.center_id, snapshot);
    }
  }

  return grouped;
}

function buildParsedTransportOptions(item: BaseCenterRecord): { options: TransportOption[]; serZoneLabel: string | null } {
  const options = buildParsedTransportSnapshotOptions(item, new Date().toISOString()).map((option) =>
    toTransportOption(option),
  );

  return {
    options,
    serZoneLabel: null,
  };
}

async function buildDetailTransportOptions(item: BaseCenterRecord): Promise<{ options: TransportOption[]; serZoneLabel: string | null }> {
  const [emtStops, crtmMetroStops, crtmCercaniasStops, crtmInterurbanStops, bicimadStations, serZones] = await Promise.all([
    loadEmtStops(),
    loadCrtmMetroStops(),
    loadCrtmCercaniasStops(),
    loadCrtmInterurbanStops(),
    loadBicimadStations(),
    loadSerZones(),
  ]);
  const snapshot = buildPrecomputedTransportSnapshot(
    item,
    {
      emtStops,
      crtmMetroStops,
      crtmCercaniasStops,
      crtmInterurbanStops,
      bicimadStations,
      serZones,
    },
    new Date().toISOString(),
  );

  return {
    options: snapshot.options.map((option) => toTransportOption(option)),
    serZoneLabel: snapshot.serZoneLabel,
  };
}

async function resolveTransportOptionsForUser(
  center: BaseCenterRecord,
  snapshot: CenterTransportSnapshot,
  query: Required<PublicCatalogQuery>,
): Promise<{ options: TransportOption[]; serZoneLabel: string | null }> {
  if (!hasRealUserLocation(query)) {
    return {
      options: snapshot.options.map((option) => toTransportOption(option)),
      serZoneLabel: snapshot.serZoneLabel,
    };
  }

  const cacheKey = `${center.id}:${coarseLocationKey(query.lat, query.lon)}`;
  const cached = transportResolutionCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return {
      options: cached.options,
      serZoneLabel: cached.serZoneLabel,
    };
  }

  const inflight = inflightTransportResolutions.get(cacheKey);
  if (inflight) {
    const resolved = await inflight;
    return { options: resolved.options, serZoneLabel: resolved.serZoneLabel };
  }

  const resolver = (async () => {
    const [emtStops, bicimadStations] = await Promise.all([
      loadEmtStops(),
      loadBicimadStations(),
    ]);

    const resolvedOptions = snapshot.options.map((option) => {
      if (option.mode === "emt_bus" && option.dataOrigin !== "official_text_parsed") {
        const originStop = findNearestEmtStopByLines(query.lat, query.lon, emtStops, option.lines);
        const walkToOriginMinutes =
          originStop ? walkingMinutesFromDistance(originStop.distanceMeters) : null;

        return toTransportOption({
          ...option,
          originLabel: originStop?.address ?? originStop?.name ?? option.originLabel,
          summary: originStop
            ? `${originStop.name} → ${option.destinationNodeName ?? option.stopName ?? "Centro"}`
            : option.summary,
          metrics: {
            walkDistanceMeters: option.metrics.walkDistanceMeters,
            walkMinutes: option.metrics.walkMinutes,
            waitMinutes: null,
            totalMinutes: null,
          },
          note: originStop
            ? `Origen calculado contra un subconjunto de lineas EMT ya precalculadas para este centro.${walkToOriginMinutes !== null ? ` Acceso a pie estimado: ${walkToOriginMinutes} min.` : ""}`
            : option.note,
          relevanceScore: originStop ? option.relevanceScore + 4 : option.relevanceScore,
        });
      }

      if (option.mode === "bicimad" && option.dataOrigin !== "official_text_parsed") {
        const originStation = findNearestBicimadStationToUser(query.lat, query.lon, bicimadStations);
        const walkToOriginMinutes =
          originStation ? walkingMinutesFromDistance(originStation.distanceMeters) : null;
        const rideMeters =
          originStation &&
          option.destinationLatitude !== null &&
          option.destinationLongitude !== null
            ? haversineDistanceMeters(
                originStation.lat,
                originStation.lon,
                option.destinationLatitude,
                option.destinationLongitude,
              )
            : null;
        const rideMinutes =
          rideMeters !== null ? Math.max(3, Math.round(rideMeters / 230)) : null;

        return toTransportOption({
          ...option,
          originLabel: originStation?.address ?? originStation?.name ?? null,
          metrics: {
            walkDistanceMeters: option.metrics.walkDistanceMeters,
            walkMinutes: option.metrics.walkMinutes,
            waitMinutes: null,
            totalMinutes: null,
          },
          availabilityText:
            originStation && originStation.totalBases !== null
              ? `${originStation.totalBases} bases origen`
              : option.availabilityText,
          note: originStation
            ? `Origen BiciMAD resuelto contra la red oficial.${walkToOriginMinutes !== null ? ` Acceso a pie estimado: ${walkToOriginMinutes} min.` : ""}${rideMinutes !== null ? ` Recorrido intermedio estimado: ${rideMinutes} min.` : ""}`
            : option.note,
        });
      }

      if (option.mode === "car") {
        return toTransportOption({
          ...option,
          originLabel: "Tu ubicacion",
        });
      }

      return toTransportOption(option);
    });

    const ttl = Math.min(
      ...snapshot.options
        .map((option) => option.cacheTtlSeconds)
        .filter((value): value is number => typeof value === "number" && value > 0),
      900,
    );
    const entry = {
      expiresAt: Date.now() + ttl * 1000,
      options: resolvedOptions,
      serZoneLabel: snapshot.serZoneLabel,
    } satisfies UserResolvedTransportCacheEntry;

    transportResolutionCache.set(cacheKey, entry);
    return entry;
  })();

  inflightTransportResolutions.set(cacheKey, resolver);

  try {
    const resolved = await resolver;
    return { options: resolved.options, serZoneLabel: resolved.serZoneLabel };
  } finally {
    inflightTransportResolutions.delete(cacheKey);
  }
}

function buildRanking(item: {
  schedule: ScheduleSummary;
  accessibility: boolean;
  wifi: boolean;
  capacityValue: number | null;
  transportOptions: TransportOption[];
  distanceMeters: number | null;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (item.schedule.isOpenNow === true) {
    score += 180;
    reasons.push("abierto_ahora");
  }

  if (item.schedule.isOpenNow === true && item.schedule.nextChangeAt) {
    const minutesUntilClose = Math.max(
      0,
      Math.round((new Date(item.schedule.nextChangeAt).getTime() - Date.now()) / 60000),
    );
    const closeScore = Math.max(0, Math.min(60, Math.floor(minutesUntilClose / 15)));
    score += closeScore;
    reasons.push("tiempo_hasta_cierre");
  }

  if (item.schedule.confidence === "high") {
    score += 35;
    reasons.push("horario_alta_confianza");
  } else if (item.schedule.confidence === "medium") {
    score += 18;
    reasons.push("horario_media_confianza");
  } else if (item.schedule.confidence === "low") {
    score += 8;
  } else {
    score -= 15;
  }

  if (item.capacityValue !== null) {
    score += Math.min(35, Math.round(item.capacityValue / 5));
    reasons.push("aforo_oficial");
  }

  if (item.accessibility) {
    score += 10;
    reasons.push("accesible");
  }

  if (item.wifi) {
    score += 8;
    reasons.push("wifi_confirmado");
  }

  if (item.transportOptions.length > 0) {
    score += Math.min(18, item.transportOptions.length * 4);
    score += Math.min(
      22,
      Math.round(
        Math.max(...item.transportOptions.map((option) => option.relevanceScore), 0) / 5,
      ),
    );
    if (
      item.transportOptions.some(
        (option) =>
          option.dataOrigin === "official_structured" || option.dataOrigin === "realtime",
      )
    ) {
      score += 10;
      reasons.push("transporte_estructurado");
    } else {
      reasons.push("transporte_textual");
    }
  }

  if (item.distanceMeters !== null) {
    score += Math.max(0, 80 - Math.round(item.distanceMeters / 100));
    reasons.push("distancia_real");
  }

  return { score, reasons };
}

function buildAppliedQuery(input?: PublicCatalogQuery): Required<PublicCatalogQuery> {
  return {
    ...DEFAULT_PUBLIC_QUERY,
    ...input,
    q: input?.q?.trim() ?? "",
    lat: input?.lat ?? Number.NaN,
    lon: input?.lon ?? Number.NaN,
    radiusMeters:
      typeof input?.radiusMeters === "number" && Number.isFinite(input.radiusMeters)
        ? Math.max(250, input.radiusMeters)
        : DEFAULT_PUBLIC_QUERY.radiusMeters,
    kinds: input?.kinds ?? [],
    transportModes: input?.transportModes ?? [],
    openNow: Boolean(input?.openNow),
    accessible: Boolean(input?.accessible),
    withWifi: Boolean(input?.withWifi),
    withCapacity: Boolean(input?.withCapacity),
    sort: input?.sort ?? "relevance",
    limit:
      typeof input?.limit === "number" && Number.isFinite(input.limit)
        ? Math.max(1, Math.min(500, input.limit))
        : DEFAULT_PUBLIC_QUERY.limit,
  };
}

function hasRealUserLocation(query: Required<PublicCatalogQuery>): boolean {
  return Number.isFinite(query.lat) && Number.isFinite(query.lon);
}

function enrichBaseRow(row: StoredCenterRow): BaseCenterRecord {
  const parsedSchedule = parseSchedule(row.schedule_text_raw);
  const schedule = {
    ...parsedSchedule,
    rawText: row.schedule_text_raw,
    displayText: row.schedule_summary_text,
    notesUnparsed:
      parsedSchedule.notesUnparsed ?? row.schedule_notes_unparsed,
    confidence: parsedSchedule.confidence,
    rules: parsedSchedule.rules,
    overrides: parsedSchedule.overrides,
    activeOverride: parsedSchedule.activeOverride,
  } satisfies ScheduleSummary;

  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    kindLabel: kindLabel(row.kind),
    name: repairSourceText(row.name) ?? row.name,
    addressLine: repairSourceText(row.address_line),
    district: repairSourceText(row.district),
    neighborhood: repairSourceText(row.neighborhood),
    postalCode: repairSourceText(row.postal_code),
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    email: row.email,
    websiteUrl: repairSourceText(row.website_url),
    accessibility: Boolean(row.accessibility),
    accessibilityOrigin: Boolean(row.accessibility) ? "official_structured" : "not_available",
    wifi: Boolean(row.wifi),
    wifiOrigin: Boolean(row.wifi) ? "official_text_parsed" : "not_available",
    openAir: Boolean(row.open_air),
    capacityValue: row.capacity_value,
    capacityOrigin: row.capacity_value !== null ? "official_text_parsed" : "not_available",
    servicesText: repairSourceText(row.services_text),
    transportText: repairSourceText(row.transport_text),
    sourceCode: row.source_code,
    ratingAverage: row.rating_average,
    ratingCount: row.rating_count,
    schedule,
  };
}

async function enrichCenterForPublic(
  base: BaseCenterRecord,
  query: Required<PublicCatalogQuery>,
  transportMode: "catalog" | "detail",
  transportSnapshot?: CenterTransportSnapshot | null,
): Promise<EnrichedCenterRecord> {
  const distanceMeters =
    hasRealUserLocation(query) && base.latitude !== null && base.longitude !== null
      ? haversineDistanceMeters(query.lat, query.lon, base.latitude, base.longitude)
      : null;

  let transportPayload: { options: TransportOption[]; serZoneLabel: string | null };

  if (transportSnapshot) {
    transportPayload = {
      options: transportSnapshot.options.map((option) => toTransportOption(option)),
      serZoneLabel: transportSnapshot.serZoneLabel,
    };
  } else {
    transportPayload =
      transportMode === "detail"
        ? await buildDetailTransportOptions(base)
        : buildParsedTransportOptions(base);
  }

  const { options, serZoneLabel } = transportPayload;
  const ranking = buildRanking({
    schedule: base.schedule,
    accessibility: base.accessibility,
    wifi: base.wifi,
    capacityValue: base.capacityValue,
    transportOptions: options,
    distanceMeters,
  });
  const mapsUrl = buildMapsUrl(base);

  return {
    ...base,
    ratingOrigin:
      base.ratingAverage !== null && base.ratingCount > 0 ? "official_structured" : "not_available",
    headlineStatus: buildHeadlineStatus(base.schedule),
    scheduleLabel: buildScheduleLabel(base.schedule),
    occupancyLabel:
      base.capacityOrigin === "official_text_parsed"
        ? "Aforo extraido de texto oficial"
        : base.capacityOrigin === "official_structured"
          ? "Aforo oficial"
          : null,
    capacityOrigin: base.capacityOrigin,
    distanceMeters,
    distanceLabel: formatDistance(distanceMeters),
    distanceOrigin: distanceMeters !== null ? "official_structured" : "not_available",
    mapsUrl,
    operationalNote: base.schedule.notesUnparsed,
    operationalNoteOrigin: base.schedule.notesUnparsed ? "official_text_parsed" : "not_available",
    transportOptions: options,
    serZoneLabel,
    rankingScore: ranking.score,
    rankingReasons: ranking.reasons,
    dataQuality: buildDataQualityFlags(base, options, distanceMeters),
  };
}

function matchesQuery(item: EnrichedCenterRecord, query: Required<PublicCatalogQuery>): boolean {
  const haystack = normalizeSearch(
    [item.name, item.addressLine, item.district, item.neighborhood, item.servicesText]
      .filter(Boolean)
      .join(" "),
  );

  if (query.q && !haystack.includes(normalizeSearch(query.q))) {
    return false;
  }

  if (query.kinds.length > 0 && !query.kinds.includes(item.kind)) {
    return false;
  }

  if (query.openNow && item.schedule.isOpenNow !== true) {
    return false;
  }

  if (query.accessible && !item.accessibility) {
    return false;
  }

  if (query.withWifi && !item.wifi) {
    return false;
  }

  if (query.withCapacity && item.capacityValue === null) {
    return false;
  }

  if (query.transportModes.length > 0 && !item.transportOptions.some((option) => query.transportModes.includes(option.mode))) {
    return false;
  }

  if (hasRealUserLocation(query) && Number.isFinite(query.radiusMeters) && query.radiusMeters > 0) {
    if (item.distanceMeters === null || item.distanceMeters > query.radiusMeters) {
      return false;
    }
  }

  return true;
}

function sortItems(items: EnrichedCenterRecord[], sort: SortMode): EnrichedCenterRecord[] {
  return [...items].sort((left, right) => {
    if (sort === "distance") {
      if (left.distanceMeters !== null && right.distanceMeters !== null && left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters;
      }
    }

    if (sort === "closing") {
      const leftValue = left.schedule.nextChangeAt ? new Date(left.schedule.nextChangeAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightValue = right.schedule.nextChangeAt ? new Date(right.schedule.nextChangeAt).getTime() : Number.MAX_SAFE_INTEGER;

      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }
    }

    if (sort === "capacity") {
      if ((left.capacityValue ?? -1) !== (right.capacityValue ?? -1)) {
        return (right.capacityValue ?? -1) - (left.capacityValue ?? -1);
      }
    }

    if (sort === "name") {
      return left.name.localeCompare(right.name, "es");
    }

    if (left.rankingScore !== right.rankingScore) {
      return right.rankingScore - left.rankingScore;
    }

    if (left.distanceMeters !== null && right.distanceMeters !== null && left.distanceMeters !== right.distanceMeters) {
      return left.distanceMeters - right.distanceMeters;
    }

    return left.name.localeCompare(right.name, "es");
  });
}

function buildMetrics(items: EnrichedCenterRecord[]) {
  const openNowCount = items.filter((item) => item.schedule.isOpenNow === true).length;
  const capacityValues = items.map((item) => item.capacityValue).filter((value): value is number => value !== null);

  return {
    totalCenters: items.length,
    openNowCount,
    totalCapacity: capacityValues.length > 0 ? capacityValues.reduce((sum, value) => sum + value, 0) : null,
    capacityKnownCount: capacityValues.length,
  };
}

async function readBaseCentersFromDatabase(database: D1LikeDatabase): Promise<BaseCenterRecord[]> {
  const centers = await database
    .prepare(
      `SELECT
        id, slug, kind, name, address_line, district, neighborhood, postal_code,
        latitude, longitude, phone, email, website_url, accessibility, wifi, open_air,
        capacity_value, services_text, transport_text, source_code, rating_average, rating_count,
        schedule_text_raw, schedule_summary_text, schedule_confidence, schedule_notes_unparsed,
        schedule_needs_review
      FROM centers`,
    )
    .all<StoredCenterRow>();

  return centers.results.map((row) => enrichBaseRow(row));
}

function toBaseCenterRecord(center: NormalizedCenter): BaseCenterRecord {
  return {
    id: center.id,
    slug: center.slug,
    kind: center.kind,
    kindLabel: kindLabel(center.kind),
    name: center.name,
    addressLine: center.addressLine,
    district: center.district,
    neighborhood: center.neighborhood,
    postalCode: center.postalCode,
    latitude: center.latitude,
    longitude: center.longitude,
    phone: center.phone,
    email: center.email,
    websiteUrl: center.websiteUrl,
    accessibility: center.accessibility,
    accessibilityOrigin: center.accessibilityOrigin,
    wifi: center.wifi,
    wifiOrigin: center.wifiOrigin,
    openAir: center.openAir,
    capacityValue: center.capacityValue,
    capacityOrigin: center.capacityOrigin,
    servicesText: center.servicesText,
    transportText: center.transportText,
    sourceCode: center.sourceCode,
    ratingAverage: null,
    ratingCount: 0,
    schedule: center.schedule,
  };
}

async function loadBaseCenters(options: CatalogStoreOptions): Promise<{ sourceMode: "d1" | "live"; items: BaseCenterRecord[] }> {
  const database = asDatabase(options.database);

  if (!database) {
    console.log(JSON.stringify({ event: "catalog_source_mode", mode: "live" }));
    const { centers } = await hydrateLiveCatalog(options.sources);
    const items = centers.map(toBaseCenterRecord);
    return { sourceMode: "live", items };
  }

  await ensureSchema(database);

  if ((await countCenters(database)) === 0) {
    console.log(JSON.stringify({ event: "catalog_hydrate_required", mode: "d1" }));
    const { centers, rejections } = await hydrateLiveCatalog(options.sources);
    await replaceCatalog(database, centers, rejections, options.sources);
  }

  const items = await readBaseCentersFromDatabase(database);

  const [transportOptionCount, transportSnapshotCount, outdatedSnapshotCount] = await Promise.all([
    countTransportOptions(database),
    countTransportSnapshots(database),
    countOutdatedTransportSnapshots(database),
  ]);

  if (
    transportOptionCount === 0 ||
    transportSnapshotCount < items.length ||
    outdatedSnapshotCount > 0
  ) {
    console.log(
      JSON.stringify({
        event: "transport_snapshot_backfill_required",
        mode: "d1",
        total_centers: items.length,
        option_count: transportOptionCount,
        snapshot_count: transportSnapshotCount,
        outdated_snapshot_count: outdatedSnapshotCount,
      }),
    );
    await replaceTransportSnapshots(database, items);
  }

  console.log(
    JSON.stringify({
      event: "catalog_source_mode",
      mode: "d1",
      total_centers: items.length,
    }),
  );

  return {
    sourceMode: "d1",
    items,
  };
}

export async function getCatalogFromStore(
  options: CatalogStoreOptions,
  inputQuery?: PublicCatalogQuery,
): Promise<PublicCatalogResponse> {
  const query = buildAppliedQuery(inputQuery);
  const { sourceMode, items } = await loadBaseCenters(options);
  const database = asDatabase(options.database);
  const transportSnapshots =
    database && sourceMode === "d1"
      ? await readTransportSnapshotsForCenters(
          database,
          items.map((item) => item.id),
        )
      : new Map<string, CenterTransportSnapshot>();
  const enriched = await Promise.all(
    items.map((item) =>
      enrichCenterForPublic(
        item,
        query,
        "catalog",
        transportSnapshots.get(item.id) ?? null,
      ),
    ),
  );
  const matching = sortItems(
    enriched.filter((item) => matchesQuery(item, query)),
    query.sort,
  );
  const filtered = matching.slice(0, query.limit);

  return {
    generatedAt: new Date().toISOString(),
    sourceMode,
    total: matching.length,
    metrics: buildMetrics(matching),
    appliedQuery: query,
    items: filtered,
  };
}

export async function getCenterDetailFromStore(
  options: CatalogStoreOptions,
  slug: string,
  inputQuery?: Pick<PublicCatalogQuery, "lat" | "lon">,
): Promise<PublicCenterDetailResponse | null> {
  const query = buildAppliedQuery(inputQuery);
  const { sourceMode, items } = await loadBaseCenters(options);
  const database = asDatabase(options.database);
  const base = items.find((item) => item.slug === slug);

  if (!base) {
    return null;
  }

  const transportSnapshots =
    database && sourceMode === "d1"
      ? await readTransportSnapshotsForCenters(database, [base.id])
      : new Map<string, CenterTransportSnapshot>();
  const center = await enrichCenterForPublic(
    base,
    query,
    "detail",
    transportSnapshots.get(base.id) ?? null,
  );

  return {
    generatedAt: new Date().toISOString(),
    sourceMode,
    item: {
      center,
      contact: {
        phone: center.phone,
        email: center.email,
        websiteUrl: center.websiteUrl,
      },
      location: {
        latitude: center.latitude,
        longitude: center.longitude,
        addressLine: center.addressLine,
        district: center.district,
        neighborhood: center.neighborhood,
        postalCode: center.postalCode,
      },
      equipment: [
        {
          key: "wifi",
          label: "WiFi",
          available: center.wifi,
          value:
            center.wifi && center.wifiOrigin === "official_text_parsed"
              ? "Detectado en texto oficial"
              : center.wifi
                ? "Confirmado en fuente oficial"
                : null,
          origin: center.wifiOrigin,
        },
        {
          key: "accessibility",
          label: "Accesibilidad",
          available: center.accessibility,
          value: center.accessibility ? "Indicada en fuente oficial" : null,
          origin: center.accessibilityOrigin,
        },
        {
          key: "capacity",
          label: "Aforo",
          available: center.capacityValue !== null,
          value:
            center.capacityValue !== null
              ? `${center.capacityValue} plazas`
              : null,
          origin: center.capacityOrigin,
        },
      ],
      flags: center.dataQuality,
    },
  };
}

function labelForTransportMode(mode: TransportMode): string {
  switch (mode) {
    case "metro":
      return "Metro";
    case "cercanias":
      return "Cercanias";
    case "metro_ligero":
      return "Metro Ligero";
    case "emt_bus":
      return "Bus EMT";
    case "interurban_bus":
      return "Interurbano CRTM";
    case "bicimad":
      return "BiciMAD";
    case "car":
      return "En coche";
  }
}

function labelForSortMode(mode: SortMode): string {
  switch (mode) {
    case "relevance":
      return "Relevancia";
    case "distance":
      return "Distancia";
    case "closing":
      return "Hora de cierre";
    case "capacity":
      return "Aforo";
    case "name":
      return "Nombre";
  }
}

export async function getFiltersFromStore(
  options: CatalogStoreOptions,
  inputQuery?: PublicCatalogQuery,
): Promise<PublicFiltersResponse> {
  const query = buildAppliedQuery(inputQuery);
  const { sourceMode, items } = await loadBaseCenters(options);
  const database = asDatabase(options.database);
  const transportSnapshots =
    database && sourceMode === "d1"
      ? await readTransportSnapshotsForCenters(
          database,
          items.map((item) => item.id),
        )
      : new Map<string, CenterTransportSnapshot>();

  const enriched = await Promise.all(
    items.map((item) =>
      enrichCenterForPublic(
        item,
        query,
        "catalog",
        transportSnapshots.get(item.id) ?? null,
      ),
    ),
  );

  const matching = enriched.filter((item) => matchesQuery(item, query));

  return {
    generatedAt: new Date().toISOString(),
    totalResults: matching.length,
    ratingsAvailable: matching.some(
      (item) => item.ratingOrigin !== "not_available",
    ),
    availableKinds: [
      {
        kind: "library",
        label: kindLabel("library"),
        count: matching.filter((item) => item.kind === "library").length,
      },
      {
        kind: "study_room",
        label: kindLabel("study_room"),
        count: matching.filter((item) => item.kind === "study_room").length,
      },
    ],
    availableTransportModes: ([
      "metro",
      "cercanias",
      "metro_ligero",
      "emt_bus",
      "interurban_bus",
      "bicimad",
      "car",
    ] as TransportMode[]).map((mode) => ({
      mode,
      label: labelForTransportMode(mode),
      count: matching.filter((item) => item.transportOptions.some((option) => option.mode === mode)).length,
    })),
    availableSortModes: ([
      "relevance",
      "distance",
      "closing",
      "capacity",
      "name",
    ] as SortMode[]).map((value) => ({
      value,
      label: labelForSortMode(value),
    })),
    canUseDistanceFilter: hasRealUserLocation(query),
  };
}
