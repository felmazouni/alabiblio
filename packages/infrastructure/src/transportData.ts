import type { GeoJsonMultiPolygon, GeoJsonPolygon } from "@alabiblio/domain";
import { haversineDistanceMeters, pointInPolygon, repairSourceText, utm30ToWgs84 } from "@alabiblio/domain";

export interface EmtStop {
  stopId: string;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  lines: string[];
}

export interface BicimadStation {
  stationId: string;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  totalBases: number | null;
  state: string | null;
}

export interface SerZone {
  id: string;
  district: string | null;
  neighborhood: string | null;
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon;
}

export type CrtmStopMode = "metro" | "cercanias" | "interurban_bus";

export interface CrtmStop {
  stopId: string;
  mode: CrtmStopMode;
  name: string;
  lat: number;
  lon: number;
}

const EMT_STOPS_URL =
  "https://datos.madrid.es/dataset/900023-0-emt-paradas-autobus/resource/900023-0-emt-paradas-autobus/download/900023-0-emt-paradas-autobus.csv";
const BICIMAD_GEOJSON_URL =
  "https://datos.emtmadrid.es/dataset/5fcc0945-2cbd-46c3-801a-6a83f4167c11/resource/105ce5df-793f-4e0a-a88e-5d3b3f024a5d/download/bikestationbicimad_geojson.json";
const SER_GEOJSON_URL =
  "https://sigma.madrid.es/hosted/rest/services/GEOPORTAL/SERVICIO_DE_ESTACIONAMIENTO_REGULADO/MapServer/3/query?where=1%3D1&outFields=OBJECTID%2CNOMBAR%2CNOMDIS&returnGeometry=true&f=geojson";
const CRTM_METRO_STOPS_URL =
  "https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0/query?where=1%3D1&outFields=IDESTACION%2CDENOMINACION%2CLINEAS&returnGeometry=true&f=geojson";
const CRTM_CERCANIAS_STOPS_URL =
  "https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M5_Red/FeatureServer/0/query?where=1%3D1&outFields=IDESTACION%2CDENOMINACION%2CLINEAS&returnGeometry=true&f=geojson";
const CRTM_INTERURBAN_STOPS_URL =
  "https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M8_Red/FeatureServer/0/query?where=1%3D1&outFields=IDESTACION%2CDENOMINACION%2CLINEAS&returnGeometry=true&f=geojson";

const runtimeCache: {
  emtStops?: Promise<EmtStop[]>;
  bicimadStations?: Promise<BicimadStation[]>;
  serZones?: Promise<SerZone[]>;
  crtmMetroStops?: Promise<CrtmStop[]>;
  crtmCercaniasStops?: Promise<CrtmStop[]>;
  crtmInterurbanStops?: Promise<CrtmStop[]>;
} = {};

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      if (currentRow.some((value) => value !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue !== "" || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`transport_source_http_${response.status}`);
  }

  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`transport_source_http_${response.status}`);
  }

  return response.json() as Promise<T>;
}

function normalizeStationSearch(value: string): string {
  return (repairSourceText(value) ?? value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function buildCrtmStops(mode: CrtmStopMode, sourceUrl: string): Promise<CrtmStop[]> {
  const payload = await fetchJson<{
    features?: Array<{
      geometry?: { type?: string; coordinates?: [number, number] };
      properties?: Record<string, unknown>;
    }>;
  }>(sourceUrl);

  return (payload.features ?? [])
    .map((feature): CrtmStop | null => {
      if (feature.geometry?.type !== "Point" || !feature.geometry.coordinates) {
        return null;
      }

      const [lon, lat] = feature.geometry.coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const properties = feature.properties ?? {};
      const stopIdRaw = String(properties.IDESTACION ?? properties.OBJECTID ?? "").trim();
      const nameRaw = repairSourceText(String(properties.DENOMINACION ?? ""))?.trim() ?? "";

      if (!stopIdRaw || !nameRaw) {
        return null;
      }

      return {
        stopId: `${mode}:${stopIdRaw}`,
        mode,
        name: nameRaw,
        lat,
        lon,
      } satisfies CrtmStop;
    })
    .filter((stop): stop is CrtmStop => stop !== null);
}

async function buildEmtStops(): Promise<EmtStop[]> {
  const csv = await fetchText(EMT_STOPS_URL);
  const rows = parseCsvRows(csv);
  const [header, ...body] = rows;

  if (!header) {
    return [];
  }

  const indexByName = Object.fromEntries(
    header.map((value, index) => [value.trim(), index]),
  ) as Record<string, number>;
  const byStopId = new Map<string, EmtStop>();
  const stopIdIndex = indexByName["parada"];
  const eastingIndex = indexByName["posX"];
  const northingIndex = indexByName["posY"];
  const lineIndex = indexByName["line"];
  const stopNameIndex = indexByName["descparada"];
  const addressIndex = indexByName["descpostal"];

  if (
    stopIdIndex === undefined ||
    eastingIndex === undefined ||
    northingIndex === undefined
  ) {
    return [];
  }

  for (const row of body) {
    const stopId = row[stopIdIndex] ?? "";
    const easting = Number(row[eastingIndex] ?? "");
    const northing = Number(row[northingIndex] ?? "");
    const line = lineIndex !== undefined ? (row[lineIndex] ?? "").trim() : "";

    if (!stopId || !Number.isFinite(easting) || !Number.isFinite(northing)) {
      continue;
    }

    const { lat, lon } = utm30ToWgs84(easting, northing);
    const existing = byStopId.get(stopId);

    if (existing) {
      existing.lines = [...new Set([...existing.lines, line])].sort((left, right) =>
        left.localeCompare(right, "es", { numeric: true }),
      );
      continue;
    }

    byStopId.set(stopId, {
      stopId,
      name:
        repairSourceText(stopNameIndex !== undefined ? row[stopNameIndex] : null) ??
        `Parada ${stopId}`,
      address: repairSourceText(addressIndex !== undefined ? row[addressIndex] : null),
      lat,
      lon,
      lines: line ? [line] : [],
    });
  }

  return [...byStopId.values()];
}

async function buildBicimadStations(): Promise<BicimadStation[]> {
  const payload = await fetchJson<{
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: Record<string, unknown>;
    }>;
  }>(BICIMAD_GEOJSON_URL);

  return (payload.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties ?? {};

      if (!coordinates || coordinates.length < 2) {
        return null;
      }

      return {
        stationId: String(properties.OBJECTID ?? properties.number ?? ""),
        name: repairSourceText(String(properties.Name ?? "")) ?? "Estacion BiciMAD",
        address: repairSourceText(String(properties.Address ?? "")),
        lon: coordinates[0],
        lat: coordinates[1],
        totalBases:
          typeof properties.TotalBases === "number"
            ? properties.TotalBases
            : Number.isFinite(Number(properties.TotalBases))
              ? Number(properties.TotalBases)
              : null,
        state: repairSourceText(String(properties.State ?? "")),
      } satisfies BicimadStation;
    })
    .filter((station): station is BicimadStation => station !== null);
}

async function buildSerZones(): Promise<SerZone[]> {
  const payload = await fetchJson<{
    features?: Array<{
      geometry?: {
        type?: "Polygon" | "MultiPolygon";
        coordinates?: number[][][] | number[][][][];
      };
      properties?: Record<string, unknown>;
    }>;
  }>(SER_GEOJSON_URL);

  const zones = (payload.features ?? [])
    .map((feature): SerZone | null => {
      const geometry = feature.geometry;

      if (
        !geometry ||
        (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") ||
        !geometry.coordinates
      ) {
        return null;
      }

      return {
        id: String(feature.properties?.OBJECTID ?? crypto.randomUUID()),
        district: repairSourceText(String(feature.properties?.NOMDIS ?? "")),
        neighborhood: repairSourceText(String(feature.properties?.NOMBAR ?? "")),
        geometry:
          geometry.type === "Polygon"
            ? {
                type: "Polygon",
                coordinates: geometry.coordinates as number[][][],
              }
            : {
                type: "MultiPolygon",
                coordinates: geometry.coordinates as number[][][][],
              },
      } satisfies SerZone;
    })
    .filter((zone): zone is SerZone => zone !== null);

  return zones;
}

export function loadEmtStops(): Promise<EmtStop[]> {
  runtimeCache.emtStops ??= buildEmtStops().catch((error) => {
    console.warn(
      JSON.stringify({
        event: "transport_source_unavailable",
        source: "emt_stops",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return [];
  });
  return runtimeCache.emtStops;
}

export function loadBicimadStations(): Promise<BicimadStation[]> {
  runtimeCache.bicimadStations ??= buildBicimadStations().catch((error) => {
    console.warn(
      JSON.stringify({
        event: "transport_source_unavailable",
        source: "bicimad",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return [];
  });
  return runtimeCache.bicimadStations;
}

export function loadSerZones(): Promise<SerZone[]> {
  runtimeCache.serZones ??= buildSerZones().catch((error) => {
    console.warn(
      JSON.stringify({
        event: "transport_source_unavailable",
        source: "ser",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return [];
  });
  return runtimeCache.serZones;
}

export function loadCrtmMetroStops(): Promise<CrtmStop[]> {
  runtimeCache.crtmMetroStops ??= buildCrtmStops("metro", CRTM_METRO_STOPS_URL).catch((error) => {
    console.warn(
      JSON.stringify({
        event: "transport_source_unavailable",
        source: "crtm_metro_gtfs",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return [];
  });

  return runtimeCache.crtmMetroStops;
}

export function loadCrtmCercaniasStops(): Promise<CrtmStop[]> {
  runtimeCache.crtmCercaniasStops ??= buildCrtmStops("cercanias", CRTM_CERCANIAS_STOPS_URL).catch((error) => {
    console.warn(
      JSON.stringify({
        event: "transport_source_unavailable",
        source: "crtm_cercanias_gtfs",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return [];
  });

  return runtimeCache.crtmCercaniasStops;
}

export function loadCrtmInterurbanStops(): Promise<CrtmStop[]> {
  runtimeCache.crtmInterurbanStops ??= buildCrtmStops("interurban_bus", CRTM_INTERURBAN_STOPS_URL).catch((error) => {
    console.warn(
      JSON.stringify({
        event: "transport_source_unavailable",
        source: "crtm_interurban_gtfs",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
    );
    return [];
  });

  return runtimeCache.crtmInterurbanStops;
}

export function findNearestEmtStop(
  centerLat: number | null,
  centerLon: number | null,
  stops: EmtStop[],
): (EmtStop & { distanceMeters: number }) | null {
  if (centerLat === null || centerLon === null) {
    return null;
  }

  let nearest: (EmtStop & { distanceMeters: number }) | null = null;

  for (const stop of stops) {
    const distanceMeters = haversineDistanceMeters(centerLat, centerLon, stop.lat, stop.lon);

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...stop,
        distanceMeters,
      };
    }
  }

  return nearest;
}

export function findNearestEmtStopByLines(
  lat: number | null,
  lon: number | null,
  stops: EmtStop[],
  lines: string[],
): (EmtStop & { distanceMeters: number }) | null {
  const normalizedLines = new Set(lines.filter(Boolean).map((line) => line.toUpperCase()));
  const scopedStops =
    normalizedLines.size > 0
      ? stops.filter((stop) =>
          stop.lines.some((line) => normalizedLines.has(line.toUpperCase())),
        )
      : stops;

  return findNearestEmtStop(lat, lon, scopedStops);
}

export function findNearestBicimadStation(
  centerLat: number | null,
  centerLon: number | null,
  stations: BicimadStation[],
): (BicimadStation & { distanceMeters: number }) | null {
  if (centerLat === null || centerLon === null) {
    return null;
  }

  let nearest: (BicimadStation & { distanceMeters: number }) | null = null;

  for (const station of stations) {
    const distanceMeters = haversineDistanceMeters(centerLat, centerLon, station.lat, station.lon);

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...station,
        distanceMeters,
      };
    }
  }

  return nearest;
}

export function findNearestBicimadStationToUser(
  lat: number | null,
  lon: number | null,
  stations: BicimadStation[],
): (BicimadStation & { distanceMeters: number }) | null {
  return findNearestBicimadStation(lat, lon, stations);
}

export function findSerZone(
  centerLat: number | null,
  centerLon: number | null,
  zones: SerZone[],
): SerZone | null {
  if (centerLat === null || centerLon === null) {
    return null;
  }

  for (const zone of zones) {
    if (pointInPolygon(centerLat, centerLon, zone.geometry)) {
      return zone;
    }
  }

  return null;
}

export function findNearestCrtmStop(
  centerLat: number | null,
  centerLon: number | null,
  stops: CrtmStop[],
): (CrtmStop & { distanceMeters: number }) | null {
  if (centerLat === null || centerLon === null) {
    return null;
  }

  let nearest: (CrtmStop & { distanceMeters: number }) | null = null;

  for (const stop of stops) {
    const distanceMeters = haversineDistanceMeters(centerLat, centerLon, stop.lat, stop.lon);

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...stop,
        distanceMeters,
      };
    }
  }

  return nearest;
}

export function findNearestCrtmStopByName(
  centerLat: number | null,
  centerLon: number | null,
  stops: CrtmStop[],
  nameHints: string[],
): (CrtmStop & { distanceMeters: number }) | null {
  const normalizedHints = nameHints
    .map((hint) => normalizeStationSearch(hint))
    .filter(Boolean);

  const scopedStops =
    normalizedHints.length > 0
      ? stops.filter((stop) => {
          const normalizedStop = normalizeStationSearch(stop.name);
          return normalizedHints.some(
            (hint) => normalizedStop.includes(hint) || hint.includes(normalizedStop),
          );
        })
      : stops;

  return findNearestCrtmStop(centerLat, centerLon, scopedStops);
}
