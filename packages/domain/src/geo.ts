const EARTH_RADIUS_METERS = 6371000;
const WGS84_A = 6378137;
const WGS84_E = 0.08181919084262149;
const UTM_SCALE_FACTOR = 0.9996;
const UTM_ZONE_30_CENTRAL_MERIDIAN = -3;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function haversineDistanceMeters(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);
  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLatRad) *
      Math.cos(toLatRad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function walkingMinutesFromDistance(distanceMeters: number | null): number | null {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return null;
  }

  return Math.max(1, Math.round(distanceMeters / 80));
}

export function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return null;
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
}

export function utm30ToWgs84(
  easting: number,
  northing: number,
): { lat: number; lon: number } {
  const eSquared = WGS84_E * WGS84_E;
  const ePrimeSquared = eSquared / (1 - eSquared);
  const x = easting - 500000;
  const y = northing;
  const meridionalArc = y / UTM_SCALE_FACTOR;
  const mu =
    meridionalArc /
    (WGS84_A *
      (1 -
        eSquared / 4 -
        (3 * eSquared * eSquared) / 64 -
        (5 * eSquared * eSquared * eSquared) / 256));
  const e1 = (1 - Math.sqrt(1 - eSquared)) / (1 + Math.sqrt(1 - eSquared));
  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const footprintLatitude =
    mu +
    j1 * Math.sin(2 * mu) +
    j2 * Math.sin(4 * mu) +
    j3 * Math.sin(6 * mu) +
    j4 * Math.sin(8 * mu);
  const sinFootprint = Math.sin(footprintLatitude);
  const cosFootprint = Math.cos(footprintLatitude);
  const tanFootprint = Math.tan(footprintLatitude);
  const n =
    WGS84_A / Math.sqrt(1 - eSquared * sinFootprint * sinFootprint);
  const t = tanFootprint * tanFootprint;
  const c = ePrimeSquared * cosFootprint * cosFootprint;
  const r =
    (WGS84_A * (1 - eSquared)) /
    Math.pow(1 - eSquared * sinFootprint * sinFootprint, 1.5);
  const d = x / (n * UTM_SCALE_FACTOR);
  const latitude =
    footprintLatitude -
    ((n * tanFootprint) / r) *
      (d * d / 2 -
        ((5 + 3 * t + 10 * c - 4 * c * c - 9 * ePrimeSquared) *
          d ** 4) /
          24 +
        ((61 +
          90 * t +
          298 * c +
          45 * t * t -
          252 * ePrimeSquared -
          3 * c * c) *
          d ** 6) /
          720);
  const longitude =
    ((UTM_ZONE_30_CENTRAL_MERIDIAN * Math.PI) / 180) +
    (d -
      ((1 + 2 * t + c) * d ** 3) / 6 +
      ((5 -
        2 * c +
        28 * t -
        3 * c * c +
        8 * ePrimeSquared +
        24 * t * t) *
        d ** 5) /
        120) /
      cosFootprint;

  return {
    lat: toDegrees(latitude),
    lon: toDegrees(longitude),
  };
}

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoJsonMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

function pointInRing(lat: number, lon: number, ring: number[][]): boolean {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];

    if (!current || !prior) {
      continue;
    }

    const currentLon = current[0] ?? 0;
    const currentLat = current[1] ?? 0;
    const priorLon = prior[0] ?? 0;
    const priorLat = prior[1] ?? 0;
    const intersects =
      currentLat > lat !== priorLat > lat &&
      lon <
        ((priorLon - currentLon) * (lat - currentLat)) /
          ((priorLat - currentLat) || Number.EPSILON) +
          currentLon;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function pointInPolygon(
  lat: number,
  lon: number,
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon,
): boolean {
  if (geometry.type === "Polygon") {
    const [outerRing, ...holes] = geometry.coordinates;

    if (!outerRing || !pointInRing(lat, lon, outerRing)) {
      return false;
    }

    return !holes.some((ring) => pointInRing(lat, lon, ring));
  }

  return geometry.coordinates.some((polygon) =>
    pointInPolygon(lat, lon, {
      type: "Polygon",
      coordinates: polygon,
    }),
  );
}
