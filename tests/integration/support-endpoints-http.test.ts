import assert from "node:assert/strict";
import test from "node:test";
import workerScopeHarness from "../support/worker-scope-harness.ts";

const { createWorkerScopeHarness } = workerScopeHarness;

test("GET /api/health mantiene contrato operativo minimo", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request("/api/health");
    const payload = await response.json() as {
      ok: boolean;
      env: string;
      request_id?: string;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.env, "test");
    assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
    assert.equal(response.headers.get("x-cache-status"), "BYPASS");
  } finally {
    harness.cleanup();
  }
});

test("GET /api/origin/presets expone presets utilizables y headers operativos", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request("/api/origin/presets");
    const payload = await response.json() as {
      items: Array<{ code: string; label: string; lat: number; lon: number }>;
    };

    assert.equal(response.status, 200);
    assert.ok(payload.items.length > 0);
    assert.ok(payload.items.every((item) => item.code && item.label));
    assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
    assert.equal(response.headers.get("x-cache-status"), "BYPASS");
  } finally {
    harness.cleanup();
  }
});
