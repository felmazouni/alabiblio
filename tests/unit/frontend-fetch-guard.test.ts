import assert from "node:assert/strict";
import test from "node:test";
import { fetchCenters } from "../../apps/web/src/features/centers/api";

test("fetchCenters propaga cancelacion sin reintentos espurios", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  controller.abort(new DOMException("Aborted", "AbortError"));
  let attempts = 0;

  Object.assign(globalThis, {
    window: {
      setTimeout,
      clearTimeout,
      location: {
        origin: "https://example.test",
      },
    },
  });

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    attempts += 1;
    assert.equal(init?.signal?.aborted, true);
    throw new DOMException("Aborted", "AbortError");
  }) as typeof fetch;

  try {
    await assert.rejects(
      fetchCenters({}, controller.signal),
      (error: unknown) => error instanceof DOMException && error.name === "AbortError",
    );
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;

    if (originalWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: Window & typeof globalThis }).window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});
