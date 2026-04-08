import assert from "node:assert/strict";
import test from "node:test";
import {
  CENTER_ENDPOINT_SCOPE_V1,
  CENTER_SCOPE_DESCRIPTORS_V1,
} from "../../packages/contracts/src/scopes";

test("base_exploration prohibe campos contextuales y mantiene open_now", () => {
  assert.deepEqual(CENTER_SCOPE_DESCRIPTORS_V1.base_exploration.field_availability, {
    recommended: "forbidden",
    arrival: "forbidden",
    distance: "forbidden",
    open_now: "supported",
  });
});

test("origin_enriched habilita decision contextual completa", () => {
  assert.deepEqual(CENTER_SCOPE_DESCRIPTORS_V1.origin_enriched.field_availability, {
    recommended: "supported",
    arrival: "supported",
    distance: "supported",
    open_now: "supported",
  });
});

test("el mapeo de endpoints a scope queda fijado para lote 1", () => {
  assert.equal(CENTER_ENDPOINT_SCOPE_V1.list_centers, "base_exploration");
  assert.equal(CENTER_ENDPOINT_SCOPE_V1.center_detail, "base_exploration");
  assert.equal(CENTER_ENDPOINT_SCOPE_V1.top_mobility_centers, "origin_enriched");
  assert.equal(CENTER_ENDPOINT_SCOPE_V1.center_mobility, "origin_enriched");
});
