import assert from "node:assert/strict";
import test from "node:test";
import type { WorkerEnv } from "../../apps/web/worker/lib/db";
import { createApiRequestContext } from "../../apps/web/worker/lib/observability";
import { handleGeocodeSearch } from "../../apps/web/worker/routes/geocode";
import type { GetCenterMobilityResponse } from "../../packages/contracts/src/mobility";
import workerScopeHarness from "../support/worker-scope-harness.ts";

const { createWorkerScopeHarness } = workerScopeHarness;

test("geocode lento responde fallback tipado sin romper el worker", async () => {
  const request = new Request("https://example.test/api/geocode?q=Museo%20del%20Prado");
  const requestContext = createApiRequestContext(request, "geocode_search");
  const originalFetch = globalThis.fetch;
  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                return { results: [] };
              },
            };
          },
        };
      },
    },
  } satisfies Pick<WorkerEnv, "DB">;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    await new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
    return new Response();
  }) as typeof fetch;

  try {
    const response = await handleGeocodeSearch(
      request,
      env as WorkerEnv,
      requestContext,
    );
    const payload = await response.json() as {
      error_type: string;
      detail: string;
    };

    assert.equal(response.status, 504);
    assert.equal(response.headers.get("x-error-type"), "upstream_timeout");
    assert.equal(payload.error_type, "upstream_timeout");
    assert.equal(response.headers.get("x-upstream-status"), "callejero:empty;nominatim:timeout");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dataset incompleto no rompe transport y degrada de forma honesta", async () => {
  const harness = createWorkerScopeHarness();

  try {
    const response = await harness.request(
      `/api/centers/sala-norte/transport?user_lat=${harness.origin.lat}&user_lon=${harness.origin.lon}`,
    );
    const payload = await response.json() as GetCenterMobilityResponse;

    assert.equal(response.status, 200);
    assert.equal(payload.meta.scope, "origin_enriched");
    assert.ok(payload.item.summary.confidence_source);
    assert.ok(payload.item.modules.car.confidence_source);
    assert.ok(payload.item.modules.bus.confidence_source);
    assert.ok(payload.item.modules.bike.confidence_source);
    assert.ok(payload.item.modules.metro.confidence_source);
  } finally {
    harness.cleanup();
  }
});
