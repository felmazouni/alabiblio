import type {
  GetCenterDetailResponse,
  ListCentersQuery,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import type { GetCenterMobilityResponse as GetCenterMobilityResponsePayload } from "@alabiblio/contracts/mobility";
import type {
  GeocodeSearchResponse,
  GetOriginPresetsResponse,
} from "@alabiblio/contracts/origin";
import { sanitizeApiPayload } from "../../lib/displayText";

async function readSanitizedJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T;
  return sanitizeApiPayload(payload);
}

function buildListCentersUrl(query: ListCentersQuery): string {
  const url = new URL("/api/centers", window.location.origin);

  if (query.kind) {
    url.searchParams.set("kind", query.kind);
  }

  if (query.q) {
    url.searchParams.set("q", query.q);
  }

  if (query.open_now !== undefined) {
    url.searchParams.set("open_now", String(query.open_now));
  }

  if (query.has_wifi !== undefined) {
    url.searchParams.set("has_wifi", String(query.has_wifi));
  }

  if (query.has_sockets !== undefined) {
    url.searchParams.set("has_sockets", String(query.has_sockets));
  }

  if (query.accessible !== undefined) {
    url.searchParams.set("accessible", String(query.accessible));
  }

  if (query.open_air !== undefined) {
    url.searchParams.set("open_air", String(query.open_air));
  }

  if (query.has_ser !== undefined) {
    url.searchParams.set("has_ser", String(query.has_ser));
  }

  if (query.district) {
    url.searchParams.set("district", query.district);
  }

  if (query.neighborhood) {
    url.searchParams.set("neighborhood", query.neighborhood);
  }

  if (query.sort_by) {
    url.searchParams.set("sort_by", query.sort_by);
  }

  if (query.user_lat !== undefined) {
    url.searchParams.set("user_lat", String(query.user_lat));
  }

  if (query.user_lon !== undefined) {
    url.searchParams.set("user_lon", String(query.user_lon));
  }

  if (query.limit !== undefined) {
    url.searchParams.set("limit", String(query.limit));
  }

  if (query.offset !== undefined) {
    url.searchParams.set("offset", String(query.offset));
  }

  return url.pathname + url.search;
}

export async function fetchCenters(
  query: ListCentersQuery,
  signal?: AbortSignal,
): Promise<ListCentersResponse> {
  const response = await fetch(buildListCentersUrl(query), { signal });

  if (!response.ok) {
    throw new Error(`centers_list_${response.status}`);
  }

  return readSanitizedJson<ListCentersResponse>(response);
}

export async function fetchCenterDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<GetCenterDetailResponse> {
  const url = new URL(`/api/centers/${encodeURIComponent(slug)}`, window.location.origin);

  const response = await fetch(url.pathname + url.search, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`center_detail_${response.status}`);
  }

  return readSanitizedJson<GetCenterDetailResponse>(response);
}

export async function fetchCenterMobility(
  slug: string,
  options?: {
    userLat?: number;
    userLon?: number;
  },
  signal?: AbortSignal,
): Promise<GetCenterMobilityResponsePayload> {
  const url = new URL(
    `/api/centers/${encodeURIComponent(slug)}/mobility`,
    window.location.origin,
  );

  if (options?.userLat !== undefined && options.userLon !== undefined) {
    url.searchParams.set("user_lat", String(options.userLat));
    url.searchParams.set("user_lon", String(options.userLon));
  }

  const response = await fetch(url.pathname + url.search, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`center_mobility_${response.status}`);
  }

  return readSanitizedJson<GetCenterMobilityResponsePayload>(response);
}

export async function fetchGeocodeOptions(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeSearchResponse> {
  const url = new URL("/api/geocode", window.location.origin);
  url.searchParams.set("q", query);

  const response = await fetch(url.pathname + url.search, { signal });

  if (!response.ok) {
    throw new Error(`geocode_${response.status}`);
  }

  return readSanitizedJson<GeocodeSearchResponse>(response);
}

export async function fetchOriginPresets(
  signal?: AbortSignal,
): Promise<GetOriginPresetsResponse> {
  const response = await fetch("/api/origin/presets", { signal });

  if (!response.ok) {
    throw new Error(`origin_presets_${response.status}`);
  }

  return readSanitizedJson<GetOriginPresetsResponse>(response);
}
