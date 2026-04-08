import assert from "node:assert/strict";
import test from "node:test";
import workerScopeHarness from "../support/worker-scope-harness.ts";

const { createWorkerScopeHarness } = workerScopeHarness;

function assertUuid(value: string | null, label: string) {
  assert.match(value ?? "", /^[0-9a-f-]{36}$/i, `Missing UUID header for ${label}`);
}

test("GET /api/centers expone headers operativos y distingue MISS/HIT", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const firstResponse = await harness.request("/api/centers?limit=1&sort_by=open_now");
    const secondResponse = await harness.request("/api/centers?limit=1&sort_by=open_now");

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assertUuid(firstResponse.headers.get("x-request-id"), "list first response");
    assertUuid(secondResponse.headers.get("x-request-id"), "list second response");
    assert.equal(firstResponse.headers.get("x-cache-status"), "MISS");
    assert.equal(secondResponse.headers.get("x-cache-status"), "HIT");
    assert.equal(firstResponse.headers.get("x-data-scope"), "base_exploration");
    assert.equal(firstResponse.headers.get("x-upstream-status"), "none");
    assert.equal(firstResponse.headers.get("x-data-state"), "estimated");
  } finally {
    harness.cleanup();
  }
});

test("top, detail y mobility emiten scope, upstream y errores tipados", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const [topResponse, detailResponse, mobilityResponse, invalidGeocodeResponse] = await Promise.all([
      harness.request(
        `/api/centers/top-mobility?user_lat=${harness.origin.lat}&user_lon=${harness.origin.lon}`,
      ),
      harness.request(`/api/centers/${harness.centerSlug}`),
      harness.request(
        `/api/centers/${harness.centerSlug}/mobility?user_lat=${harness.origin.lat}&user_lon=${harness.origin.lon}`,
      ),
      harness.request("/api/geocode?q=ab"),
    ]);

    assert.equal(topResponse.headers.get("x-data-scope"), "origin_enriched");
    assert.match(topResponse.headers.get("x-upstream-status") ?? "", /^emt:/);
    assert.ok(topResponse.headers.get("x-data-state"));

    assert.equal(detailResponse.headers.get("x-data-scope"), "base_exploration");
    assert.equal(detailResponse.headers.get("x-upstream-status"), "none");
    assert.equal(detailResponse.headers.get("x-data-state"), "estimated");

    assert.equal(mobilityResponse.headers.get("x-data-scope"), "origin_enriched");
    assert.match(
      mobilityResponse.headers.get("x-upstream-status") ?? "",
      /^emt:.*;bicimad:.*;metro:.*/,
    );
    assert.ok(mobilityResponse.headers.get("x-data-state"));

    const invalidGeocodePayload = await invalidGeocodeResponse.json() as {
      error_type: string;
      request_id: string;
    };
    assert.equal(invalidGeocodeResponse.status, 400);
    assert.equal(invalidGeocodeResponse.headers.get("x-error-type"), "validation_error");
    assert.equal(invalidGeocodePayload.error_type, "validation_error");
    assertUuid(invalidGeocodePayload.request_id, "invalid geocode payload");
  } finally {
    harness.cleanup();
  }
});
