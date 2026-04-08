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
  type DecisionBicimadStation,
  type DecisionEmtStop,
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

test("usa andando como fallback principal cuando no hay transporte", () => {
  const mobility = buildCenterMobility({
    center: { lat: 40.4205, lon: -3.7035 },
    schedule: openSchedule,
    userLocation: { lat: 40.4199, lon: -3.7043 },
    originEmtStops: [],
    destinationEmtStops: [],
    originBicimadStations: [],
    destinationBicimadStations: [],
    realtimeByStopId: new Map(),
  });

  const decision = buildDecisionSummary({
    center: { lat: 40.4205, lon: -3.7035 },
    schedule: openSchedule,
    userLocation: { lat: 40.4199, lon: -3.7043 },
    mobility,
  });

  assert.equal(decision.best_mode, "car");
  assert.ok((decision.best_time_minutes ?? 0) > 0);
  assert.equal(decision.confidence_source, "heuristic");
  assert.match(decision.summary_label ?? "", /Coche/);
});

test("prioriza ETA de transporte real cuando existe", () => {
  const originStops: DecisionEmtStop[] = [
    {
      id: "507",
      name: "Almanzora-Bacares",
      distance_m: 108,
      lat: 40.451,
      lon: -3.688,
      lines: ["7", "29"],
    },
  ];
  const destinationStops: DecisionEmtStop[] = [
    {
      id: "600",
      name: "Manoteras",
      distance_m: 130,
      lat: 40.4777,
      lon: -3.6587,
      lines: ["7", "29"],
    },
  ];

  const mobility = buildCenterMobility({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    originEmtStops: originStops,
    destinationEmtStops: destinationStops,
    originBicimadStations: [],
    destinationBicimadStations: [],
    realtimeByStopId: new Map([
      [
        "507",
        [
          {
            stop_id: "507",
            stop_name: "Almanzora-Bacares",
            line: "7",
            destination: "Manoteras",
            minutes: 4,
          },
        ],
      ],
    ]),
  });

  const decision = buildDecisionSummary({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    mobility,
  });

  assert.equal(decision.best_mode, "bus");
  assert.equal(decision.confidence_source, "realtime");
  assert.match(decision.summary_label ?? "", /Bus/);
});

test("penaliza una heuristica rapida cuando EMT tiene realtime cercano", () => {
  const mobility = buildCenterMobility({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    originEmtStops: [
      {
        id: "507",
        name: "Almanzora-Bacares",
        distance_m: 120,
        lat: 40.451,
        lon: -3.688,
        lines: ["7"],
      },
    ],
    destinationEmtStops: [
      {
        id: "600",
        name: "Manoteras",
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
            stop_name: "Almanzora-Bacares",
            line: "7",
            destination: "Manoteras",
            minutes: 4,
          },
        ],
      ],
    ]),
  });

  const decision = buildDecisionSummary({
    center: { lat: 40.4777, lon: -3.6587 },
    schedule: openSchedule,
    userLocation: { lat: 40.451, lon: -3.688 },
    mobility,
  });

  assert.equal(decision.best_mode, "bus");
  assert.equal(decision.confidence_source, "realtime");
});

test("rebaja bici a confidence baja sin disponibilidad realtime", () => {
  const bikeStations: DecisionBicimadStation[] = [
    {
      id: "bike-1",
      name: "Origen bici",
      distance_m: 120,
      lat: 40.4,
      lon: -3.7,
      station_number: "12",
      total_bases: 24,
      station_state: "active",
    },
  ];

  const mobility = buildCenterMobility({
    center: { lat: 40.43, lon: -3.67 },
    schedule: openSchedule,
    userLocation: { lat: 40.4, lon: -3.7 },
    originEmtStops: [],
    destinationEmtStops: [],
    originBicimadStations: bikeStations,
    destinationBicimadStations: [
      {
        ...bikeStations[0]!,
        id: "bike-2",
        name: "Destino bici",
        distance_m: 140,
        lat: 40.43,
        lon: -3.67,
      },
    ],
    realtimeByStopId: new Map(),
  });

  assert.equal(mobility.modules.bike.state, "partial");
  assert.equal(mobility.modules.bike.realtime_status, "unavailable");
  assert.equal(mobility.modules.bike.confidence_source, "heuristic");
});

test("ordena por llegada y luego por distancia como fallback", () => {
  const buildItem = (
    id: string,
    name: string,
    isOpen: boolean,
    decision: CenterDecisionSummary,
  ): CenterDecisionCardItem =>
    ({
      id,
      slug: id,
      kind: "library",
      kind_label: "Biblioteca",
      name,
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
      decision,
      mobility_highlights: {
        primary: null,
        secondary: null,
      },
    }) satisfies CenterDecisionCardItem;

  const sorted = sortCenterListItems(
    [
      buildItem("2", "B", true, {
        best_mode: "walk",
        best_time_minutes: 12,
        distance_m: 600,
        confidence: "high",
        confidence_source: "fallback",
        rationale: [],
        summary_label: "12 min andando",
      }),
      buildItem("1", "A", true, {
        best_mode: "bus",
        best_time_minutes: 10,
        distance_m: 900,
        confidence: "high",
        confidence_source: "realtime",
        rationale: [],
        summary_label: "Bus · 10 min",
      }),
    ],
    "recommended",
  );

  assert.equal(sorted[0]?.id, "1");
});
