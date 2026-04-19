import type {
  CenterCatalogItem,
  CenterKind,
  DataOrigin,
  PublicCatalogResponse,
  PublicCenterDetailResponse,
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
  openNow: boolean;
  accessible: boolean;
  withWifi: boolean;
  withCapacity: boolean;
  radiusMeters: number;
  sort: SortMode;
}

export const defaultPublicFilters: PublicFiltersState = {
  query: "",
  kinds: [],
  transportModes: [],
  openNow: false,
  accessible: false,
  withWifi: false,
  withCapacity: false,
  radiusMeters: 120000,
  sort: "relevance",
};

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
  signal?: AbortSignal,
): Promise<BicimadAvailabilityResponse> {
  const encodedStationId = encodeURIComponent(stationId);
  return fetchJson<BicimadAvailabilityResponse>(
    `/api/public/transport/bicimad/availability?station_id=${encodedStationId}`,
    signal ?? new AbortController().signal,
  );
}
