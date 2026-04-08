import type { GeocodeAddressOption, GeocodeSearchResponse } from "@alabiblio/contracts/origin";
import type { WorkerEnv } from "../lib/db";
import type { ApiRequestContext } from "../lib/observability";
import {
  buildNoStoreHeaders,
  buildPublicCacheControl,
  createApiErrorResponse,
  createApiJsonResponse,
} from "../lib/observability";

const PUBLIC_CACHE_TTL_SECONDS = 60 * 60;
const SEARCH_LIMIT = 6;
const NOMINATIM_TIMEOUT_MS = 1800;
const MADRID_VIEWBOX = "-3.892,40.312,-3.527,40.644";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
};

type CallejeroRow = {
  id: number;
  full_via: string;
  via_type: string;
  via_name: string;
  num_from: number | null;
  num_to: number | null;
  district: string | null;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
};

function normalizeQuery(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed === "") {
    throw new Error("invalid_query_empty");
  }
  if (trimmed.length < 3 || trimmed.length > 120) {
    throw new Error("invalid_query_length");
  }
  return trimmed;
}

async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("nominatim_timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mapNominatimToOption(result: NominatimResult): GeocodeAddressOption | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const road = result.address?.road ?? null;
  const houseNumber = result.address?.house_number ?? null;
  const addressLine =
    road !== null
      ? [road, houseNumber].filter((value): value is string => value !== null).join(", ")
      : null;

  return {
    id: String(result.place_id),
    label: addressLine ?? result.display_name,
    display_name: result.display_name,
    address_line: addressLine,
    neighborhood: result.address?.neighbourhood ?? result.address?.suburb ?? null,
    district: result.address?.city_district ?? null,
    municipality:
      result.address?.city ?? result.address?.town ?? result.address?.village ?? "Madrid",
    postal_code: result.address?.postcode ?? null,
    lat,
    lon,
  };
}

function mapCallejeroToOption(row: CallejeroRow): GeocodeAddressOption | null {
  if (row.lat === null || row.lon === null) {
    return null;
  }

  const label = [row.via_type, row.via_name].filter(Boolean).join(" ");
  const numInfo =
    row.num_from !== null
      ? ` (${row.num_from}${row.num_to && row.num_to !== row.num_from ? "-" + String(row.num_to) : ""})`
      : "";

  return {
    id: `callejero:${row.id}`,
    label: `${label}${numInfo}`,
    display_name: `${label}${numInfo}${row.district ? ", " + row.district : ""}`,
    address_line: label + numInfo,
    neighborhood: row.neighborhood,
    district: row.district,
    municipality: "Madrid",
    postal_code: null,
    lat: row.lat,
    lon: row.lon,
  };
}

async function searchSingleToken(
  db: D1Database,
  token: string,
  numberHint: number | null,
): Promise<CallejeroRow[]> {
  const prefix = `${token}%`;
  const contains = `%${token}%`;
  const sql =
    numberHint !== null
      ? `SELECT id, full_via, via_type, via_name, num_from, num_to, district, neighborhood, lat, lon
         FROM madrid_streets
         WHERE lat IS NOT NULL
           AND upper(full_via) LIKE ?
           AND (num_from IS NULL OR num_from <= ?)
           AND (num_to IS NULL OR num_to >= ?)
         ORDER BY
           CASE WHEN upper(via_name) LIKE ? THEN 1 ELSE 2 END,
           length(via_name)
         LIMIT ${SEARCH_LIMIT}`
      : `SELECT id, full_via, via_type, via_name, num_from, num_to, district, neighborhood, lat, lon
         FROM madrid_streets
         WHERE lat IS NOT NULL
           AND upper(full_via) LIKE ?
         ORDER BY
           CASE WHEN upper(via_name) LIKE ? THEN 1 ELSE 2 END,
           length(via_name)
         LIMIT ${SEARCH_LIMIT}`;

  try {
    const statement =
      numberHint !== null
        ? db.prepare(sql).bind(contains, numberHint, numberHint, prefix)
        : db.prepare(sql).bind(contains, prefix);
    const result = await statement.all<CallejeroRow>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

async function searchMultiToken(
  db: D1Database,
  tokens: string[],
  numberHint: number | null,
): Promise<CallejeroRow[]> {
  const matchExpr = tokens.map((token) => `"${token.replace(/"/g, "")}"*`).join(" ");
  const sql =
    numberHint !== null
      ? `SELECT ms.id, ms.full_via, ms.via_type, ms.via_name, ms.num_from, ms.num_to, ms.district, ms.neighborhood, ms.lat, ms.lon
         FROM madrid_streets_fts
         JOIN madrid_streets ms ON ms.id = madrid_streets_fts.rowid
         WHERE madrid_streets_fts MATCH ?
           AND (ms.num_from IS NULL OR ms.num_from <= ?)
           AND (ms.num_to IS NULL OR ms.num_to >= ?)
         ORDER BY madrid_streets_fts.rank
         LIMIT ${SEARCH_LIMIT}`
      : `SELECT ms.id, ms.full_via, ms.via_type, ms.via_name, ms.num_from, ms.num_to, ms.district, ms.neighborhood, ms.lat, ms.lon
         FROM madrid_streets_fts
         JOIN madrid_streets ms ON ms.id = madrid_streets_fts.rowid
         WHERE madrid_streets_fts MATCH ?
         ORDER BY madrid_streets_fts.rank
         LIMIT ${SEARCH_LIMIT}`;

  try {
    const statement =
      numberHint !== null
        ? db.prepare(sql).bind(matchExpr, numberHint, numberHint)
        : db.prepare(sql).bind(matchExpr);
    const result = await statement.all<CallejeroRow>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

async function searchCallejero(
  db: D1Database,
  rawQuery: string,
): Promise<GeocodeAddressOption[]> {
  const normalized = rawQuery.trim().toUpperCase();
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 1);
  if (tokens.length === 0) {
    return [];
  }

  const lastToken = tokens[tokens.length - 1];
  const hasNumber = /^\d+$/.test(lastToken ?? "");
  const numberHint = hasNumber ? Number(lastToken) : null;
  const searchTokens = hasNumber ? tokens.slice(0, -1) : tokens;
  if (searchTokens.length === 0) {
    return [];
  }

  const rows =
    searchTokens.length === 1
      ? await searchSingleToken(db, searchTokens[0]!, numberHint)
      : await searchMultiToken(db, searchTokens, numberHint);

  const seenVia = new Set<string>();
  return rows
    .map(mapCallejeroToOption)
    .filter((item): item is GeocodeAddressOption => {
      if (item === null) {
        return false;
      }
      const viaKey = `${(item.address_line ?? item.label)
        .replace(/\s*\([\d-].*?\)$/, "")
        .trim()
        .toUpperCase()}:${item.district ?? ""}`;
      if (seenVia.has(viaKey)) {
        return false;
      }
      seenVia.add(viaKey);
      return true;
    });
}

function shouldTryNominatim(query: string): boolean {
  const trimmed = query.trim();
  if (/\d/.test(trimmed)) {
    return true;
  }
  if (/\b(calle|plaza|avenida|avda|paseo|pso|carretera|ctra|ronda|glorieta|travesia|camino)\b/i.test(trimmed)) {
    return true;
  }
  return trimmed.length >= 8;
}

async function searchNominatim(query: string): Promise<GeocodeAddressOption[]> {
  const normalizedQuery = /madrid/i.test(query) ? query : `${query}, Madrid, Espana`;
  const upstreamUrl = new URL("https://nominatim.openstreetmap.org/search");
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("limit", String(SEARCH_LIMIT));
  upstreamUrl.searchParams.set("countrycodes", "es");
  upstreamUrl.searchParams.set("viewbox", MADRID_VIEWBOX);
  upstreamUrl.searchParams.set("bounded", "1");
  upstreamUrl.searchParams.set("q", normalizedQuery);

  const response = await fetchWithTimeout(
    upstreamUrl,
    {
      headers: {
        "accept-language": "es",
        "user-agent": "alabiblio/0.1 (+https://alabiblio.org)",
      },
    },
    NOMINATIM_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`nominatim_${response.status}`);
  }

  const raw = (await response.json()) as NominatimResult[];
  return raw
    .map(mapNominatimToOption)
    .filter((item): item is GeocodeAddressOption => item !== null);
}

export async function handleGeocodeSearch(
  request: Request,
  env: WorkerEnv,
  requestContext: ApiRequestContext,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q");

    if (rawQuery === null) {
      throw new Error("invalid_query_missing");
    }

    const normalizedQuery = normalizeQuery(rawQuery);
    const callejeroResults = await searchCallejero(env.DB, normalizedQuery);

    if (callejeroResults.length > 0) {
      const payload: GeocodeSearchResponse = { items: callejeroResults };
      return createApiJsonResponse(requestContext, payload, {
        headers: buildPublicCacheControl(PUBLIC_CACHE_TTL_SECONDS),
        cacheStatus: "BYPASS",
        dataScope: "not_applicable",
        upstreamStatus: "callejero:hit;nominatim:skipped",
        dataState: "estimated",
      });
    }

    if (shouldTryNominatim(normalizedQuery)) {
      const nominatimResults = await searchNominatim(normalizedQuery);
      const payload: GeocodeSearchResponse = { items: nominatimResults };
      return createApiJsonResponse(requestContext, payload, {
        headers: buildPublicCacheControl(PUBLIC_CACHE_TTL_SECONDS),
        cacheStatus: "BYPASS",
        dataScope: "not_applicable",
        upstreamStatus: "callejero:empty;nominatim:ok",
        dataState: "realtime",
      });
    }

    return createApiJsonResponse(requestContext, { items: [] } satisfies GeocodeSearchResponse, {
      headers: buildPublicCacheControl(PUBLIC_CACHE_TTL_SECONDS),
      cacheStatus: "BYPASS",
      dataScope: "not_applicable",
      upstreamStatus: "callejero:empty;nominatim:skipped",
      dataState: "fallback",
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid_query")) {
      return createApiErrorResponse(requestContext, {
        status: 400,
        error: "Invalid query",
        detail: error.message,
        errorType: "validation_error",
        headers: buildNoStoreHeaders(),
        cacheStatus: "BYPASS",
        dataScope: "not_applicable",
        upstreamStatus: "none",
        dataState: "estimated",
      });
    }

    if (error instanceof Error && error.message === "nominatim_timeout") {
      return createApiErrorResponse(requestContext, {
        status: 504,
        error: "Geocoding upstream timeout",
        detail: error.message,
        errorType: "upstream_timeout",
        headers: buildNoStoreHeaders(),
        cacheStatus: "BYPASS",
        dataScope: "not_applicable",
        upstreamStatus: "callejero:empty;nominatim:timeout",
        dataState: "fallback",
      });
    }

    return createApiErrorResponse(requestContext, {
      status: 502,
      error: "Geocoding failed",
      detail: error instanceof Error ? error.message : "unknown",
      errorType: "upstream_error",
      headers: buildNoStoreHeaders(),
      cacheStatus: "BYPASS",
      dataScope: "not_applicable",
      upstreamStatus:
        error instanceof Error && error.message.startsWith("nominatim_")
          ? `callejero:empty;${error.message.replace("_", ":")}`
          : "callejero:error;nominatim:error",
      dataState: "fallback",
    });
  }
}
