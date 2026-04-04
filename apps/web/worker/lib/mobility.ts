import { haversineDistanceMeters } from "@alabiblio/geo/distance";
import type { JsonValue } from "@alabiblio/mobility/types";
import type {
  DecisionBicimadStation,
  DecisionEmtStop,
  DecisionMetroStation,
  DecisionParking,
} from "@alabiblio/domain/mobility";
import type { ActiveTransportNodeRow, TransportNodeRow } from "./db";

function parseJsonRecord(
  value: string | null,
): Record<string, JsonValue> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as JsonValue;

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, JsonValue>;
    }
  } catch {
    return null;
  }

  return null;
}

function getStringArray(
  record: Record<string, JsonValue> | null,
  key: string,
): string[] {
  const value = record?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getNullableNumber(
  record: Record<string, JsonValue> | null,
  key: string,
): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getNullableString(
  record: Record<string, JsonValue> | null,
  key: string,
): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function toEmtStop(
  row: Pick<TransportNodeRow, "external_id" | "name" | "address_line" | "lat" | "lon" | "distance_m" | "metadata_json">,
): DecisionEmtStop {
  const metadata = parseJsonRecord(row.metadata_json);

  return {
    id: row.external_id,
    name: row.name,
    distance_m: row.distance_m,
    lat: row.lat,
    lon: row.lon,
    lines: getStringArray(metadata, "lines"),
  };
}

function toBicimadStation(
  row: Pick<TransportNodeRow, "external_id" | "name" | "address_line" | "lat" | "lon" | "distance_m" | "metadata_json">,
): DecisionBicimadStation {
  const metadata = parseJsonRecord(row.metadata_json);

  return {
    id: row.external_id,
    name: row.name,
    distance_m: row.distance_m,
    lat: row.lat,
    lon: row.lon,
    station_number:
      getNullableString(metadata, "station_number") ?? row.external_id,
    total_bases: getNullableNumber(metadata, "total_bases"),
    station_state: getNullableString(metadata, "station_state"),
    bikes_available: getNullableNumber(metadata, "bikes_available"),
    docks_available: getNullableNumber(metadata, "docks_available"),
  };
}

function toParking(
  row: Pick<TransportNodeRow, "external_id" | "name" | "lat" | "lon" | "distance_m">,
): DecisionParking {
  return {
    id: row.external_id,
    name: row.name,
    distance_m: row.distance_m,
    lat: row.lat,
    lon: row.lon,
  };
}

function toMetroStation(
  row: Pick<
    TransportNodeRow,
    "external_id" | "name" | "lat" | "lon" | "distance_m" | "metadata_json"
  >,
): DecisionMetroStation {
  const metadata = parseJsonRecord(row.metadata_json);

  return {
    id: row.external_id,
    name: row.name,
    distance_m: row.distance_m,
    lat: row.lat,
    lon: row.lon,
    lines: getStringArray(metadata, "lines"),
  };
}

export function groupDestinationTransportNodes(rows: TransportNodeRow[]): {
  destinationEmtStops: DecisionEmtStop[];
  destinationBicimadStations: DecisionBicimadStation[];
  destinationMetroStations: DecisionMetroStation[];
  destinationParkings: DecisionParking[];
} {
  const destinationEmtStops: DecisionEmtStop[] = [];
  const destinationBicimadStations: DecisionBicimadStation[] = [];
  const destinationMetroStations: DecisionMetroStation[] = [];
  const destinationParkings: DecisionParking[] = [];

  for (const row of rows) {
    if (row.kind === "emt_stop") {
      destinationEmtStops.push(toEmtStop(row));
      continue;
    }

    if (row.kind === "bicimad_station") {
      destinationBicimadStations.push(toBicimadStation(row));
      continue;
    }

    if (row.kind === "metro_station") {
      destinationMetroStations.push(toMetroStation(row));
      continue;
    }

    if (row.kind === "parking") {
      destinationParkings.push(toParking(row));
    }
  }

  return {
    destinationEmtStops,
    destinationBicimadStations,
    destinationMetroStations,
    destinationParkings,
  };
}

function distanceFromOrigin(
  row: ActiveTransportNodeRow,
  origin: { lat: number; lon: number },
): number {
  return haversineDistanceMeters(origin.lat, origin.lon, row.lat, row.lon);
}

export function buildOriginTransportCandidates(input: {
  rows: ActiveTransportNodeRow[];
  origin: { lat: number; lon: number };
}): {
  originEmtStops: DecisionEmtStop[];
  originBicimadStations: DecisionBicimadStation[];
  originMetroStations: DecisionMetroStation[];
} {
  const emtStops: DecisionEmtStop[] = [];
  const bicimadStations: DecisionBicimadStation[] = [];
  const metroStations: DecisionMetroStation[] = [];

  for (const row of input.rows) {
    const distance_m = distanceFromOrigin(row, input.origin);

    if (row.kind === "emt_stop") {
      emtStops.push(toEmtStop({ ...row, distance_m }));
      continue;
    }

    if (row.kind === "bicimad_station") {
      bicimadStations.push(toBicimadStation({ ...row, distance_m }));
      continue;
    }

    if (row.kind === "metro_station") {
      metroStations.push(toMetroStation({ ...row, distance_m }));
    }
  }

  emtStops.sort((left, right) => left.distance_m - right.distance_m);
  bicimadStations.sort((left, right) => left.distance_m - right.distance_m);
  metroStations.sort((left, right) => left.distance_m - right.distance_m);

  return {
    originEmtStops: emtStops.slice(0, 8),
    originBicimadStations: bicimadStations.slice(0, 6),
    originMetroStations: metroStations.slice(0, 4),
  };
}
