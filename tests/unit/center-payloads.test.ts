import assert from "node:assert/strict";
import test from "node:test";
import {
  toCenterDetailDecisionItem,
  toCenterListBaseItem,
  toCenterTopMobilityCardItem,
} from "../../packages/domain/src/centers";
import {
  buildCenterDetailResponsePayload,
  buildCenterMobilityResponsePayload,
  buildListCentersResponsePayload,
  buildTopMobilityCentersResponsePayload,
} from "../../apps/web/worker/lib/centerPayloads";
import type { CenterRecord, CenterSchedulePayload, CenterSerInfo } from "../../packages/contracts/src/centers";
import type { CenterMobility } from "../../packages/contracts/src/mobility";

const center: CenterRecord = {
  id: "center_1",
  slug: "biblioteca-centro",
  kind: "library",
  name: "Biblioteca Centro",
  district: "Centro",
  neighborhood: "Sol",
  address_line: "Calle Mayor 1",
  postal_code: "28013",
  municipality: "Madrid",
  phone: "910000000",
  email: "centro@example.org",
  website_url: "https://example.org",
  raw_lat: 40.4168,
  raw_lon: -3.7038,
  lat: 40.4168,
  lon: -3.7038,
  coord_status: "provided",
  coord_resolution_method: "source",
  capacity_value: 120,
  capacity_text: "120 plazas",
  wifi_flag: true,
  sockets_flag: true,
  accessibility_flag: true,
  open_air_flag: false,
  notes_raw: null,
  is_active: true,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const schedule: CenterSchedulePayload = {
  is_open_now: true,
  next_change_at: "2026-04-08T20:00:00.000Z",
  today_human_schedule: "09:00-20:00",
  schedule_confidence: 0.9,
  schedule_confidence_label: "high",
  opens_today: "09:00",
  closes_today: "20:00",
  raw_schedule_text: "L-V 09:00-20:00",
  notes_raw: null,
  regular_rules: [],
  holiday_closures: [],
  partial_day_overrides: [],
  warnings: [],
  source_last_updated: "2026-04-07T10:00:00.000Z",
  data_freshness: "2026-04-07T10:00:00.000Z",
};

const ser: CenterSerInfo = {
  enabled: true,
  zone_name: "Centro",
  coverage_method: "distance",
  distance_m: 45,
};

const mobility: CenterMobility = {
  origin: {
    available: true,
    kind: "manual_address",
    label: "Origen activo",
    lat: 40.41,
    lon: -3.70,
  },
  origin_dependent: {
    origin_coordinates: { lat: 40.41, lon: -3.70 },
    origin_emt_stops: [],
    origin_metro_station: null,
    origin_bicimad_station: null,
    estimated_car_eta_min: 11,
    walking_eta_min: 18,
  },
  realtime: {
    emt_next_arrivals: [],
    emt_realtime_status: "empty",
    emt_realtime_fetched_at: null,
    bicimad_bikes_available: null,
    bicimad_docks_available: null,
    bicimad_realtime_status: "empty",
    bicimad_realtime_fetched_at: null,
    metro_realtime_status: "unavailable",
  },
  summary: {
    best_mode: "bus",
    best_time_minutes: 14,
    confidence: "medium",
    rationale: ["Centro abierto ahora", "EMT con llegada proxima"],
  },
  highlights: {
    primary: { mode: "bus", label: "Bus 14 min", confidence: "medium" },
    secondary: null,
  },
  modules: {
    car: {
      state: "ok",
      eta_min: 11,
      ser_enabled: true,
      ser_zone_name: "Centro",
      distance_m: 1800,
    },
    bus: {
      state: "ok",
      selected_line: "3",
      selected_destination: "Puerta Toledo",
      origin_stop: null,
      destination_stop: null,
      next_arrival_min: 5,
      estimated_travel_min: 9,
      estimated_total_min: 14,
      realtime_status: "available",
      fetched_at: "2026-04-08T10:00:00.000Z",
    },
    bike: {
      state: "unavailable",
      eta_min: null,
      origin_station: null,
      destination_station: null,
      bikes_available: null,
      docks_available: null,
      realtime_status: "unavailable",
      fetched_at: null,
    },
    metro: {
      state: "partial",
      eta_min: 17,
      origin_station: null,
      destination_station: null,
      line_labels: [],
      realtime_status: "unavailable",
    },
  },
  degraded_modes: ["bike"],
  fetched_at: "2026-04-08T10:00:00.000Z",
};

test("GET /api/centers serializa scope base sin campos enriquecidos", () => {
  const item = toCenterListBaseItem({
    center,
    schedule,
    ser: { enabled: ser.enabled, zone_name: ser.zone_name },
  });
  const payload = buildListCentersResponsePayload({
    items: [item],
    total: 1,
    open_count: 1,
    limit: 18,
    offset: 0,
    next_offset: null,
  });

  assert.equal(payload.meta.scope, "base_exploration");
  assert.equal(payload.meta.endpoint, "list_centers");
  assert.equal("decision" in payload.items[0]!, false);
  assert.equal("mobility_highlights" in payload.items[0]!, false);
});

test("GET /api/centers/top-mobility serializa scope enriquecido sin leaking de shape base antigua", () => {
  const topCenter = toCenterTopMobilityCardItem({
    center,
    schedule,
    ser: { enabled: ser.enabled, zone_name: ser.zone_name },
    decision: {
      best_mode: "bus",
      best_time_minutes: 14,
      distance_m: 1800,
      confidence: "medium",
      rationale: ["Centro abierto ahora", "EMT con llegada proxima"],
      summary_label: "Bus 14 min",
    },
  });
  const payload = buildTopMobilityCentersResponsePayload({
    items: [{ slug: center.slug, rank: 1, center: topCenter, item: mobility }],
    open_count: 1,
  });

  assert.equal(payload.meta.scope, "origin_enriched");
  assert.equal(payload.meta.endpoint, "top_mobility_centers");
  assert.equal(payload.items[0]?.center.decision.best_mode, "bus");
  assert.equal("services" in (payload.items[0]?.center ?? {}), false);
  assert.equal("mobility_highlights" in (payload.items[0]?.center ?? {}), false);
});

test("el mismo centro cambia de scope sin mezclar semantica entre listado y top", () => {
  const listItem = toCenterListBaseItem({
    center,
    schedule,
    ser: { enabled: ser.enabled, zone_name: ser.zone_name },
  });
  const topCenter = toCenterTopMobilityCardItem({
    center,
    schedule,
    ser: { enabled: ser.enabled, zone_name: ser.zone_name },
    decision: {
      best_mode: "bus",
      best_time_minutes: 14,
      distance_m: 1800,
      confidence: "medium",
      rationale: ["Centro abierto ahora", "EMT con llegada proxima"],
      summary_label: "Bus 14 min",
    },
  });

  assert.equal(listItem.slug, topCenter.slug);
  assert.equal(listItem.name, topCenter.name);
  assert.equal("decision" in listItem, false);
  assert.equal(topCenter.decision.summary_label, "Bus 14 min");
});

test("GET /api/centers/:slug y /mobility separan base y enriquecido para el mismo centro", () => {
  const detailPayload = buildCenterDetailResponsePayload(
    toCenterDetailDecisionItem({
      center,
      schedule,
      sources: [{ code: "libraries", name: "Libraries", external_id: "123" }],
      sourceLastUpdated: "2026-04-07T10:00:00.000Z",
      ser,
      staticTransport: {
        emt_destination_stops: [],
        metro_destination_stations: [],
        bicimad_destination_station: null,
        parking_candidates: [],
      },
      features: [],
    }),
  );
  const mobilityPayload = buildCenterMobilityResponsePayload(mobility);

  assert.equal(detailPayload.meta.scope, "base_exploration");
  assert.equal(mobilityPayload.meta.scope, "origin_enriched");
  assert.equal(detailPayload.item.slug, center.slug);
  assert.equal(mobilityPayload.item.summary.best_mode, "bus");
  assert.equal("decision" in detailPayload.item, false);
});
