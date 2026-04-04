import type { GeocodeAddressOption, GeocodeSearchResponse } from "@alabiblio/contracts/origin";
import type { WorkerEnv } from "../lib/db";

const PUBLIC_CACHE_TTL_SECONDS = 60 * 60;
const SEARCH_LIMIT = 6;

// Madrid bounding box (WGS84) — restricts Nominatim results to Madrid area
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

function buildPublicReadHeaders(): HeadersInit {
  return {
    "cache-control": `public, max-age=${PUBLIC_CACHE_TTL_SECONDS}, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_TTL_SECONDS * 2}`,
  };
}

function buildNoStoreHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
  };
}

function normalizeQuery(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed === "") throw new Error("invalid_query_empty");
  if (trimmed.length < 3 || trimmed.length > 120) throw new Error("invalid_query_length");
  return trimmed;
}

function mapNominatimToOption(result: NominatimResult): GeocodeAddressOption | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const road = result.address?.road ?? null;
  const houseNumber = result.address?.house_number ?? null;
  const addressLine =
    road !== null
      ? [road, houseNumber].filter((v): v is string => v !== null).join(", ")
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
  if (row.lat === null || row.lon === null) return null;

  const label = [row.via_type, row.via_name].filter(Boolean).join(" ");
  const numInfo =
    row.num_from !== null
      ? ` (${row.num_from}${row.num_to && row.num_to !== row.num_from ? "–" + String(row.num_to) : ""})`
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

// ── Single-token search: tiered LIKE with explicit prefix ranking ─────────────
// Tier 1: via_name starts with the token → "Juan Bravo", "Juan de Austria"
// Tier 2: full_via contains the token elsewhere → "San Juan", "Plaza San Juan"
// Results ordered by tier then by name length (shorter = more specific match)
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
           AND (num_to   IS NULL OR num_to   >= ?)
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
    const stmt =
      numberHint !== null
        ? db.prepare(sql).bind(contains, numberHint, numberHint, prefix)
        : db.prepare(sql).bind(contains, prefix);
    const result = await stmt.all<CallejeroRow>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

// ── Multi-token search: FTS5 for efficient multi-word matching ────────────────
// FTS is well-suited here since we need all tokens to appear in the field.
// BM25 rank is acceptable for multi-word (less ambiguous than single tokens).
async function searchMultiToken(
  db: D1Database,
  tokens: string[],
  numberHint: number | null,
): Promise<CallejeroRow[]> {
  const matchExpr = tokens.map((t) => `"${t.replace(/"/g, "")}"*`).join(" ");

  const sql =
    numberHint !== null
      ? `SELECT ms.id, ms.full_via, ms.via_type, ms.via_name, ms.num_from, ms.num_to, ms.district, ms.neighborhood, ms.lat, ms.lon
         FROM madrid_streets_fts
         JOIN madrid_streets ms ON ms.id = madrid_streets_fts.rowid
         WHERE madrid_streets_fts MATCH ?
           AND (ms.num_from IS NULL OR ms.num_from <= ?)
           AND (ms.num_to   IS NULL OR ms.num_to   >= ?)
         ORDER BY madrid_streets_fts.rank
         LIMIT ${SEARCH_LIMIT}`
      : `SELECT ms.id, ms.full_via, ms.via_type, ms.via_name, ms.num_from, ms.num_to, ms.district, ms.neighborhood, ms.lat, ms.lon
         FROM madrid_streets_fts
         JOIN madrid_streets ms ON ms.id = madrid_streets_fts.rowid
         WHERE madrid_streets_fts MATCH ?
         ORDER BY madrid_streets_fts.rank
         LIMIT ${SEARCH_LIMIT}`;

  try {
    const stmt =
      numberHint !== null
        ? db.prepare(sql).bind(matchExpr, numberHint, numberHint)
        : db.prepare(sql).bind(matchExpr);
    const result = await stmt.all<CallejeroRow>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

// ── Main callejero dispatcher ─────────────────────────────────────────────────
async function searchCallejero(
  db: D1Database,
  rawQuery: string,
): Promise<GeocodeAddressOption[]> {
  const normalized = rawQuery.trim().toUpperCase();
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return [];

  // Extract optional trailing house number (e.g. "Gran Via 14")
  const lastToken = tokens[tokens.length - 1];
  const hasNumber = /^\d+$/.test(lastToken ?? "");
  const numberHint = hasNumber ? Number(lastToken) : null;
  const searchTokens = hasNumber ? tokens.slice(0, -1) : tokens;
  if (searchTokens.length === 0) return [];

  const rows =
    searchTokens.length === 1
      ? await searchSingleToken(db, searchTokens[0]!, numberHint)
      : await searchMultiToken(db, searchTokens, numberHint);

  // Deduplicate: keep only the best-ranked result per street (same via_name + district)
  const seenVia = new Set<string>();
  return rows
    .map(mapCallejeroToOption)
    .filter((item): item is GeocodeAddressOption => {
      if (item === null) return false;
      const viaKey = `${(item.address_line ?? item.label)
        .replace(/\s*\([\d–-].*?\)$/, "")
        .trim()
        .toUpperCase()}:${item.district ?? ""}`;
      if (seenVia.has(viaKey)) return false;
      seenVia.add(viaKey);
      return true;
    });
}

// ── Nominatim fallback guard ──────────────────────────────────────────────────
// Nominatim is for complete address lookups, not partial name fragments.
// Calling it with "JUAN" returns irrelevant results. Only use it when the
// query looks like a complete or near-complete address.
function shouldTryNominatim(query: string): boolean {
  const q = query.trim();
  // Contains a digit → likely includes a house number → complete-ish address
  if (/\d/.test(q)) return true;
  // Contains a Spanish street type keyword → user is typing a full address
  if (/\b(calle|plaza|avenida|avda|paseo|pso|carretera|ctra|ronda|glorieta|travesia|camino)\b/i.test(q)) return true;
  // Long enough to be unambiguous (8+ chars)
  if (q.length >= 8) return true;
  return false;
}

// ── Nominatim fallback ────────────────────────────────────────────────────────
async function searchNominatim(query: string): Promise<GeocodeAddressOption[]> {
  const q = /madrid/i.test(query) ? query : `${query}, Madrid, Espana`;

  const upstreamUrl = new URL("https://nominatim.openstreetmap.org/search");
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("limit", String(SEARCH_LIMIT));
  upstreamUrl.searchParams.set("countrycodes", "es");
  upstreamUrl.searchParams.set("viewbox", MADRID_VIEWBOX);
  upstreamUrl.searchParams.set("bounded", "1");
  upstreamUrl.searchParams.set("q", q);

  const response = await fetch(upstreamUrl, {
    headers: {
      "accept-language": "es",
      "user-agent": "alabiblio/0.1 (+https://alabiblio.org)",
    },
  });

  if (!response.ok) throw new Error(`nominatim_${response.status}`);

  const raw = (await response.json()) as NominatimResult[];
  return raw
    .map(mapNominatimToOption)
    .filter((item): item is GeocodeAddressOption => item !== null);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function handleGeocodeSearch(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q");

    if (rawQuery === null) throw new Error("invalid_query_missing");

    const normalizedQuery = normalizeQuery(rawQuery);

    // 1. Try local callejero (fast, Madrid-specific, properly ranked)
    const callejeroResults = await searchCallejero(env.DB, normalizedQuery);
    if (callejeroResults.length > 0) {
      const payload: GeocodeSearchResponse = { items: callejeroResults };
      return Response.json(payload, { headers: buildPublicReadHeaders() });
    }

    // 2. Nominatim fallback — only for complete-looking queries.
    //    Partial fragments like "JUAN" would return garbage from Nominatim.
    if (shouldTryNominatim(normalizedQuery)) {
      const nominatimResults = await searchNominatim(normalizedQuery);
      const payload: GeocodeSearchResponse = { items: nominatimResults };
      return Response.json(payload, { headers: buildPublicReadHeaders() });
    }

    // 3. No results — return empty rather than noise
    return Response.json({ items: [] } satisfies GeocodeSearchResponse, {
      headers: buildPublicReadHeaders(),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("invalid_query")) {
      return Response.json(
        { error: "Invalid query", detail: error.message },
        { status: 400, headers: buildNoStoreHeaders() },
      );
    }

    return Response.json(
      { error: "Geocoding failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 502, headers: buildNoStoreHeaders() },
    );
  }
}
