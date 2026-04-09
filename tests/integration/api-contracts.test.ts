import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type {
  GetCenterDetailResponse,
  ListCentersResponse,
} from "../../packages/contracts/src/centers";
import type { GeocodeSearchResponse } from "../../packages/contracts/src/origin";
import type { GetCenterMobilityResponse } from "../../packages/contracts/src/mobility";
import { findSuspiciousTextEntries } from "../../packages/ingestion/src/text";
import workerScopeHarness from "../support/worker-scope-harness.ts";

const { createWorkerScopeHarness } = workerScopeHarness;

function loadFixture<T>(name: string): T {
  const fixturePath = path.join(process.cwd(), "tests", "fixtures", "contracts", name);
  return JSON.parse(readFileSync(fixturePath, "utf8")) as T;
}

function assertNoSuspiciousText(payload: unknown, label: string): void {
  assert.deepEqual(findSuspiciousTextEntries(payload), [], `${label} contains suspicious text`);
}

function assertPresentString(value: string | null | undefined, field: string): void {
  assert.equal(typeof value, "string", `Expected ${field} to be a string`);
  assert.notEqual(value?.trim(), "", `Expected ${field} to be non-empty`);
}

function normalizeListContract(payload: ListCentersResponse) {
  return {
    meta: payload.meta,
    total: payload.total,
    open_count: payload.open_count,
    limit: payload.limit,
    offset: payload.offset,
    next_offset: payload.next_offset ?? null,
    items: payload.items.map((item) => ({
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      name: item.name,
      is_open_now: item.is_open_now,
      next_change_at: item.next_change_at,
      ser_zone: item.ser?.zone_name ?? null,
      keys: Object.keys(item).sort(),
    })),
  };
}

function normalizeDetailContract(payload: GetCenterDetailResponse) {
  return {
    meta: payload.meta,
    item: {
      id: payload.item.id,
      slug: payload.item.slug,
      kind: payload.item.kind,
      name: payload.item.name,
      address_line: payload.item.address_line,
      municipality: payload.item.municipality,
      ser_zone: payload.item.ser.zone_name,
      is_open_now: payload.item.schedule.is_open_now,
      next_change_at: payload.item.schedule.next_change_at,
      source_codes: payload.item.sources.map((source) => source.code),
      feature_codes: payload.item.features.map((feature) => feature.code),
    },
  };
}

function normalizeTransportContract(payload: GetCenterMobilityResponse) {
  return {
    meta: payload.meta,
    item: {
      origin_available: payload.item.origin.available,
      eta_best: payload.item.summary.best_time_minutes,
      best_mode: payload.item.summary.best_mode,
      confidence_source: payload.item.summary.confidence_source,
      car: {
        state: payload.item.modules.car.state,
        eta_min: payload.item.modules.car.eta_min,
        ser_zone: payload.item.modules.car.ser_zone_name,
        confidence_source: payload.item.modules.car.confidence_source,
      },
      bus: {
        state: payload.item.modules.bus.state,
        eta_min: payload.item.modules.bus.estimated_total_min,
        confidence_source: payload.item.modules.bus.confidence_source,
      },
      bike: {
        state: payload.item.modules.bike.state,
        eta_min: payload.item.modules.bike.eta_min,
        confidence_source: payload.item.modules.bike.confidence_source,
      },
      metro: {
        state: payload.item.modules.metro.state,
        eta_min: payload.item.modules.metro.eta_min,
        confidence_source: payload.item.modules.metro.confidence_source,
      },
    },
  };
}

function normalizeGeocodeContract(payload: GeocodeSearchResponse) {
  return {
    items: payload.items.map((item) => ({
      id: item.id,
      label: item.label,
      display_name: item.display_name,
      address_line: item.address_line,
      district: item.district,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
    })),
  };
}

test("GET /api/centers mantiene contrato base, campos derivados y golden estable", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request("/api/centers?limit=2&sort_by=open_now");
    const payload = await response.json() as ListCentersResponse;

    assert.equal(response.status, 200);
    assert.equal(payload.meta.scope, "base_exploration");
    assert.equal(payload.meta.endpoint, "list_centers");
    assert.equal(payload.items.length, 2);
    assert.equal(payload.open_count, 1);
    assertNoSuspiciousText(payload, "list");

    for (const item of payload.items) {
      assertPresentString(item.id, "list.id");
      assertPresentString(item.slug, "list.slug");
      assertPresentString(item.name, "list.name");
      assert.equal("decision" in item, false);
      assert.equal("arrival" in item, false);
      assert.equal("distance" in item, false);
      assert.equal(item.is_open_now === null || typeof item.is_open_now === "boolean", true);
    }

    assert.deepEqual(
      normalizeListContract(payload),
      loadFixture("centers-list.json"),
    );
  } finally {
    harness.cleanup();
  }
});

test("GET /api/centers/:slug mantiene contrato base consistente con listado", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const [listPayload, detailPayload] = await Promise.all([
      harness.requestJson<ListCentersResponse>("/api/centers?limit=2&sort_by=open_now"),
      harness.requestJson<GetCenterDetailResponse>(`/api/centers/${harness.centerSlug}`),
    ]);

    const listItem = listPayload.items.find((item) => item.slug === harness.centerSlug);
    assert.ok(listItem, "Center must exist in list payload");
    assert.equal(detailPayload.meta.scope, "base_exploration");
    assert.equal(detailPayload.meta.endpoint, "center_detail");
    assert.equal(detailPayload.item.slug, harness.centerSlug);
    assert.equal(detailPayload.item.name, listItem.name);
    assert.equal(detailPayload.item.address_line, listItem.address_line);
    assert.equal(detailPayload.item.schedule.is_open_now, listItem.is_open_now);
    assert.equal(detailPayload.item.ser.zone_name, listItem.ser?.zone_name ?? null);
    assert.equal("decision" in detailPayload.item, false);
    assertNoSuspiciousText(detailPayload, "detail");

    assert.deepEqual(
      normalizeDetailContract(detailPayload),
      loadFixture("center-detail.json"),
    );
  } finally {
    harness.cleanup();
  }
});

test("GET /api/centers/:slug/transport mantiene contrato enriquecido, coherencia ETA y golden estable", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const [transportPayload, detailPayload] = await Promise.all([
      harness.requestJson<GetCenterMobilityResponse>(
        `/api/centers/${harness.centerSlug}/transport?user_lat=${harness.origin.lat}&user_lon=${harness.origin.lon}`,
      ),
      harness.requestJson<GetCenterDetailResponse>(`/api/centers/${harness.centerSlug}`),
    ]);

    assert.equal(transportPayload.meta.scope, "origin_enriched");
    assert.equal(transportPayload.meta.endpoint, "center_mobility");
    assert.equal(transportPayload.item.summary.best_mode, "car");
    assert.equal(transportPayload.item.summary.best_time_minutes, 9);
    assert.equal(transportPayload.item.modules.car.ser_zone_name, detailPayload.item.ser.zone_name);
    assert.ok(transportPayload.item.modules.bus.confidence_source);
    assert.ok(transportPayload.item.modules.bike.confidence_source);
    assert.ok(transportPayload.item.modules.metro.confidence_source);
    assertNoSuspiciousText(transportPayload, "transport");

    assert.deepEqual(
      normalizeTransportContract(transportPayload),
      loadFixture("center-transport.json"),
    );
  } finally {
    harness.cleanup();
  }
});

test("GET /api/geocode mantiene contrato textual limpio y golden estable", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request("/api/geocode?q=Gran%20Via%2032");
    const payload = await response.json() as GeocodeSearchResponse;

    assert.equal(response.status, 200);
    assert.ok(payload.items.length >= 1);
    assertNoSuspiciousText(payload, "geocode");

    const first = payload.items[0];
    assert.ok(first, "Expected geocode result");
    assertPresentString(first.label, "geocode.label");
    assertPresentString(first.display_name, "geocode.display_name");
    assertPresentString(first.municipality, "geocode.municipality");

    assert.deepEqual(
      normalizeGeocodeContract(payload),
      loadFixture("geocode-search.json"),
    );
  } finally {
    harness.cleanup();
  }
});
