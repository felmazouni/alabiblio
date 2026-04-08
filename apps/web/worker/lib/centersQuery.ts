import type { CenterSortBy, ListCentersQuery } from "@alabiblio/contracts/centers";

export function parseIntegerParam(
  value: string | null,
  fallback: number,
  { min, max }: { min: number; max: number },
): number {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("invalid_integer");
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error("invalid_integer_range");
  }

  return parsed;
}

export function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  throw new Error("invalid_boolean");
}

export function parseCoordinateParam(
  value: string | null,
  { min, max }: { min: number; max: number },
): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error("invalid_coordinate");
  }

  return parsed;
}

export function parseSortByParam(value: string | null): CenterSortBy | undefined {
  if (value === null || value === "") {
    return undefined;
  }

  if (
    value === "recommended" ||
    value === "distance" ||
    value === "arrival" ||
    value === "open_now"
  ) {
    return value;
  }

  throw new Error("invalid_sort_by");
}

export function parseListCentersQuery(
  url: URL,
  defaults: {
    limit: number;
    maxLimit: number;
  },
): Required<Pick<ListCentersQuery, "limit" | "offset">> &
  Pick<
    ListCentersQuery,
    | "kind"
    | "q"
    | "open_now"
    | "has_wifi"
    | "has_sockets"
    | "accessible"
    | "open_air"
    | "has_ser"
    | "district"
    | "neighborhood"
    | "sort_by"
    | "user_lat"
    | "user_lon"
  > {
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = parseIntegerParam(url.searchParams.get("limit"), defaults.limit, {
    min: 1,
    max: defaults.maxLimit,
  });
  const offset = parseIntegerParam(url.searchParams.get("offset"), 0, {
    min: 0,
    max: 5000,
  });

  if (kind !== null && kind !== "study_room" && kind !== "library") {
    throw new Error("invalid_kind");
  }

  const userLat = parseCoordinateParam(url.searchParams.get("user_lat"), {
    min: -90,
    max: 90,
  });
  const userLon = parseCoordinateParam(url.searchParams.get("user_lon"), {
    min: -180,
    max: 180,
  });

  if ((userLat === undefined) !== (userLon === undefined)) {
    throw new Error("invalid_partial_user_location");
  }

  const district = url.searchParams.get("district")?.trim() ?? "";
  const neighborhood = url.searchParams.get("neighborhood")?.trim() ?? "";

  return {
    kind: kind ?? undefined,
    q: q === "" ? undefined : q,
    limit,
    offset,
    open_now: parseBooleanParam(url.searchParams.get("open_now")),
    has_wifi: parseBooleanParam(url.searchParams.get("has_wifi")),
    has_sockets: parseBooleanParam(url.searchParams.get("has_sockets")),
    accessible: parseBooleanParam(url.searchParams.get("accessible")),
    open_air: parseBooleanParam(url.searchParams.get("open_air")),
    has_ser: parseBooleanParam(url.searchParams.get("has_ser")),
    district: district === "" ? undefined : district,
    neighborhood: neighborhood === "" ? undefined : neighborhood,
    sort_by: parseSortByParam(url.searchParams.get("sort_by")),
    user_lat: userLat,
    user_lon: userLon,
  };
}

export function buildCenterFilters(
  query: ReturnType<typeof parseListCentersQuery>,
) {
  return {
    kind: query.kind,
    q: query.q,
    has_wifi: query.has_wifi,
    has_sockets: query.has_sockets,
    accessible: query.accessible,
    open_air: query.open_air,
    has_ser: query.has_ser,
    district: query.district,
    neighborhood: query.neighborhood,
  };
}

export function toBaseExplorationQuery(
  query: ReturnType<typeof parseListCentersQuery>,
): ReturnType<typeof parseListCentersQuery> {
  return {
    ...query,
    sort_by: "open_now",
    user_lat: undefined,
    user_lon: undefined,
  };
}

export function buildListSortMode(
  requestedSort: CenterSortBy | undefined,
  hasUserLocation: boolean,
): CenterSortBy {
  return requestedSort ?? (hasUserLocation ? "recommended" : "open_now");
}

export function buildOriginBucket(lat: number | undefined, lon: number | undefined): string | null {
  if (lat === undefined || lon === undefined) {
    return null;
  }

  const resolution = 0.002;
  const latBucket = (Math.round(lat / resolution) * resolution).toFixed(3);
  const lonBucket = (Math.round(lon / resolution) * resolution).toFixed(3);

  return `${latBucket},${lonBucket}`;
}
