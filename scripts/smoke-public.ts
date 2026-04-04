import assert from "node:assert/strict";

type HealthResponse = {
  ok: boolean;
  env: string;
  timestamp: string;
};

type CentersListResponse = {
  items: Array<{
    slug: string;
    decision: {
      summary_label: string | null;
      confidence: "high" | "medium" | "low";
    };
    mobility_highlights: {
      primary: {
        mode: "walk" | "car" | "bus" | "bike" | "metro";
        label: string;
      } | null;
      secondary: {
        mode: "walk" | "car" | "bus" | "bike" | "metro";
        label: string;
      } | null;
    };
    services: {
      wifi: boolean;
      accessible: boolean;
    };
  }>;
  total: number;
  limit: number;
  offset: number;
};

type CenterDetailResponse = {
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
  item: {
    origin: {
      available: boolean;
    };
    summary: {
      best_mode: "walk" | "car" | "bus" | "bike" | "metro" | null;
      confidence: "high" | "medium" | "low";
    };
    modules: {
      car: {
        state: string;
        eta_min: number | null;
      };
      bus: {
        state: string;
        selected_line: string | null;
        next_arrival_min: number | null;
      };
      bike: {
        state: string;
        bikes_available: number | null;
        docks_available: number | null;
      };
      metro: {
        state: string;
        eta_min: number | null;
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  assert.equal(response.ok, true, `Request failed: ${url} -> ${response.status}`);
  assert.match(
    response.headers.get("content-type") ?? "",
    /application\/json/i,
    `Expected JSON content-type for ${url}`,
  );

  return (await response.json()) as T;
}

async function main() {
  const baseUrl = process.argv[2];

  assert.ok(baseUrl, "Usage: tsx scripts/smoke-public.ts <baseUrl>");

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const health = await fetchJson<HealthResponse>(`${normalizedBaseUrl}/api/health`);
  assert.equal(health.ok, true, "Health endpoint must return ok=true");

  const presets = await fetchJson<OriginPresetsResponse>(`${normalizedBaseUrl}/api/origin/presets`);
  assert.ok(presets.items.length >= 5, "Origin presets must return at least five areas");

  const geocode = await fetchJson<GeocodeResponse>(
    `${normalizedBaseUrl}/api/geocode?q=Gran%20Via%2032`,
  );
  assert.ok(geocode.items.length > 0, "Geocode endpoint must return at least one address");

  const firstPreset = presets.items[0];
  assert.ok(firstPreset, "A preset origin is required for mobility smoke");

  const list = await fetchJson<CentersListResponse>(
    `${normalizedBaseUrl}/api/centers?limit=1&sort_by=recommended&user_lat=${firstPreset.lat}&user_lon=${firstPreset.lon}`,
  );
  assert.ok(list.total > 0, "Centers list must return at least one item");
  assert.ok(list.items.length > 0, "Centers list must include one item");
  assert.equal(typeof list.items[0]?.services.wifi, "boolean", "Centers list must expose compact services");
  assert.ok(
    list.items[0]?.mobility_highlights.primary === null ||
      typeof list.items[0]?.mobility_highlights.primary.label === "string",
    "Centers list must expose mobility highlights",
  );

  const slug = list.items[0]?.slug;
  assert.ok(slug, "First center slug is required");

  const detail = await fetchJson<CenterDetailResponse>(
    `${normalizedBaseUrl}/api/centers/${encodeURIComponent(slug)}`,
  );
  assert.equal(detail.item.slug, slug, "Center detail must match list slug");
  assert.equal(typeof detail.item.ser.enabled, "boolean", "Center detail must expose SER coverage");
  assert.ok(
    Array.isArray(detail.item.static_transport.emt_destination_stops),
    "Center detail must expose static transport anchors",
  );

  const mobility = await fetchJson<CenterMobilityResponse>(
    `${normalizedBaseUrl}/api/centers/${encodeURIComponent(slug)}/mobility?user_lat=${firstPreset.lat}&user_lon=${firstPreset.lon}`,
  );
  assert.ok(mobility.item.summary.confidence, "Mobility summary must expose confidence");
  assert.ok(
    typeof mobility.item.modules.bus.state === "string",
    "Mobility payload must include V1 bus module",
  );
  assert.ok(
    Array.isArray(mobility.item.degraded_modes),
    "Mobility payload must include degraded modes array",
  );
  assert.ok(
    mobility.item.highlights.primary === null || typeof mobility.item.highlights.primary.label === "string",
    "Mobility payload must include V1 highlights",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl: normalizedBaseUrl,
        checked: [
          "/api/health",
          "/api/origin/presets",
          "/api/geocode?q=Gran Via 32",
          "/api/centers?limit=1&sort_by=recommended&user_lat=...&user_lon=...",
          `/api/centers/${slug}`,
          `/api/centers/${slug}/mobility?user_lat=...&user_lon=...`,
        ],
      },
      null,
      2,
    ),
  );
}

void main();
