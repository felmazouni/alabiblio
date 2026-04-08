import assert from "node:assert/strict";

type ApiCacheStatus = "HIT" | "MISS" | "BYPASS";
type ApiDataScope = "base_exploration" | "origin_enriched" | "not_applicable";
type ApiDataState = "realtime" | "estimated" | "fallback" | "stale";

type HealthResponse = {
  ok: boolean;
  env: string;
  timestamp: string;
};

type CentersListResponse = {
  meta: {
    scope: "base_exploration";
    endpoint: "list_centers";
    data_state?: ApiDataState;
    upstream_status?: string;
  };
  items: Array<{
    slug: string;
    is_open_now: boolean | null;
    services: {
      wifi: boolean;
      accessible: boolean;
    };
  }>;
  total: number;
  limit: number;
  offset: number;
};

type TopMobilityResponse = {
  meta: {
    scope: "origin_enriched";
    endpoint: "top_mobility_centers";
    data_state?: ApiDataState;
    upstream_status?: string;
  };
  items: Array<{
    slug: string;
    center: {
      decision: {
        best_mode: string | null;
      };
    };
  }>;
};

type CenterDetailResponse = {
  meta: {
    scope: "base_exploration";
    endpoint: "center_detail";
    data_state?: ApiDataState;
    upstream_status?: string;
  };
  item: {
    slug: string;
    ser: {
      enabled: boolean;
      zone_name: string | null;
    };
    static_transport: {
      emt_destination_stops: Array<{
        id: string;
        name: string;
      }>;
      metro_destination_stations: Array<{
        id: string;
        name: string;
      }>;
      bicimad_destination_station: {
        id: string;
        name: string;
      } | null;
    };
    features: Array<{
      code: string;
      icon: string;
    }>;
  };
};

type CenterMobilityResponse = {
  meta: {
    scope: "origin_enriched";
    endpoint: "center_mobility";
    data_state?: ApiDataState;
    upstream_status?: string;
  };
  item: {
    origin: {
      available: boolean;
    };
    summary: {
      best_mode: "walk" | "car" | "bus" | "bike" | "metro" | null;
      confidence: "high" | "medium" | "low";
    };
    modules: {
      bus: {
        state: string;
      };
    };
    degraded_modes: Array<"car" | "bus" | "bike" | "metro">;
    highlights: {
      primary: {
        mode: "walk" | "car" | "bus" | "bike" | "metro";
        label: string;
      } | null;
    };
  };
};

type GeocodeResponse = {
  items: Array<{
    id: string;
    lat: number;
    lon: number;
  }>;
};

type OriginPresetsResponse = {
  items: Array<{
    code: string;
    label: string;
    lat: number;
    lon: number;
  }>;
};

type FetchResult<T> = {
  payload: T;
  headers: Headers;
  durationMs: number;
};

function assertOperationalHeaders(
  url: string,
  headers: Headers,
  expectedScope: ApiDataScope,
): void {
  assert.match(
    headers.get("x-request-id") ?? "",
    /^[0-9a-f-]{36}$/i,
    `Missing x-request-id for ${url}`,
  );
  assert.ok(
    ["HIT", "MISS", "BYPASS"].includes(headers.get("x-cache-status") ?? ""),
    `Invalid x-cache-status for ${url}`,
  );
  assert.equal(headers.get("x-data-scope"), expectedScope, `Unexpected x-data-scope for ${url}`);
  assert.ok(headers.get("x-upstream-status"), `Missing x-upstream-status for ${url}`);
  assert.ok(
    ["realtime", "estimated", "fallback", "stale"].includes(headers.get("x-data-state") ?? ""),
    `Invalid x-data-state for ${url}`,
  );
}

function assertDuration(url: string, durationMs: number, thresholdMs: number): void {
  assert.ok(
    durationMs <= thresholdMs,
    `Unexpected slow response for ${url}: ${durationMs}ms > ${thresholdMs}ms`,
  );
}

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  const startedAt = Date.now();
  const response = await fetch(url);
  const durationMs = Date.now() - startedAt;

  assert.equal(response.ok, true, `Request failed: ${url} -> ${response.status}`);
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/json/i,
    `Expected JSON content-type for ${url}`,
  );

  return {
    payload: (await response.json()) as T,
    headers: response.headers,
    durationMs,
  };
}

async function main() {
  const baseUrl = process.argv[2];
  assert.ok(baseUrl, "Usage: tsx scripts/smoke-public.ts <baseUrl>");

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  const health = await fetchJson<HealthResponse>(`${normalizedBaseUrl}/api/health`);
  assert.equal(health.payload.ok, true, "Health endpoint must return ok=true");
  assertOperationalHeaders("/api/health", health.headers, "not_applicable");
  assertDuration("/api/health", health.durationMs, 5000);

  const presets = await fetchJson<OriginPresetsResponse>(`${normalizedBaseUrl}/api/origin/presets`);
  assert.ok(presets.payload.items.length >= 5, "Origin presets must return at least five areas");
  assertOperationalHeaders("/api/origin/presets", presets.headers, "not_applicable");
  assertDuration("/api/origin/presets", presets.durationMs, 5000);

  const geocode = await fetchJson<GeocodeResponse>(
    `${normalizedBaseUrl}/api/geocode?q=Gran%20Via%2032`,
  );
  assert.ok(geocode.payload.items.length > 0, "Geocode endpoint must return at least one address");
  assertOperationalHeaders("/api/geocode", geocode.headers, "not_applicable");
  assertDuration("/api/geocode", geocode.durationMs, 8000);

  const firstPreset = presets.payload.items[0];
  assert.ok(firstPreset, "A preset origin is required for mobility smoke");

  const list = await fetchJson<CentersListResponse>(
    `${normalizedBaseUrl}/api/centers?limit=1&sort_by=open_now`,
  );
  assert.ok(list.payload.total > 0, "Centers list must return at least one item");
  assert.ok(list.payload.items.length > 0, "Centers list must include one item");
  assert.equal(list.payload.meta.scope, "base_exploration", "Centers list must expose base scope");
  assert.equal(typeof list.payload.items[0]?.services.wifi, "boolean", "Centers list must expose compact services");
  assert.equal(typeof list.payload.items[0]?.is_open_now, "boolean", "Centers list must expose open state");
  assertOperationalHeaders("/api/centers", list.headers, "base_exploration");
  assert.equal(list.headers.get("x-data-scope"), list.payload.meta.scope);
  assert.equal(list.headers.get("x-data-state"), list.payload.meta.data_state);
  assertDuration("/api/centers", list.durationMs, 8000);

  const slug = list.payload.items[0]?.slug;
  assert.ok(slug, "First center slug is required");

  const top = await fetchJson<TopMobilityResponse>(
    `${normalizedBaseUrl}/api/centers/top-mobility?user_lat=${firstPreset.lat}&user_lon=${firstPreset.lon}`,
  );
  assert.equal(top.payload.meta.scope, "origin_enriched", "Top mobility must expose enriched scope");
  assert.ok(top.payload.items.length > 0, "Top mobility must return ranked items");
  assert.ok(top.payload.items[0]?.center.decision.best_mode, "Top mobility must include decision");
  assertOperationalHeaders("/api/centers/top-mobility", top.headers, "origin_enriched");
  assert.equal(top.headers.get("x-data-scope"), top.payload.meta.scope);
  assert.equal(top.headers.get("x-data-state"), top.payload.meta.data_state);
  assertDuration("/api/centers/top-mobility", top.durationMs, 8000);

  const detail = await fetchJson<CenterDetailResponse>(
    `${normalizedBaseUrl}/api/centers/${encodeURIComponent(slug)}`,
  );
  assert.equal(detail.payload.meta.scope, "base_exploration", "Center detail must expose base scope");
  assert.equal(detail.payload.item.slug, slug, "Center detail must match list slug");
  assert.equal(typeof detail.payload.item.ser.enabled, "boolean", "Center detail must expose SER coverage");
  assert.ok(
    Array.isArray(detail.payload.item.static_transport.emt_destination_stops),
    "Center detail must expose static transport anchors",
  );
  assertOperationalHeaders(`/api/centers/${slug}`, detail.headers, "base_exploration");
  assert.equal(detail.headers.get("x-data-scope"), detail.payload.meta.scope);
  assert.equal(detail.headers.get("x-data-state"), detail.payload.meta.data_state);
  assertDuration(`/api/centers/${slug}`, detail.durationMs, 8000);

  const mobility = await fetchJson<CenterMobilityResponse>(
    `${normalizedBaseUrl}/api/centers/${encodeURIComponent(slug)}/mobility?user_lat=${firstPreset.lat}&user_lon=${firstPreset.lon}`,
  );
  assert.equal(mobility.payload.meta.scope, "origin_enriched", "Mobility endpoint must expose enriched scope");
  assert.ok(mobility.payload.item.summary.confidence, "Mobility summary must expose confidence");
  assert.ok(
    typeof mobility.payload.item.modules.bus.state === "string",
    "Mobility payload must include V1 bus module",
  );
  assert.ok(
    Array.isArray(mobility.payload.item.degraded_modes),
    "Mobility payload must include degraded modes array",
  );
  assert.ok(
    mobility.payload.item.highlights.primary === null ||
      typeof mobility.payload.item.highlights.primary.label === "string",
    "Mobility payload must include V1 highlights",
  );
  assertOperationalHeaders(`/api/centers/${slug}/mobility`, mobility.headers, "origin_enriched");
  assert.equal(mobility.headers.get("x-data-scope"), mobility.payload.meta.scope);
  assert.equal(mobility.headers.get("x-data-state"), mobility.payload.meta.data_state);
  assertDuration(`/api/centers/${slug}/mobility`, mobility.durationMs, 8000);

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl: normalizedBaseUrl,
        checked: [
          {
            route: "/api/health",
            duration_ms: health.durationMs,
            cache_status: health.headers.get("x-cache-status") as ApiCacheStatus,
          },
          {
            route: "/api/origin/presets",
            duration_ms: presets.durationMs,
            cache_status: presets.headers.get("x-cache-status") as ApiCacheStatus,
          },
          {
            route: "/api/geocode?q=Gran Via 32",
            duration_ms: geocode.durationMs,
            cache_status: geocode.headers.get("x-cache-status") as ApiCacheStatus,
          },
          {
            route: "/api/centers?limit=1&sort_by=open_now",
            duration_ms: list.durationMs,
            cache_status: list.headers.get("x-cache-status") as ApiCacheStatus,
            scope: list.headers.get("x-data-scope") as ApiDataScope,
          },
          {
            route: "/api/centers/top-mobility",
            duration_ms: top.durationMs,
            cache_status: top.headers.get("x-cache-status") as ApiCacheStatus,
            scope: top.headers.get("x-data-scope") as ApiDataScope,
          },
          {
            route: `/api/centers/${slug}`,
            duration_ms: detail.durationMs,
            cache_status: detail.headers.get("x-cache-status") as ApiCacheStatus,
            scope: detail.headers.get("x-data-scope") as ApiDataScope,
          },
          {
            route: `/api/centers/${slug}/mobility`,
            duration_ms: mobility.durationMs,
            cache_status: mobility.headers.get("x-cache-status") as ApiCacheStatus,
            scope: mobility.headers.get("x-data-scope") as ApiDataScope,
          },
        ],
      },
      null,
      2,
    ),
  );
}

void main();
