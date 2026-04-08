import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCenterFilters,
  buildListSortMode,
  buildOriginBucket,
  parseListCentersQuery,
  toBaseExplorationQuery,
} from "../../apps/web/worker/lib/centersQuery";

test("parseListCentersQuery valida coordenadas parciales", () => {
  const url = new URL("https://example.test/api/centers?user_lat=40.4");
  assert.throws(
    () => parseListCentersQuery(url, { limit: 24, maxLimit: 48 }),
    /invalid_partial_user_location/,
  );
});

test("buildCenterFilters conserva solo filtros de backend", () => {
  const query = parseListCentersQuery(
    new URL("https://example.test/api/centers?kind=library&has_wifi=true&district=Retiro"),
    { limit: 24, maxLimit: 48 },
  );

  const filters = buildCenterFilters(query);

  assert.equal(filters.kind, "library");
  assert.equal(filters.has_wifi, true);
  assert.equal(filters.district, "Retiro");
});

test("buildListSortMode cae en open_now sin origen", () => {
  assert.equal(buildListSortMode(undefined, false), "open_now");
  assert.equal(buildListSortMode(undefined, true), "recommended");
});

test("toBaseExplorationQuery elimina origen contextual y degrada la ordenacion a open_now", () => {
  const query = parseListCentersQuery(
    new URL(
      "https://example.test/api/centers?sort_by=recommended&user_lat=40.4&user_lon=-3.7&limit=12&offset=24",
    ),
    { limit: 24, maxLimit: 48 },
  );

  const scoped = toBaseExplorationQuery(query);

  assert.equal(scoped.sort_by, "open_now");
  assert.equal(scoped.user_lat, undefined);
  assert.equal(scoped.user_lon, undefined);
  assert.equal(scoped.limit, 12);
  assert.equal(scoped.offset, 24);
});

test("buildOriginBucket bucketiza coordenadas en grupos estables", () => {
  assert.equal(buildOriginBucket(40.4011, -3.6999), "40.402,-3.700");
});
