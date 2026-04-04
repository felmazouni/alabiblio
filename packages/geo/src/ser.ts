import { createHash, randomUUID } from "node:crypto";
import { pointToLineDistanceMeters } from "./distance";

const SER_SOURCE_URL =
  "https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/MOVILIDAD/ZONA_SER/SHP_ZIP.zip";
const SER_ENABLED_DISTANCE_THRESHOLD_METERS = 90;

type GeoJsonLineString = {
  type: "LineString";
  coordinates: Array<[number, number]>;
};

type GeoJsonMultiLineString = {
  type: "MultiLineString";
  coordinates: Array<Array<[number, number]>>;
};

type SupportedGeometry = GeoJsonLineString | GeoJsonMultiLineString;

type SerFeatureProperties = {
  ID?: number;
  Color?: string;
  Bateria_Li?: string;
  Res_NumPla?: number;
  Texto_Caje?: string;
};

type SerFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    properties: SerFeatureProperties;
    geometry: SupportedGeometry | null;
  }>;
};

export type SerBandFeature = {
  id: string;
  zone_name: string | null;
  line_type: string | null;
  reserved_places: number | null;
  text_notes: string | null;
  geometry: SupportedGeometry;
  bbox: [number, number, number, number];
};

export type SerCoverageRecord = {
  center_id: string;
  enabled: boolean;
  zone_name: string | null;
  coverage_method: string;
  distance_m: number | null;
};

export type SerSyncBuildResult = {
  sql: string;
  counts: {
    centers: number;
    enabled: number;
    disabled: number;
    zones: number;
  };
};

type CenterCoordinateRecord = {
  id: string;
  lat: number | null;
  lon: number | null;
};

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

function hashInput(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function computeLineBoundingBox(
  geometry: SupportedGeometry,
): [number, number, number, number] {
  const coordinates =
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.coordinates;
  let minLon = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const line of coordinates) {
    for (const [lon, lat] of line) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return [minLon, minLat, maxLon, maxLat];
}

function normalizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isSupportedGeometry(
  geometry: SupportedGeometry | null,
): geometry is SupportedGeometry {
  return (
    geometry !== null &&
    (geometry.type === "LineString" || geometry.type === "MultiLineString")
  );
}

function buildSerBandFeature(
  feature: SerFeatureCollection["features"][number],
): SerBandFeature | null {
  if (!isSupportedGeometry(feature.geometry)) {
    return null;
  }

  return {
    id: String(feature.properties.ID ?? hashInput(JSON.stringify(feature))),
    zone_name: normalizeText(feature.properties.Color),
    line_type: normalizeText(feature.properties.Bateria_Li),
    reserved_places:
      typeof feature.properties.Res_NumPla === "number"
        ? feature.properties.Res_NumPla
        : null,
    text_notes: normalizeText(feature.properties.Texto_Caje),
    geometry: feature.geometry,
    bbox: computeLineBoundingBox(feature.geometry),
  };
}

function getExpandedBoundingBoxForPoint(
  lat: number,
  lon: number,
  distanceMeters: number,
): [number, number, number, number] {
  const latDelta = distanceMeters / 111320;
  const lonDelta =
    distanceMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));

  return [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta];
}

function intersectsBoundingBox(
  left: [number, number, number, number],
  right: [number, number, number, number],
): boolean {
  return !(
    left[2] < right[0] ||
    left[0] > right[2] ||
    left[3] < right[1] ||
    left[1] > right[3]
  );
}

function getGeometryDistanceMeters(
  lat: number,
  lon: number,
  geometry: SupportedGeometry,
): number {
  if (geometry.type === "LineString") {
    return pointToLineDistanceMeters(lat, lon, geometry.coordinates);
  }

  return geometry.coordinates.reduce((minDistance, line) => {
    return Math.min(minDistance, pointToLineDistanceMeters(lat, lon, line));
  }, Number.POSITIVE_INFINITY);
}

export async function loadSerBandFeatures(): Promise<SerBandFeature[]> {
  const buffer = await downloadSerSourceZip();
  (globalThis as typeof globalThis & { self?: typeof globalThis }).self ??=
    globalThis;
  const { default: shp } = await import("shpjs");
  const parsed = await shp(buffer);
  const collection = (Array.isArray(parsed) ? parsed[0] : parsed) as SerFeatureCollection;

  return collection.features
    .map(buildSerBandFeature)
    .filter((feature): feature is SerBandFeature => feature !== null);
}

async function downloadSerSourceZip(): Promise<Buffer> {
  const response = await fetch(SER_SOURCE_URL, {
    headers: {
      "user-agent": "alabiblio-ser-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`ser_source_http_${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function buildCoverageMethod(distanceMeters: number | null): string {
  if (distanceMeters === null) {
    return "no_coordinates";
  }

  return distanceMeters <= SER_ENABLED_DISTANCE_THRESHOLD_METERS
    ? `nearest_ser_band_within_${SER_ENABLED_DISTANCE_THRESHOLD_METERS}m`
    : "outside_ser_threshold";
}

export function buildSerCoverageRecords(
  centers: CenterCoordinateRecord[],
  bands: SerBandFeature[],
): SerCoverageRecord[] {
  return centers.map((center) => {
    if (center.lat === null || center.lon === null) {
      return {
        center_id: center.id,
        enabled: false,
        zone_name: null,
        coverage_method: "no_coordinates",
        distance_m: null,
      };
    }

    const pointBox = getExpandedBoundingBoxForPoint(
      center.lat,
      center.lon,
      SER_ENABLED_DISTANCE_THRESHOLD_METERS,
    );
    let nearestBand: SerBandFeature | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const band of bands) {
      if (!intersectsBoundingBox(pointBox, band.bbox)) {
        continue;
      }

      const distance = getGeometryDistanceMeters(
        center.lat,
        center.lon,
        band.geometry,
      );

      if (distance < nearestDistance) {
        nearestBand = band;
        nearestDistance = distance;
      }
    }

    if (!nearestBand || !Number.isFinite(nearestDistance)) {
      return {
        center_id: center.id,
        enabled: false,
        zone_name: null,
        coverage_method: "outside_ser_threshold",
        distance_m: null,
      };
    }

    return {
      center_id: center.id,
      enabled: nearestDistance <= SER_ENABLED_DISTANCE_THRESHOLD_METERS,
      zone_name:
        nearestDistance <= SER_ENABLED_DISTANCE_THRESHOLD_METERS
          ? nearestBand.zone_name
          : null,
      coverage_method: buildCoverageMethod(nearestDistance),
      distance_m: Number(nearestDistance.toFixed(1)),
    };
  });
}

export function buildSerCoverageSql(input: {
  centers: CenterCoordinateRecord[];
  bands: SerBandFeature[];
  sourceId: string;
}): SerSyncBuildResult {
  const computedAt = new Date().toISOString();
  const runId = `run_${input.sourceId}_${randomUUID()}`;
  const checksum = hashInput(
    JSON.stringify(
      input.bands.map((band) => ({
        id: band.id,
        zone_name: band.zone_name,
        line_type: band.line_type,
        reserved_places: band.reserved_places,
      })),
    ),
  );
  const coverage = buildSerCoverageRecords(input.centers, input.bands);
  const statements = coverage.map((item) => {
    return `INSERT INTO center_ser_coverage (
      center_id, source_id, enabled, zone_name, coverage_method, distance_m, computed_at
    ) VALUES (
      ${sqlValue(item.center_id)},
      ${sqlValue(input.sourceId)},
      ${sqlValue(item.enabled)},
      ${sqlValue(item.zone_name)},
      ${sqlValue(item.coverage_method)},
      ${sqlValue(item.distance_m)},
      ${sqlValue(computedAt)}
    )
    ON CONFLICT(center_id) DO UPDATE SET
      source_id = excluded.source_id,
      enabled = excluded.enabled,
      zone_name = excluded.zone_name,
      coverage_method = excluded.coverage_method,
      distance_m = excluded.distance_m,
      computed_at = excluded.computed_at;`;
  });

  return {
    sql: [
      `INSERT INTO ingestion_runs (
        id, source_id, status, started_at, finished_at, row_count_raw, row_count_valid,
        row_count_rejected, warning_count, error_count, checksum,
        triggered_by, meta_json
      ) VALUES (
        ${sqlValue(runId)},
        ${sqlValue(input.sourceId)},
        'running',
        ${sqlValue(computedAt)},
        NULL,
        ${sqlValue(input.bands.length)},
        0,
        0,
        0,
        0,
        ${sqlValue(checksum)},
        'script',
        NULL
      )
      ON CONFLICT(id) DO NOTHING;`,
      ...statements,
      `UPDATE ingestion_runs SET
        status = 'completed',
        finished_at = ${sqlValue(computedAt)},
        row_count_valid = ${sqlValue(coverage.length)},
        row_count_rejected = 0,
        warning_count = 0,
        error_count = 0
      WHERE id = ${sqlValue(runId)};`,
    ].join("\n"),
    counts: {
      centers: coverage.length,
      enabled: coverage.filter((item) => item.enabled).length,
      disabled: coverage.filter((item) => !item.enabled).length,
      zones: new Set(
        coverage
          .map((item) => item.zone_name)
          .filter((zoneName): zoneName is string => zoneName !== null),
      ).size,
    },
  };
}
