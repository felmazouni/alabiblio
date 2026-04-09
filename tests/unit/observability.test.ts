import assert from "node:assert/strict";
import test from "node:test";
import type { CenterMobility } from "../../packages/contracts/src/mobility";
import {
  buildMobilityUpstreamStatus,
  classifyDataStateFromDataVersion,
  classifyMobilityDataState,
  createApiJsonResponse,
  createApiRequestContext,
  logApiResponse,
} from "../../apps/web/worker/lib/observability";

function buildMobilityFixture(overrides: Partial<CenterMobility> = {}): CenterMobility {
  return {
    origin: {
      available: true,
      kind: "preset_area",
      label: "Origen activo",
      lat: 40.45,
      lon: -3.69,
    },
    origin_dependent: {
      origin_coordinates: { lat: 40.45, lon: -3.69 },
      origin_emt_stops: [],
      origin_metro_station: null,
      origin_bicimad_station: null,
      estimated_car_eta_min: 12,
      walking_eta_min: 9,
    },
    realtime: {
      emt_next_arrivals: [],
      emt_realtime_status: "unconfigured",
      emt_realtime_fetched_at: null,
      bicimad_bikes_available: null,
      bicimad_docks_available: null,
      bicimad_realtime_status: "unconfigured",
      bicimad_realtime_fetched_at: null,
      metro_realtime_status: "unconfigured",
    },
    summary: {
      best_mode: "car",
      best_time_minutes: 12,
      confidence: "medium",
      rationale: [],
    },
    highlights: {
      primary: null,
      secondary: null,
    },
    modules: {
      car: {
        state: "ok",
        eta_min: 12,
        ser_enabled: false,
        ser_zone_name: null,
        distance_m: null,
      },
      bus: {
        state: "unavailable",
        selected_line: null,
        selected_destination: null,
        origin_stop: null,
        destination_stop: null,
        next_arrival_min: null,
        estimated_travel_min: null,
        estimated_total_min: null,
        realtime_status: "unconfigured",
        fetched_at: null,
      },
      bike: {
        state: "unavailable",
        eta_min: null,
        origin_station: null,
        destination_station: null,
        bikes_available: null,
        docks_available: null,
        realtime_status: "unconfigured",
        fetched_at: null,
      },
      metro: {
        state: "unavailable",
        eta_min: null,
        origin_station: null,
        destination_station: null,
        line_labels: [],
        realtime_status: "unconfigured",
      },
    },
    degraded_modes: [],
    fetched_at: "2026-04-08T10:00:00.000Z",
    ...overrides,
  };
}

test("createApiJsonResponse anota headers operativos y meta observable", async () => {
  const request = new Request("https://example.test/api/centers");
  const requestContext = createApiRequestContext(request, "list_centers");

  const response = createApiJsonResponse(
    requestContext,
    {
      meta: {
        scope: "base_exploration",
        endpoint: "list_centers",
      },
      items: [],
    },
    {
      cacheStatus: "MISS",
      dataScope: "base_exploration",
      upstreamStatus: "none",
      dataState: "estimated",
      dataVersion: "2026-04-08T10:00:00.000Z",
    },
  );
  const payload = await response.json() as {
    meta: {
      data_state?: string;
      upstream_status?: string;
    };
  };

  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(response.headers.get("x-cache-status"), "MISS");
  assert.equal(response.headers.get("x-data-scope"), "base_exploration");
  assert.equal(response.headers.get("x-upstream-status"), "none");
  assert.equal(response.headers.get("x-data-state"), "estimated");
  assert.equal(payload.meta.data_state, "estimated");
  assert.equal(payload.meta.upstream_status, "none");
});

test("classifyMobilityDataState y buildMobilityUpstreamStatus distinguen realtime y fallback", () => {
  const realtimeMobility = buildMobilityFixture({
    realtime: {
      emt_next_arrivals: [],
      emt_realtime_status: "available",
      emt_realtime_fetched_at: "2026-04-08T10:00:00.000Z",
      bicimad_bikes_available: null,
      bicimad_docks_available: null,
      bicimad_realtime_status: "unconfigured",
      bicimad_realtime_fetched_at: null,
      metro_realtime_status: "unconfigured",
    },
  });
  const fallbackMobility = buildMobilityFixture({
    origin: {
      available: false,
      kind: null,
      label: null,
      lat: null,
      lon: null,
    },
    summary: {
      best_mode: "walk",
      best_time_minutes: 6,
      confidence: "low",
      rationale: ["Fallback andando"],
    },
  });

  assert.equal(
    classifyMobilityDataState(realtimeMobility, "2026-04-08T10:00:00.000Z"),
    "realtime",
  );
  assert.equal(
    classifyMobilityDataState(fallbackMobility, "2026-04-08T10:00:00.000Z"),
    "fallback",
  );
  assert.equal(
    classifyDataStateFromDataVersion("2020-01-01T00:00:00.000Z", "estimated"),
    "stale",
  );
  assert.equal(
    buildMobilityUpstreamStatus(realtimeMobility),
    "emt:available;bicimad:unconfigured;metro:unconfigured",
  );
});

test("logApiResponse emite JSON estructurado con request_id y cache_status", () => {
  const request = new Request("https://example.test/api/health");
  const requestContext = createApiRequestContext(request, "health");
  const response = createApiJsonResponse(
    requestContext,
    { ok: true },
    {
      cacheStatus: "BYPASS",
      dataScope: "not_applicable",
      upstreamStatus: "none",
      dataState: "estimated",
    },
  );
  const originalConsoleLog = console.log;
  let captured = "";

  console.log = (message?: unknown) => {
    captured = String(message ?? "");
  };

  try {
    logApiResponse(requestContext, response);
  } finally {
    console.log = originalConsoleLog;
  }

  const payload = JSON.parse(captured) as {
    request_id: string;
    route: string;
    cache_status: string;
    upstream_status: string;
    duration_ms: number;
    text_suspect: boolean;
  };

  assert.match(payload.request_id, /^[0-9a-f-]{36}$/i);
  assert.equal(payload.route, "health");
  assert.equal(payload.cache_status, "BYPASS");
  assert.equal(payload.upstream_status, "none");
  assert.equal(payload.text_suspect, false);
  assert.equal(typeof payload.duration_ms, "number");
});

test("createApiJsonResponse marca text_suspect y loguea hallazgos estructurados", async () => {
  const request = new Request("https://example.test/api/centers");
  const requestContext = createApiRequestContext(request, "list_centers");
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  const warnings: string[] = [];
  let logLine = "";

  console.warn = (message?: unknown) => {
    warnings.push(String(message ?? ""));
  };
  console.log = (message?: unknown) => {
    logLine = String(message ?? "");
  };

  try {
    const response = createApiJsonResponse(
      requestContext,
      {
        meta: {
          scope: "base_exploration",
          endpoint: "list_centers",
        },
        items: [{ name: "Malasa\u00c3\u00b1a" }],
      },
      {
        cacheStatus: "BYPASS",
        dataScope: "base_exploration",
        upstreamStatus: "none",
        dataState: "estimated",
      },
    );

    await response.text();
    logApiResponse(requestContext, response);
  } finally {
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  }

  assert.equal(warnings.length, 1);

  const warningPayload = JSON.parse(warnings[0] ?? "{}") as {
    source: string;
    field: string;
    raw_snippet: string;
    text_suspect: boolean;
  };
  const logPayload = JSON.parse(logLine) as {
    text_suspect: boolean;
  };

  assert.equal(warningPayload.source, "response_body");
  assert.equal(warningPayload.field, "items[0].name");
  assert.equal(warningPayload.raw_snippet, "Malasa\u00c3\u00b1a");
  assert.equal(warningPayload.text_suspect, true);
  assert.equal(logPayload.text_suspect, true);
});
