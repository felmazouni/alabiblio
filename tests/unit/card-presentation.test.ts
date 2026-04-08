import assert from "node:assert/strict";
import test from "node:test";
import type { CenterListBaseItemV1 } from "../../packages/contracts/src/centers";
import type {
  CenterMobility,
  CenterTopMobilityCardV1,
} from "../../packages/contracts/src/mobility";
import {
  buildBaseCardPresentation,
  buildTopMobilityCardPresentation,
} from "../../apps/web/src/features/centers/cardPresentation";

function createBaseCenter(
  overrides?: Partial<CenterListBaseItemV1>,
): CenterListBaseItemV1 {
  return {
    id: "center_1",
    slug: "biblioteca-centro",
    kind: "library",
    kind_label: "Biblioteca",
    name: "Biblioteca Centro",
    district: "Centro",
    neighborhood: "Sol",
    address_line: "Calle Mayor 1",
    capacity_value: 120,
    ser: {
      enabled: true,
      zone_name: "Centro",
    },
    services: {
      wifi: true,
      sockets: true,
      accessible: true,
      open_air: false,
    },
    is_open_now: true,
    next_change_at: "2026-04-08T23:59:00",
    today_human_schedule: "00:00-23:59",
    schedule_confidence: 0.95,
    schedule_confidence_label: "high",
    opens_today: "00:00",
    closes_today: "23:59",
    ...overrides,
  };
}

function createTopCenter(
  overrides?: Partial<CenterTopMobilityCardV1>,
): CenterTopMobilityCardV1 {
  return {
    id: "center_1",
    slug: "biblioteca-centro",
    kind: "library",
    kind_label: "Biblioteca",
    name: "Biblioteca Centro",
    district: "Centro",
    neighborhood: "Sol",
    address_line: "Calle Mayor 1",
    is_open_now: true,
    opens_today: "00:00",
    closes_today: "23:59",
    today_human_schedule: "00:00-23:59",
    decision: {
      best_mode: "car",
      best_time_minutes: 9,
      distance_m: 3898.4,
      confidence: "medium",
      confidence_source: "heuristic",
      rationale: ["Centro abierto ahora", "Coche heuristico con contexto SER"],
      summary_label: "Coche 9 min",
    },
    ser: {
      enabled: true,
      zone_name: "Centro",
    },
    ...overrides,
  };
}

function createMobility(
  overrides?: Partial<CenterMobility>,
): CenterMobility {
  return {
    origin: {
      available: true,
      kind: null,
      label: "Origen activo",
      lat: 40.4502,
      lon: -3.6898,
    },
    origin_dependent: {
      origin_coordinates: { lat: 40.4502, lon: -3.6898 },
      origin_emt_stops: [],
      origin_metro_station: null,
      origin_bicimad_station: null,
      estimated_car_eta_min: 9,
      walking_eta_min: 47,
    },
    realtime: {
      emt_next_arrivals: [],
      emt_realtime_status: "unconfigured",
      emt_realtime_fetched_at: "2026-04-08T15:32:09.631Z",
      bicimad_bikes_available: null,
      bicimad_docks_available: null,
      bicimad_realtime_status: "unavailable",
      bicimad_realtime_fetched_at: null,
      metro_realtime_status: "unconfigured",
    },
    summary: {
      best_mode: "car",
      best_time_minutes: 9,
      confidence: "medium",
      confidence_source: "heuristic",
      rationale: ["Centro abierto ahora", "Coche heuristico con contexto SER"],
    },
    highlights: {
      primary: {
        mode: "car",
        label: "Coche 9 min - 3.9 km - SER Centro",
        confidence: "medium",
        confidence_source: "heuristic",
      },
      secondary: {
        mode: "metro",
        label: "Metro 17 min - estacion cercana",
        confidence: "medium",
        confidence_source: "frequency",
      },
    },
    modules: {
      car: {
        state: "ok",
        eta_min: 9,
        ser_enabled: true,
        ser_zone_name: "Centro",
        distance_m: 3898.4,
        confidence_source: "heuristic",
      },
      bus: {
        state: "partial",
        selected_line: "3",
        selected_destination: null,
        origin_stop: null,
        destination_stop: null,
        next_arrival_min: null,
        estimated_travel_min: 17,
        estimated_total_min: 28,
        realtime_status: "unconfigured",
        fetched_at: "2026-04-08T15:32:09.631Z",
        confidence_source: "estimated",
      },
      bike: {
        state: "partial",
        eta_min: 22,
        origin_station: null,
        destination_station: null,
        bikes_available: null,
        docks_available: null,
        realtime_status: "unavailable",
        fetched_at: null,
        confidence_source: "heuristic",
      },
      metro: {
        state: "ok",
        eta_min: 17,
        origin_station: null,
        destination_station: null,
        line_labels: ["L1", "L10"],
        realtime_status: "unconfigured",
        confidence_source: "frequency",
      },
    },
    degraded_modes: ["bus", "bike"],
    fetched_at: "2026-04-08T15:32:09.631Z",
    ...overrides,
  };
}

test("CenterCard usa solo copy de exploracion base y no vende recomendacion contextual", () => {
  const presentation = buildBaseCardPresentation(
    createBaseCenter(),
    "base_exploration",
  );
  const renderedCopy = [
    presentation.footerLabel,
    presentation.fallbackCopy,
    ...presentation.highlightRows.flatMap((row) => [row.label, row.body]),
  ].join(" ");

  assert.equal(presentation.footerLabel, "Exploracion base");
  assert.equal(presentation.fallbackCopy, "Exploracion base disponible");
  assert.doesNotMatch(renderedCopy, /mejor opcion|llegar ahora|origen|min en/i);
});

test("TopMobilityCard mantiene la capa enriquecida con scope y decision reales", () => {
  const presentation = buildTopMobilityCardPresentation({
    center: createTopCenter(),
    mobility: createMobility(),
    scope: "origin_enriched",
    serverOpenCount: 1,
  });

  assert.equal(presentation.scopeSignal, "ORIGEN");
  assert.equal(presentation.frame.eyebrow, "Referencia de llegada");
  assert.equal(presentation.frame.sectionTitle, "Llegada orientativa");
  assert.match(presentation.frame.sectionSummary, /9 min en coche/i);
  assert.equal(presentation.transportRows.length, 3);
  assert.ok(
    presentation.footerTiles.some((tile) => tile.label === "COCHE" && /3\.9 km/i.test(tile.body)),
  );
  assert.match(presentation.reason, /heuristica/i);
});
