import type { CenterKind, PublicCatalogQuery, SortMode, TransportMode } from "@alabiblio/contracts";

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  return value === "1" || value === "true";
}

function parseKinds(value: string | null): CenterKind[] | undefined {
  if (!value) {
    return undefined;
  }

  const kinds = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is CenterKind => entry === "library" || entry === "study_room");

  return kinds.length > 0 ? kinds : undefined;
}

function parseTransportModes(value: string | null): TransportMode[] | undefined {
  if (!value) {
    return undefined;
  }

  const transportModes = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(
      (entry): entry is TransportMode =>
        entry === "metro" ||
        entry === "cercanias" ||
        entry === "metro_ligero" ||
        entry === "emt_bus" ||
        entry === "interurban_bus" ||
        entry === "bicimad" ||
        entry === "car",
    );

  return transportModes.length > 0 ? transportModes : undefined;
}

function parseStringList(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return items.length > 0 ? [...new Set(items)] : undefined;
}

function parseSort(value: string | null): SortMode | undefined {
  if (
    value === "relevance" ||
    value === "distance" ||
    value === "closing" ||
    value === "capacity" ||
    value === "name"
  ) {
    return value;
  }

  return undefined;
}

export function parsePublicCatalogQuery(url: URL): PublicCatalogQuery {
  const districtRaw = url.searchParams.get("district") ?? url.searchParams.get("districts");
  const neighborhoodRaw =
    url.searchParams.get("neighborhood") ?? url.searchParams.get("neighborhoods");

  return {
    q: url.searchParams.get("q") ?? undefined,
    lat: parseNumber(url.searchParams.get("lat")),
    lon: parseNumber(url.searchParams.get("lon")),
    radiusMeters: parseNumber(url.searchParams.get("radius_m")),
    kinds: parseKinds(url.searchParams.get("kinds")),
    transportModes: parseTransportModes(url.searchParams.get("transport")),
    districts: parseStringList(districtRaw),
    neighborhoods: parseStringList(neighborhoodRaw),
    openNow: parseBoolean(url.searchParams.get("open_now")),
    accessible: parseBoolean(url.searchParams.get("accessible")),
    withWifi: parseBoolean(url.searchParams.get("wifi")),
    withCapacity: parseBoolean(url.searchParams.get("with_capacity")),
    withSer: parseBoolean(url.searchParams.get("ser") ?? url.searchParams.get("with_ser")),
    sort: parseSort(url.searchParams.get("sort")),
    limit: parseNumber(url.searchParams.get("limit")),
  };
}
