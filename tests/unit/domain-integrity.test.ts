import assert from "node:assert/strict";
import test from "node:test";
import type {
  CenterDecisionCardItem,
  CenterDecisionSummary,
  CenterScheduleSummary,
} from "../../packages/contracts/src/centers";
import {
  buildCenterMobility,
  buildDecisionSummary,
  sortCenterListItems,
} from "../../packages/domain/src/mobility";

const openSchedule: CenterScheduleSummary = {
  is_open_now: true,
  next_change_at: null,
  today_human_schedule: "09:00-21:00",
  schedule_confidence: 0.9,
  schedule_confidence_label: "high",
  opens_today: "09:00",
  closes_today: "21:00",
};

function buildRankableItem(
  id: string,
  isOpen: boolean,
  decision: CenterDecisionSummary,
): CenterDecisionCardItem {
  return {
    id,
    slug: id,
    kind: "library",
    kind_label: "Biblioteca",
    name: `Centro ${id}`,
    district: null,
    neighborhood: null,
    address_line: null,
    capacity_value: null,
    ser: null,
    services: {
      wifi: true,
      sockets: true,
      accessible: true,
      open_air: false,
    },
    is_open_now: isOpen,
    next_change_at: null,
    today_human_schedule: "09:00-21:00",
    schedule_confidence: 0.9,
    schedule_confidence_label: "high",
    opens_today: "09:00",
    closes_today: "21:00",
  };
}

test("recommended nunca coloca un centro cerrado por delante de uno abierto", () => {
  const sorted = sortCenterListItems(
    [
      {
        ...buildRankableItem("closed-fast", false, {
          best_mode: "car",
          best_time_minutes: 5,
          distance_m: 1200,
          confidence: "medium",
          confidence_source: "heuristic",
          rationale: [],
          summary_label: "Coche 5 min",
        }),
        decision: {
          best_mode: "car",
          best_time_minutes: 5,
          distance_m: 1200,
          confidence: "medium",
          confidence_source: "heuristic",
          rationale: [],
          summary_label: "Coche 5 min",
        },
      },
      {
        ...buildRankableItem("open-slower", true, {
          best_mode: "bus",
          best_time_minutes: 8,
          distance_m: 1400,
          confidence: "high",
          confidence_source: "realtime",
          rationale: [],
          summary_label: "Bus 8 min",
        }),
        decision: {
          best_mode: "bus",
          best_time_minutes: 8,
          distance_m: 1400,
          confidence: "high",
          confidence_source: "realtime",
          rationale: [],
          summary_label: "Bus 8 min",
        },
      },
    ],
    "recommended",
  );

  assert.equal(sorted[0]?.id, "open-slower");
});

test("todas las opciones y modulos de movilidad declaran confidence_source", () => {
  const mobility = buildCenterMobility({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    originEmtStops: [
      {
        id: "507",
        name: "Origen",
        distance_m: 120,
        lat: 40.451,
        lon: -3.688,
        lines: ["7"],
      },
    ],
    destinationEmtStops: [
      {
        id: "600",
        name: "Destino",
        distance_m: 120,
        lat: 40.4777,
        lon: -3.6587,
        lines: ["7"],
      },
    ],
    originBicimadStations: [],
    destinationBicimadStations: [],
    realtimeByStopId: new Map([
      [
        "507",
        [
          {
            stop_id: "507",
            stop_name: "Origen",
            line: "7",
            destination: "Destino",
            minutes: 4,
          },
        ],
      ],
    ]),
  });

  assert.ok(mobility.summary.confidence_source);
  assert.ok(mobility.highlights.primary?.confidence_source);
  assert.ok(mobility.modules.car.confidence_source);
  assert.ok(mobility.modules.bus.confidence_source);
  assert.ok(mobility.modules.bike.confidence_source);
  assert.ok(mobility.modules.metro.confidence_source);
});

test("EMT caido degrada el modulo sin vender realtime", () => {
  const mobility = buildCenterMobility({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    originEmtStops: [
      {
        id: "507",
        name: "Origen",
        distance_m: 120,
        lat: 40.451,
        lon: -3.688,
        lines: ["7"],
      },
    ],
    destinationEmtStops: [
      {
        id: "600",
        name: "Destino",
        distance_m: 120,
        lat: 40.4777,
        lon: -3.6587,
        lines: ["7"],
      },
    ],
    originBicimadStations: [],
    destinationBicimadStations: [],
    realtimeByStopId: new Map(),
    emtRealtimeStatus: "error",
  });

  assert.equal(mobility.modules.bus.state, "degraded_upstream");
  assert.notEqual(mobility.modules.bus.confidence_source, "realtime");
});

test("decision summary mantiene utilidad sin confundir heuristica con realtime", () => {
  const mobility = buildCenterMobility({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    originEmtStops: [],
    destinationEmtStops: [],
    originBicimadStations: [],
    destinationBicimadStations: [],
    realtimeByStopId: new Map(),
  });

  const decision = buildDecisionSummary({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    mobility,
  });

  assert.equal(decision.best_mode, "car");
  assert.equal(decision.confidence_source, "heuristic");
  assert.match(decision.summary_label ?? "", /Coche/);
});
