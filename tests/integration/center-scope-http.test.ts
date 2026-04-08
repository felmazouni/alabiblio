import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type {
  GetCenterDetailResponse,
  ListCentersResponse,
} from "../../packages/contracts/src/centers";
import type {
  GetCenterMobilityResponse,
  GetTopMobilityCentersResponse,
} from "../../packages/contracts/src/mobility";
import workerScopeHarness from "../support/worker-scope-harness.ts";

const { createWorkerScopeHarness } = workerScopeHarness;

function loadFixture<T>(name: string): T {
  const fixturePath = path.join(process.cwd(), "tests", "fixtures", "scopes", name);
  return JSON.parse(readFileSync(fixturePath, "utf8")) as T;
}

function normalizeBaseListPayload(payload: ListCentersResponse) {
  return {
    meta: payload.meta,
    total: payload.total,
    open_count: payload.open_count,
    limit: payload.limit,
    offset: payload.offset,
    next_offset: payload.next_offset ?? null,
    items: payload.items.map((item) => ({
      keys: Object.keys(item).sort(),
      slug: item.slug,
      kind: item.kind,
      name: item.name,
      is_open_now: item.is_open_now,
      opens_today: item.opens_today,
      closes_today: item.closes_today,
      schedule_confidence_label: item.schedule_confidence_label,
      capacity_value: item.capacity_value,
      ser: item.ser,
      services: item.services,
    })),
  };
}

function normalizeTopMobilityPayload(payload: GetTopMobilityCentersResponse) {
  return {
    meta: payload.meta,
    open_count: payload.open_count,
    items: payload.items.map((entry) => ({
      slug: entry.slug,
      rank: entry.rank,
      center_keys: Object.keys(entry.center).sort(),
      center: {
        name: entry.center.name,
        kind: entry.center.kind,
        is_open_now: entry.center.is_open_now,
        opens_today: entry.center.opens_today,
        closes_today: entry.center.closes_today,
        decision: entry.center.decision,
        ser: entry.center.ser,
      },
      mobility: {
        origin: {
          available: entry.item.origin.available,
          label: entry.item.origin.label,
        },
        origin_dependent: {
          estimated_car_eta_min: entry.item.origin_dependent.estimated_car_eta_min,
          walking_eta_min: entry.item.origin_dependent.walking_eta_min,
        },
        summary: entry.item.summary,
        module_states: {
          car: entry.item.modules.car.state,
          bus: entry.item.modules.bus.state,
          bike: entry.item.modules.bike.state,
          metro: entry.item.modules.metro.state,
        },
        degraded_modes: entry.item.degraded_modes,
      },
    })),
  };
}

test("GET /api/centers mantiene scope base y no filtra campos enriquecidos aunque llegue query contextual", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request(
      "/api/centers?limit=2&sort_by=recommended&user_lat=40.4502&user_lon=-3.6898",
    );
    const payload = await response.json() as ListCentersResponse;

    assert.equal(response.status, 200);
    assert.equal(payload.meta.scope, "base_exploration");
    assert.equal(payload.meta.endpoint, "list_centers");
    assert.equal(payload.total, 2);
    assert.equal(payload.open_count, 1);
    assert.equal(payload.next_offset, null);

    for (const item of payload.items) {
      assert.equal("decision" in item, false);
      assert.equal("arrival" in item, false);
      assert.equal("distance" in item, false);
      assert.equal("recommended" in item, false);
      assert.equal("mobility_highlights" in item, false);
    }

    assert.deepEqual(
      normalizeBaseListPayload(payload),
      loadFixture("list-base.json"),
    );
  } finally {
    harness.cleanup();
  }
});

test("GET /api/centers/top-mobility mantiene scope origin_enriched y expone decision contextual", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request(
      "/api/centers/top-mobility?user_lat=40.4502&user_lon=-3.6898",
    );
    const payload = await response.json() as GetTopMobilityCentersResponse;

    assert.equal(response.status, 200);
    assert.equal(payload.meta.scope, "origin_enriched");
    assert.equal(payload.meta.endpoint, "top_mobility_centers");
    assert.equal(payload.items.length, 1);
    assert.ok(payload.items[0]?.center.decision);
    assert.ok(payload.items[0]?.item.summary.best_mode);

    assert.deepEqual(
      normalizeTopMobilityPayload(payload),
      loadFixture("top-enriched.json"),
    );
  } finally {
    harness.cleanup();
  }
});

test("GET /api/centers/:slug mantiene scope base y no expone decision contextual", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request(`/api/centers/${harness.centerSlug}`);
    const payload = await response.json() as GetCenterDetailResponse;

    assert.equal(response.status, 200);
    assert.equal(payload.meta.scope, "base_exploration");
    assert.equal(payload.meta.endpoint, "center_detail");
    assert.equal(payload.item.slug, harness.centerSlug);
    assert.equal("decision" in payload.item, false);
    assert.equal("arrival" in payload.item, false);
    assert.equal("distance" in payload.item, false);
    assert.equal(payload.item.schedule.is_open_now, true);
  } finally {
    harness.cleanup();
  }
});

test("GET /api/centers/:slug/mobility mantiene scope origin_enriched y expone la capa contextual", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request(
      `/api/centers/${harness.centerSlug}/mobility?user_lat=40.4502&user_lon=-3.6898`,
    );
    const payload = await response.json() as GetCenterMobilityResponse;

    assert.equal(response.status, 200);
    assert.equal(payload.meta.scope, "origin_enriched");
    assert.equal(payload.meta.endpoint, "center_mobility");
    assert.equal(payload.item.origin.available, true);
    assert.equal(payload.item.summary.best_mode, "car");
    assert.equal(payload.item.origin_dependent.estimated_car_eta_min, 9);
  } finally {
    harness.cleanup();
  }
});

test("el mismo centro mantiene datos base coherentes y solo expone enriquecimiento donde corresponde", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const [listResponse, topResponse, detailResponse, mobilityResponse] = await Promise.all([
      harness.requestJson<ListCentersResponse>("/api/centers?limit=2"),
      harness.requestJson<GetTopMobilityCentersResponse>(
        "/api/centers/top-mobility?user_lat=40.4502&user_lon=-3.6898",
      ),
      harness.requestJson<GetCenterDetailResponse>(`/api/centers/${harness.centerSlug}`),
      harness.requestJson<GetCenterMobilityResponse>(
        `/api/centers/${harness.centerSlug}/mobility?user_lat=40.4502&user_lon=-3.6898`,
      ),
    ]);

    const listItem = listResponse.items.find((item) => item.slug === harness.centerSlug);
    const topItem = topResponse.items.find((item) => item.slug === harness.centerSlug);

    assert.ok(listItem);
    assert.ok(topItem);
    assert.equal(detailResponse.item.slug, harness.centerSlug);

    assert.equal(listItem?.name, detailResponse.item.name);
    assert.equal(listItem?.name, topItem?.center.name);
    assert.equal(listItem?.address_line, detailResponse.item.address_line);
    assert.equal(listItem?.address_line, topItem?.center.address_line);
    assert.equal(listItem?.is_open_now, detailResponse.item.schedule.is_open_now);
    assert.equal(listItem?.is_open_now, topItem?.center.is_open_now);

    assert.equal("decision" in (listItem ?? {}), false);
    assert.equal("decision" in detailResponse.item, false);
    assert.ok(topItem?.center.decision);
    assert.equal(topItem?.center.decision.best_mode, mobilityResponse.item.summary.best_mode);
    assert.equal(
      topItem?.center.decision.best_time_minutes,
      mobilityResponse.item.summary.best_time_minutes,
    );
    assert.deepEqual(
      topItem?.center.decision.rationale,
      mobilityResponse.item.summary.rationale,
    );
  } finally {
    harness.cleanup();
  }
});
