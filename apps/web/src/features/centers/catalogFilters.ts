import type { CenterKind, CenterSortBy, ListCentersQuery } from "@alabiblio/contracts/centers";

export type KindFilter = "all" | CenterKind;
export type CatalogBaseSortBy = "open_now";

export type CatalogFilterState = {
  kindFilter: KindFilter;
  sortBy: CatalogBaseSortBy;
  searchText: string;
  openNowOnly: boolean;
  wifiOnly: boolean;
  accessibleOnly: boolean;
  serOnly: boolean;
  districtFilter: string;
  neighborhoodFilter: string;
};

export type CatalogActiveFilterKey =
  | "kind"
  | "sort"
  | "open_now"
  | "wifi"
  | "accessible"
  | "ser"
  | "district"
  | "neighborhood";

export type CatalogActiveFilterChip = {
  key: CatalogActiveFilterKey;
  label: string;
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  kindFilter: "all",
  sortBy: "open_now",
  searchText: "",
  openNowOnly: false,
  wifiOnly: false,
  accessibleOnly: false,
  serOnly: false,
  districtFilter: "",
  neighborhoodFilter: "",
};

const VALID_KIND_FILTERS = new Set<KindFilter>(["all", "library", "study_room"]);
const VALID_SORT_OPTIONS = new Set<CatalogBaseSortBy>(["open_now"]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function parseBooleanFlag(value: string | null): boolean {
  return value === "true" || value === "1";
}

function parseKindFilter(value: string | null): KindFilter {
  if (value && VALID_KIND_FILTERS.has(value as KindFilter)) {
    return value as KindFilter;
  }
  return DEFAULT_CATALOG_FILTERS.kindFilter;
}

function parseSortBy(value: string | null): CatalogBaseSortBy {
  if (value && VALID_SORT_OPTIONS.has(value as CatalogBaseSortBy)) {
    return value as CatalogBaseSortBy;
  }
  return DEFAULT_CATALOG_FILTERS.sortBy;
}

export function parseCatalogFilterSearchParams(searchParams: URLSearchParams): CatalogFilterState {
  return {
    kindFilter: parseKindFilter(searchParams.get("kind")),
    sortBy: parseSortBy(searchParams.get("sort_by")),
    searchText: normalizeText(searchParams.get("q")),
    openNowOnly: parseBooleanFlag(searchParams.get("open_now")),
    wifiOnly: parseBooleanFlag(searchParams.get("has_wifi")),
    accessibleOnly: parseBooleanFlag(searchParams.get("accessible")),
    serOnly: parseBooleanFlag(searchParams.get("has_ser")),
    districtFilter: normalizeText(searchParams.get("district")),
    neighborhoodFilter: normalizeText(searchParams.get("neighborhood")),
  };
}

export function buildCatalogFilterSearchParams(filters: CatalogFilterState): URLSearchParams {
  const params = new URLSearchParams();

  const searchText = normalizeText(filters.searchText);
  const districtFilter = normalizeText(filters.districtFilter);
  const neighborhoodFilter = normalizeText(filters.neighborhoodFilter);

  if (filters.kindFilter !== DEFAULT_CATALOG_FILTERS.kindFilter) {
    params.set("kind", filters.kindFilter);
  }

  if (filters.sortBy !== DEFAULT_CATALOG_FILTERS.sortBy) {
    params.set("sort_by", filters.sortBy);
  }

  if (searchText) {
    params.set("q", searchText);
  }

  if (filters.openNowOnly) {
    params.set("open_now", "true");
  }

  if (filters.wifiOnly) {
    params.set("has_wifi", "true");
  }

  if (filters.accessibleOnly) {
    params.set("accessible", "true");
  }

  if (filters.serOnly) {
    params.set("has_ser", "true");
  }

  if (districtFilter) {
    params.set("district", districtFilter);
  }

  if (neighborhoodFilter) {
    params.set("neighborhood", neighborhoodFilter);
  }

  return params;
}

export function buildBaseCatalogListQuery(
  filters: CatalogFilterState,
  options: {
    deferredSearch: string;
    limit?: number;
    offset?: number;
  },
): ListCentersQuery {
  return {
    kind: filters.kindFilter === "all" ? undefined : filters.kindFilter,
    q: normalizeText(options.deferredSearch) || undefined,
    limit: options.limit,
    offset: options.offset,
    open_now: filters.openNowOnly || undefined,
    has_wifi: filters.wifiOnly || undefined,
    accessible: filters.accessibleOnly || undefined,
    has_ser: filters.serOnly || undefined,
    district: normalizeText(filters.districtFilter) || undefined,
    neighborhood: normalizeText(filters.neighborhoodFilter) || undefined,
    sort_by: "open_now",
  };
}

export function buildTopMobilityQuery(options: {
  limit?: number;
  offset?: number;
  userLat?: number;
  userLon?: number;
  sortBy?: CenterSortBy;
}): ListCentersQuery {
  return {
    limit: options.limit,
    offset: options.offset,
    sort_by: options.sortBy ?? "recommended",
    user_lat: options.userLat,
    user_lon: options.userLon,
  };
}

export function buildCatalogActiveFilterChips(filters: CatalogFilterState): CatalogActiveFilterChip[] {
  const chips: CatalogActiveFilterChip[] = [];

  if (filters.kindFilter !== DEFAULT_CATALOG_FILTERS.kindFilter) {
    chips.push({
      key: "kind",
      label: filters.kindFilter === "library" ? "Bibliotecas" : "Salas estudio",
    });
  }

  if (filters.sortBy !== DEFAULT_CATALOG_FILTERS.sortBy) {
    chips.push({
      key: "sort",
      label: "Abiertos primero",
    });
  }

  if (filters.openNowOnly) chips.push({ key: "open_now", label: "Abierto ahora" });
  if (filters.wifiOnly) chips.push({ key: "wifi", label: "WiFi" });
  if (filters.accessibleOnly) chips.push({ key: "accessible", label: "Accesible" });
  if (filters.serOnly) chips.push({ key: "ser", label: "Zona SER" });

  const districtFilter = normalizeText(filters.districtFilter);
  if (districtFilter) chips.push({ key: "district", label: districtFilter });

  const neighborhoodFilter = normalizeText(filters.neighborhoodFilter);
  if (neighborhoodFilter) chips.push({ key: "neighborhood", label: neighborhoodFilter });

  return chips;
}

export function clearCatalogFilter(
  filters: CatalogFilterState,
  key: CatalogActiveFilterKey,
): CatalogFilterState {
  switch (key) {
    case "kind":
      return { ...filters, kindFilter: DEFAULT_CATALOG_FILTERS.kindFilter };
    case "sort":
      return { ...filters, sortBy: DEFAULT_CATALOG_FILTERS.sortBy };
    case "open_now":
      return { ...filters, openNowOnly: false };
    case "wifi":
      return { ...filters, wifiOnly: false };
    case "accessible":
      return { ...filters, accessibleOnly: false };
    case "ser":
      return { ...filters, serOnly: false };
    case "district":
      return { ...filters, districtFilter: "" };
    case "neighborhood":
      return { ...filters, neighborhoodFilter: "" };
  }
}

export function areCatalogFiltersEqual(left: CatalogFilterState, right: CatalogFilterState): boolean {
  return left.kindFilter === right.kindFilter
    && left.sortBy === right.sortBy
    && normalizeText(left.searchText) === normalizeText(right.searchText)
    && left.openNowOnly === right.openNowOnly
    && left.wifiOnly === right.wifiOnly
    && left.accessibleOnly === right.accessibleOnly
    && left.serOnly === right.serOnly
    && normalizeText(left.districtFilter) === normalizeText(right.districtFilter)
    && normalizeText(left.neighborhoodFilter) === normalizeText(right.neighborhoodFilter);
}
