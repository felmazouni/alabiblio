import type {
  CenterRatingVoteInput,
  CenterCatalogItem,
  CenterKind,
  DataOrigin,
  PublicCatalogResponse,
  PublicCenterDetailResponse,
  PublicCenterRatingsResponse,
  PublicFiltersResponse,
  SortMode,
  TransportMode,
} from "@alabiblio/contracts";
import { useEffect, useMemo, useState } from "react";
import type { UserLocation } from "./userLocation";

export interface PublicFiltersState {
  query: string;
  kinds: CenterKind[];
  transportModes: TransportMode[];
  districts: string[];
  neighborhoods: string[];
  openNow: boolean;
  accessible: boolean;
  withWifi: boolean;
  withCapacity: boolean;
  withSer: boolean;
  radiusMeters: number;
  sort: SortMode;
}

export const defaultPublicFilters: PublicFiltersState = {
  query: "",
  kinds: [],
  transportModes: [],
  districts: [],
  neighborhoods: [],
  openNow: false,
  accessible: false,
  withWifi: false,
  withCapacity: false,
  withSer: false,
  radiusMeters: 120000,
  sort: "relevance",
};

const FILTER_PARAM_KEYS = [
  "q",
  "kinds",
  "transport",
  "district",
  "districts",
  "neighborhood",
  "neighborhoods",
  "open_now",
  "accessible",
  "wifi",
  "with_capacity",
  "ser",
  "with_ser",
  "radius_m",
  "sort",
] as const;

const ALLOWED_KINDS: CenterKind[] = ["library", "study_room"];
const ALLOWED_TRANSPORT: TransportMode[] = [
  "metro",
  "cercanias",
  "metro_ligero",
  "emt_bus",
  "interurban_bus",
  "bicimad",
  "car",
];
const ALLOWED_SORT: SortMode[] = [
  "relevance",
  "distance",
  "closing",
  "capacity",
  "name",
];

function readCsvParams(searchParams: URLSearchParams, keys: string[]): string[] {
  const tokens = keys.flatMap((key) => {
    const allValues = searchParams.getAll(key);
    return allValues.flatMap((value) => value.split(",").map((item) => item.trim()));
  });

  return [...new Set(tokens.filter(Boolean))];
}

function readFlag(searchParams: URLSearchParams, keys: string[]): boolean {
  return keys.some((key) => {
    const value = searchParams.get(key);
    if (!value) {
      return false;
    }

    const normalized = value.trim().toLocaleLowerCase("es-ES");
    return normalized === "1" || normalized === "true" || normalized === "yes";
  });
}

function sortCsv(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "es-ES"));
}

export function parsePublicFiltersFromSearchParams(
  searchParams: URLSearchParams,
): PublicFiltersState {
  const query = (searchParams.get("q") ?? "").trim();
  const kinds = readCsvParams(searchParams, ["kinds"]).filter((value): value is CenterKind =>
    ALLOWED_KINDS.includes(value as CenterKind),
  );
  const transportModes = readCsvParams(searchParams, ["transport"]).filter(
    (value): value is TransportMode => ALLOWED_TRANSPORT.includes(value as TransportMode),
  );
  const districts = readCsvParams(searchParams, ["district", "districts"]);
  const neighborhoods = readCsvParams(searchParams, ["neighborhood", "neighborhoods"]);
  const openNow = readFlag(searchParams, ["open_now"]);
  const accessible = readFlag(searchParams, ["accessible"]);
  const withWifi = readFlag(searchParams, ["wifi"]);
  const withCapacity = readFlag(searchParams, ["with_capacity"]);
  const withSer = readFlag(searchParams, ["ser", "with_ser"]);
  const radiusRaw = Number(searchParams.get("radius_m") ?? "");
  const radiusMeters = Number.isFinite(radiusRaw)
    ? Math.max(5000, Math.min(120000, Math.round(radiusRaw)))
    : defaultPublicFilters.radiusMeters;

  const sortRaw = (searchParams.get("sort") ?? defaultPublicFilters.sort).trim();
  const sort = ALLOWED_SORT.includes(sortRaw as SortMode)
    ? (sortRaw as SortMode)
    : defaultPublicFilters.sort;

  return {
    query,
    kinds,
    transportModes,
    districts,
    neighborhoods,
    openNow,
    accessible,
    withWifi,
    withCapacity,
    withSer,
    radiusMeters,
    sort,
  };
}

export function writePublicFiltersToSearchParams(
  currentSearchParams: URLSearchParams,
  filters: PublicFiltersState,
): URLSearchParams {
  const params = new URLSearchParams(currentSearchParams);

  for (const key of FILTER_PARAM_KEYS) {
    params.delete(key);
  }

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.kinds.length > 0) {
    params.set("kinds", sortCsv(filters.kinds).join(","));
  }
  if (filters.transportModes.length > 0) {
    params.set("transport", sortCsv(filters.transportModes).join(","));
  }
  if (filters.districts.length > 0) {
    params.set("district", sortCsv(filters.districts).join(","));
  }
  if (filters.neighborhoods.length > 0) {
    params.set("neighborhood", sortCsv(filters.neighborhoods).join(","));
  }
  if (filters.openNow) {
    params.set("open_now", "1");
  }
  if (filters.accessible) {
    params.set("accessible", "1");
  }
  if (filters.withWifi) {
    params.set("wifi", "1");
  }
  if (filters.withCapacity) {
    params.set("with_capacity", "1");
  }
  if (filters.withSer) {
    params.set("ser", "1");
  }
  if (filters.radiusMeters !== defaultPublicFilters.radiusMeters) {
    params.set("radius_m", String(filters.radiusMeters));
  }

  params.set("sort", filters.sort);

  return params;
}

function buildQueryString(
  filters: PublicFiltersState,
  location: UserLocation | null,
  limit?: number,
): string {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (location) {
    params.set("lat", String(location.lat));
    params.set("lon", String(location.lon));
    params.set("radius_m", String(filters.radiusMeters));
  }

  if (filters.kinds.length > 0) {
    params.set("kinds", filters.kinds.join(","));
  }

  if (filters.transportModes.length > 0) {
    params.set("transport", filters.transportModes.join(","));
  }

  if (filters.districts.length > 0) {
    params.set("district", filters.districts.join(","));
  }

  if (filters.neighborhoods.length > 0) {
    params.set("neighborhood", filters.neighborhoods.join(","));
  }

  if (filters.openNow) {
    params.set("open_now", "1");
  }

  if (filters.accessible) {
    params.set("accessible", "1");
  }

  if (filters.withWifi) {
    params.set("wifi", "1");
  }

  if (filters.withCapacity) {
    params.set("with_capacity", "1");
  }

  if (filters.withSer) {
    params.set("ser", "1");
  }

  params.set("sort", filters.sort);

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function usePublicCatalog(filters: PublicFiltersState, location: UserLocation | null, limit?: number) {
  const [data, setData] = useState<PublicCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchJson<PublicCatalogResponse>(
      `/api/public/catalog${buildQueryString(filters, location, limit)}`,
      controller.signal,
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "catalog_fetch_failed",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, location, limit]);

  const topItems = useMemo(() => data?.items.slice(0, 3) ?? [], [data?.items]);

  return {
    loading,
    error,
    data,
    items: data?.items ?? [],
    metrics: data?.metrics ?? null,
    total: data?.total ?? 0,
    topItems,
  };
}

export function usePublicFilters(filters: PublicFiltersState, location: UserLocation | null) {
  const [data, setData] = useState<PublicFiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchJson<PublicFiltersResponse>(
      `/api/public/filters${buildQueryString(filters, location)}`,
      controller.signal,
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "filters_fetch_failed",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, location]);

  return {
    loading,
    error,
    data,
  };
}

export function usePublicCenterDetail(
  slug: string | undefined,
  location: UserLocation | null,
) {
  const [data, setData] = useState<PublicCenterDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setLoading(false);
      setError("missing_slug");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const query = location
      ? `?lat=${location.lat}&lon=${location.lon}`
      : "";

    fetchJson<PublicCenterDetailResponse>(
      `/api/public/centers/${slug}${query}`,
      controller.signal,
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "center_fetch_failed",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug, location]);

  return {
    loading,
    error,
    data,
    center: data?.item.center ?? null,
  };
}

export type PublicCenterPresentation = CenterCatalogItem & {
  rankingPosition?: number;
};

export interface BicimadAvailabilityResponse {
  stationId: string;
  bikesAvailable: number | null;
  docksAvailable: number | null;
  dataOrigin: DataOrigin;
  sourceLabel: string;
  fetchedAt: string | null;
  note: string | null;
}

export async function fetchBicimadAvailability(
  stationId: string,
  stationName?: string | null,
  signal?: AbortSignal,
): Promise<BicimadAvailabilityResponse> {
  const params = new URLSearchParams({ station_id: stationId });
  if (stationName && stationName.trim() !== "") {
    params.set("station_name", stationName.trim());
  }
  return fetchJson<BicimadAvailabilityResponse>(
    `/api/public/transport/bicimad/availability?${params.toString()}`,
    signal ?? new AbortController().signal,
  );
}

export interface CallejeroSuggestion {
  lat: number;
  lon: number;
  label: string;
}

export async function fetchCallejeroSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<CallejeroSuggestion[]> {
  if (query.trim().length < 3) {
    return [];
  }
  return fetchJson<CallejeroSuggestion[]>(
    `/api/public/callejero/autocomplete?q=${encodeURIComponent(query.trim())}`,
    signal ?? new AbortController().signal,
  );
}

export interface GoogleAuthConfigResponse {
  enabled: boolean;
  clientId: string | null;
}

export async function fetchGoogleAuthConfig(
  signal?: AbortSignal,
): Promise<GoogleAuthConfigResponse> {
  return fetchJson<GoogleAuthConfigResponse>(
    "/api/public/auth/google/config",
    signal ?? new AbortController().signal,
  );
}

export async function fetchCenterRatings(
  slug: string,
  idToken?: string | null,
  signal?: AbortSignal,
): Promise<PublicCenterRatingsResponse> {
  const response = await fetch(`/api/public/centers/${slug}/ratings`, {
    headers: {
      accept: "application/json",
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
    signal: signal ?? new AbortController().signal,
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json() as Promise<PublicCenterRatingsResponse>;
}

export async function submitCenterRating(
  slug: string,
  vote: CenterRatingVoteInput,
  idToken: string,
): Promise<PublicCenterRatingsResponse> {
  const response = await fetch(`/api/public/centers/${slug}/ratings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ idToken, vote }),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json() as Promise<PublicCenterRatingsResponse>;
}

export function useCenterRatings(slug: string | undefined, idToken?: string | null) {
  const [data, setData] = useState<PublicCenterRatingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setError("missing_slug");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCenterRatings(slug, idToken, controller.signal)
      .then((payload) => setData(payload))
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "ratings_fetch_failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug, idToken]);

  return {
    data,
    loading,
    error,
    refresh: async () => {
      if (!slug) {
        return;
      }
      const payload = await fetchCenterRatings(slug, idToken);
      setData(payload);
      setError(null);
    },
  };
}
