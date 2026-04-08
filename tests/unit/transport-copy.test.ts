import assert from "node:assert/strict";
import test from "node:test";
import type { CenterListBaseItemV1 } from "../../packages/contracts/src/centers";
import type { CenterMobility } from "../../packages/contracts/src/mobility";
import {
  buildBusCopy,
  buildBaseExplorationHighlights,
  buildFeaturedTransportRows,
  buildHumanReason,
  buildModuleNote,
} from "../../apps/web/src/features/centers/transportCopy";

function createMobility(overrides?: Partial<CenterMobility>): CenterMobility {
  return {
    origin: {
      available: true,
      kind: "manual_address",
      label: "Chamartin",
      lat: 40.45,
      lon: -3.69,
    },
    origin_dependent: {
      origin_coordinates: {
        lat: 40.45,
        lon: -3.69,
      },
      origin_emt_stops: [],
      origin_metro_station: null,
      origin_bicimad_station: null,
      estimated_car_eta_min: 8,
      walking_eta_min: 21,
    },
    realtime: {
      emt_next_arrivals: [],
      emt_realtime_status: "available",
      emt_realtime_fetched_at: "2026-04-05T10:00:00.000Z",
      bicimad_bikes_available: 12,
      bicimad_docks_available: 16,
      bicimad_realtime_status: "available",
      bicimad_realtime_fetched_at: "2026-04-05T10:00:00.000Z",
      metro_realtime_status: "unavailable",
    },
    summary: {
      best_mode: "bus",
      best_time_minutes: 14,
      confidence: "high",
      rationale: ["EMT con llegada proxima"],
    },
    highlights: {
      primary: { mode: "bus", label: "Bus 5 - 4 min", confidence: "high" },
      secondary: { mode: "bike", label: "Bici 12 min - x15", confidence: "medium" },
    },
    modules: {
      car: {
        state: "ok",
        eta_min: 9,
        ser_enabled: true,
        ser_zone_name: "Verde",
        distance_m: 1800,
      },
      bus: {
        state: "ok",
        selected_line: "5",
        selected_destination: "Sol Sevilla",
        origin_stop: {
          id: "emt-origin",
          name: "Agustin de Foxa",
          distance_m: 120,
          lines: ["5"],
          lat: 40.45,
          lon: -3.69,
        },
        destination_stop: {
          id: "emt-dest",
          name: "Sol Sevilla",
          distance_m: 130,
          lines: ["5"],
          lat: 40.42,
          lon: -3.7,
        },
        next_arrival_min: 4,
        estimated_travel_min: 8,
        estimated_total_min: 12,
        realtime_status: "available",
        fetched_at: "2026-04-05T10:00:00.000Z",
      },
      bike: {
        state: "ok",
        eta_min: 12,
        origin_station: {
          id: "bike-origin",
          name: "Origen bici",
          distance_m: 90,
          station_number: "252",
          lat: 40.45,
          lon: -3.69,
          total_bases: 24,
        },
        destination_station: {
          id: "bike-dest",
          name: "Destino bici",
          distance_m: 110,
          station_number: "525",
          lat: 40.42,
          lon: -3.7,
          total_bases: 24,
        },
        bikes_available: 15,
        docks_available: 16,
        realtime_status: "available",
        fetched_at: "2026-04-05T10:00:00.000Z",
      },
      metro: {
        state: "ok",
        eta_min: 16,
        origin_station: {
          id: "metro-origin",
          name: "Chamartin",
          distance_m: 240,
          lines: ["L1", "L10"],
          lat: 40.47,
          lon: -3.68,
        },
        destination_station: {
          id: "metro-dest",
          name: "Valdeacederas",
          distance_m: 160,
          lines: ["L1"],
          lat: 40.46,
          lon: -3.7,
        },
        line_labels: ["L1", "L10"],
        realtime_status: "unavailable",
      },
    },
    degraded_modes: [],
    fetched_at: "2026-04-05T10:00:00.000Z",
    ...overrides,
  };
}

function createCenter(overrides?: Partial<CenterListBaseItemV1>): CenterListBaseItemV1 {
  return {
    id: "center-1",
    slug: "center-1",
    kind: "library",
    kind_label: "Biblioteca",
    name: "Biblioteca de prueba",
    district: "Centro",
    neighborhood: "Universidad",
    address_line: "Calle de prueba 1",
    capacity_value: 80,
    ser: {
      enabled: true,
      zone_name: "Verde",
    },
    services: {
      wifi: true,
      sockets: true,
      accessible: true,
      open_air: false,
    },
    is_open_now: true,
    next_change_at: null,
    today_human_schedule: "09:00-21:00",
    schedule_confidence: 0.9,
    schedule_confidence_label: "high",
    opens_today: "09:00",
    closes_today: "21:00",
    ...overrides,
  };
}

test("buildHumanReason reduce verbosidad y mantiene honestidad semantica", () => {
  assert.equal(buildHumanReason(null), "Actualizando la mejor llegada.");

  const bus = createMobility();
  assert.equal(buildHumanReason(bus), "EMT ofrece la mejor llegada util.");

  const carWithSer = createMobility({
    summary: {
      best_mode: "car",
      best_time_minutes: 9,
      confidence: "high",
      rationale: ["Coche con contexto SER"],
    },
  });
  assert.equal(buildHumanReason(carWithSer), "Coche es la llegada mas rapida con contexto SER.");
});

test("buildBaseExplorationHighlights usa solo senales honestas del scope base", () => {
  const center = createCenter();
  const highlights = buildBaseExplorationHighlights(center);

  assert.deepEqual(highlights, [
    { label: "SER", body: "Zona Verde" },
    { label: "AFORO", body: "80 plazas" },
  ]);
});

test("buildBaseExplorationHighlights explicita baja confianza horaria cuando aplica", () => {
  const center = createCenter({
    ser: null,
    capacity_value: null,
    schedule_confidence_label: "low",
  });

  assert.deepEqual(buildBaseExplorationHighlights(center), [
    { label: "HORARIO", body: "Horario con confirmacion baja" },
  ]);
});

test("buildBaseExplorationHighlights no inventa contexto enriquecido cuando no existe", () => {
  const center = createCenter({
    ser: null,
    capacity_value: null,
  });

  assert.deepEqual(buildBaseExplorationHighlights(center), []);
});

test("buildFeaturedTransportRows evita duplicar ETA en BiciMAD", () => {
  const rows = buildFeaturedTransportRows(createMobility());
  const bikeRow = rows.find((row) => row.mode === "bike");

  assert.ok(bikeRow);
  assert.equal(bikeRow?.headline, "Red BiciMAD");
  assert.equal(bikeRow?.eta, "12 min");
});

test("buildBusCopy usa una sintaxis compacta y no tecnica", () => {
  assert.equal(
    buildBusCopy(createMobility()),
    "L5 \u00b7 Sube en Agustin de Foxa \u00b7 Baja en Sol Sevilla \u00b7 Espera 4 min \u00b7 Viaje 8 min",
  );
});

test("buildModuleNote rebaja copy tecnica en estados degradados", () => {
  const base = createMobility();
  const mobility = createMobility({
    modules: {
      ...base.modules,
      bus: {
        ...base.modules.bus,
        state: "degraded_upstream",
        realtime_status: "unavailable",
      },
    },
  });

  assert.equal(buildModuleNote("bus", mobility), "EMT no respondio a tiempo; mostramos estimacion.");
});
