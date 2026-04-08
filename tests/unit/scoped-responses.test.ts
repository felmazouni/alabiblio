import assert from "node:assert/strict";
import test from "node:test";
import {
  requireBaseCatalogResponse,
  requireBaseCenterDetailResponse,
  requireOriginCenterMobilityResponse,
  requireOriginTopMobilityResponse,
} from "../../apps/web/src/features/centers/scopedResponses";

test("requireBaseCatalogResponse rechaza payload enriquecido en el listado base", () => {
  assert.throws(
    () =>
      requireBaseCatalogResponse({
        meta: {
          scope: "origin_enriched",
          endpoint: "top_mobility_centers",
        },
        items: [],
        total: 0,
        open_count: 0,
        limit: 18,
        offset: 0,
        next_offset: null,
      } as never),
    /centers_list_scope_contract/,
  );
});

test("requireOriginTopMobilityResponse acepta solo top enriquecido", () => {
  const response = requireOriginTopMobilityResponse({
    meta: {
      scope: "origin_enriched",
      endpoint: "top_mobility_centers",
    },
    items: [],
    open_count: 0,
  });

  assert.equal(response.meta.scope, "origin_enriched");
});

test("detail base y movilidad enriquecida mantienen contratos distintos", () => {
  const detail = requireBaseCenterDetailResponse({
    meta: {
      scope: "base_exploration",
      endpoint: "center_detail",
    },
    item: {} as never,
  });
  const mobility = requireOriginCenterMobilityResponse({
    meta: {
      scope: "origin_enriched",
      endpoint: "center_mobility",
    },
    item: {} as never,
  });

  assert.equal(detail.meta.scope, "base_exploration");
  assert.equal(mobility.meta.scope, "origin_enriched");
});
