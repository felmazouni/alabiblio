const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
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

function projectRelativeToPoint(
  originLat: number,
  originLon: number,
  lat: number,
  lon: number,
): { x: number; y: number } {
  const originLatRad = toRadians(originLat);
  return {
    x: EARTH_RADIUS_METERS * toRadians(lon - originLon) * Math.cos(originLatRad),
    y: EARTH_RADIUS_METERS * toRadians(lat - originLat),
  };
}

function pointToSegmentDistanceMeters(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;

  if (denominator === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator;
  const factor = Math.max(0, Math.min(1, projection));
  const projectedX = start.x + factor * dx;
  const projectedY = start.y + factor * dy;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

export function pointToLineDistanceMeters(
  lat: number,
  lon: number,
  coordinates: ReadonlyArray<readonly [number, number]>,
): number {
  if (coordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (coordinates.length === 1) {
    const onlyCoordinate = coordinates[0];

    if (!onlyCoordinate) {
      return Number.POSITIVE_INFINITY;
    }

    return haversineDistanceMeters(
      lat,
      lon,
      onlyCoordinate[1],
      onlyCoordinate[0],
    );
  }

  const point = { x: 0, y: 0 };
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const current = coordinates[index];
    const next = coordinates[index + 1];

    if (!current || !next) {
      continue;
    }

    const start = projectRelativeToPoint(
      lat,
      lon,
      current[1],
      current[0],
    );
    const end = projectRelativeToPoint(
      lat,
      lon,
      next[1],
      next[0],
    );
    minDistance = Math.min(
      minDistance,
      pointToSegmentDistanceMeters(point, start, end),
    );
  }

  return minDistance;
}
