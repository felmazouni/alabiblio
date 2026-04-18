import type {
  CenterCatalogItem,
  CenterKind,
  PublicCatalogResponse,
  ScheduleRule,
  ScheduleSummary,
} from "@alabiblio/contracts";
import {
  buildCenterSlug,
  extractNamedPathSegment,
  isInteriorStudySpaceCandidate,
  kindLabel,
  normalizePhone,
  parseSchedule,
  repairSourceText,
} from "@alabiblio/domain";

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
  wifi: boolean;
  openAir: boolean;
  capacityValue: number | null;
  servicesText: string | null;
  transportText: string | null;
  schedule: ScheduleSummary;
  rawJson: string;
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
  `CREATE INDEX IF NOT EXISTS idx_centers_source_code ON centers(source_code)`,
  `CREATE INDEX IF NOT EXISTS idx_centers_kind ON centers(kind)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_rules_center ON center_schedule_rules(center_id)`,
];

function asDatabase(database: unknown): D1LikeDatabase | null {
  if (database && typeof database === "object" && "prepare" in database) {
    return database as D1LikeDatabase;
  }

  return null;
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

function normalizeRecord(record: MadridOpenDataRecord, sourceCode: SourceCode): NormalizedCenter | null {
  const externalId = String(record.id ?? "").trim();
  const name = repairSourceText(record.organization?.["organization-name"] ?? record.title);
  const servicesText = repairSourceText(record.organization?.services);
  const schedule = parseSchedule(record.organization?.schedule);

  if (!externalId || !name) {
    return null;
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
    return null;
  }

  const district = extractNamedPathSegment(record.address?.district?.["@id"]);
  const neighborhood = extractNamedPathSegment(record.address?.area?.["@id"]);
  const slug = buildCenterSlug([kind, district ?? "", externalId, name]);
  const addressLine = repairSourceText(record.address?.["street-address"]);
  const transportText = repairSourceText(record.organization?.["organization-desc"]);

  return {
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
    accessibility: toBooleanFlag(record.organization?.accesibility),
    wifi: inferWifi(servicesText, transportText),
    openAir: false,
    capacityValue: inferCapacity(servicesText),
    servicesText,
    transportText,
    schedule,
    rawJson: JSON.stringify(record),
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

async function hydrateLiveCatalog(sources: SourceConfig): Promise<NormalizedCenter[]> {
  const [libraries, studyRooms] = await Promise.all([
    fetchOfficialDataset(sources.libraries),
    fetchOfficialDataset(sources.studyRooms),
  ]);

  const centers = [
    ...libraries.map((record) => normalizeRecord(record, "libraries")),
    ...studyRooms.map((record) => normalizeRecord(record, "study_rooms")),
  ].filter((center): center is NormalizedCenter => center !== null);

  console.log(
    JSON.stringify({
      event: "ingest_normalized",
      source_libraries: libraries.length,
      source_study_rooms: studyRooms.length,
      kept_centers: centers.length,
    }),
  );

  return centers;
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

async function replaceCatalog(database: D1LikeDatabase, centers: NormalizedCenter[], sources: SourceConfig) {
  await database.prepare("DELETE FROM center_schedule_rules").run();
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
            schedule_summary_text, schedule_confidence, schedule_notes_unparsed, rating_average,
            rating_count, raw_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  }

  await database.batch(statements);

  console.log(
    JSON.stringify({
      event: "catalog_replace_complete",
      total_centers: centers.length,
    }),
  );
}

function sortCatalogItems(items: CenterCatalogItem[]): CenterCatalogItem[] {
  return [...items].sort((left, right) => {
    const leftOpen = left.schedule.isOpenNow ? 1 : 0;
    const rightOpen = right.schedule.isOpenNow ? 1 : 0;

    if (leftOpen !== rightOpen) {
      return rightOpen - leftOpen;
    }

    if ((left.capacityValue ?? -1) !== (right.capacityValue ?? -1)) {
      return (right.capacityValue ?? -1) - (left.capacityValue ?? -1);
    }

    return left.name.localeCompare(right.name, "es");
  });
}

function toCatalogItem(center: NormalizedCenter): CenterCatalogItem {
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
    wifi: center.wifi,
    openAir: center.openAir,
    capacityValue: center.capacityValue,
    servicesText: center.servicesText,
    transportText: center.transportText,
    sourceCode: center.sourceCode,
    ratingAverage: null,
    ratingCount: 0,
    schedule: center.schedule,
  };
}

async function readCatalogFromDatabase(database: D1LikeDatabase): Promise<CenterCatalogItem[]> {
  const centers = await database
    .prepare(
      `SELECT
        id, slug, kind, name, address_line, district, neighborhood, postal_code,
        latitude, longitude, phone, email, website_url, accessibility, wifi, open_air,
        capacity_value, services_text, transport_text, source_code, rating_average, rating_count,
        schedule_text_raw, schedule_summary_text, schedule_confidence, schedule_notes_unparsed
      FROM centers`,
    )
    .all<{
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
    }>();

  const items = await Promise.all(
    centers.results.map(async (row) => {
      const rules = await database
        .prepare(
          "SELECT weekday, opens_at, closes_at FROM center_schedule_rules WHERE center_id = ? ORDER BY weekday, opens_at",
        )
        .bind(row.id)
        .all<{ weekday: number; opens_at: string; closes_at: string }>();

      const schedule: ScheduleSummary = {
        ...parseSchedule(row.schedule_text_raw),
        rawText: row.schedule_text_raw,
        displayText: row.schedule_summary_text,
        notesUnparsed: row.schedule_notes_unparsed,
        confidence: row.schedule_confidence,
        rules: rules.results.map<ScheduleRule>((rule) => ({
          weekday: rule.weekday,
          opensAt: rule.opens_at,
          closesAt: rule.closes_at,
        })),
      };

      return {
        id: row.id,
        slug: row.slug,
        kind: row.kind,
        kindLabel: kindLabel(row.kind),
        name: row.name,
        addressLine: row.address_line,
        district: row.district,
        neighborhood: row.neighborhood,
        postalCode: row.postal_code,
        latitude: row.latitude,
        longitude: row.longitude,
        phone: row.phone,
        email: row.email,
        websiteUrl: row.website_url,
        accessibility: Boolean(row.accessibility),
        wifi: Boolean(row.wifi),
        openAir: Boolean(row.open_air),
        capacityValue: row.capacity_value,
        servicesText: row.services_text,
        transportText: row.transport_text,
        sourceCode: row.source_code,
        ratingAverage: row.rating_average,
        ratingCount: row.rating_count,
        schedule,
      } satisfies CenterCatalogItem;
    }),
  );

  return sortCatalogItems(items);
}

export async function getCatalogFromStore(
  options: CatalogStoreOptions,
): Promise<PublicCatalogResponse> {
  const database = asDatabase(options.database);

  if (!database) {
    console.log(JSON.stringify({ event: "catalog_source_mode", mode: "live" }));
    const items = sortCatalogItems((await hydrateLiveCatalog(options.sources)).map(toCatalogItem));

    return {
      generatedAt: new Date().toISOString(),
      sourceMode: "live",
      total: items.length,
      items,
    };
  }

  await ensureSchema(database);

  if ((await countCenters(database)) === 0) {
    console.log(JSON.stringify({ event: "catalog_hydrate_required", mode: "d1" }));
    const centers = await hydrateLiveCatalog(options.sources);
    await replaceCatalog(database, centers, options.sources);
  }

  const items = await readCatalogFromDatabase(database);

  console.log(
    JSON.stringify({
      event: "catalog_source_mode",
      mode: "d1",
      total_centers: items.length,
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    sourceMode: "d1",
    total: items.length,
    items,
  };
}
