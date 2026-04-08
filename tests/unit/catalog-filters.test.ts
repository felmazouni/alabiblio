import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBaseCatalogListQuery,
  buildCatalogActiveFilterChips,
  buildCatalogFilterSearchParams,
  buildTopMobilityQuery,
  clearCatalogFilter,
  parseCatalogFilterSearchParams,
  type CatalogFilterState,
} from "../../apps/web/src/features/centers/catalogFilters.ts";

const FULL_FILTERS: CatalogFilterState = {
  kindFilter: "library",
  sortBy: "open_now",
  searchText: "Chamartin",
  openNowOnly: true,
  wifiOnly: true,
  accessibleOnly: true,
  serOnly: true,
  districtFilter: "Chamartin",
  neighborhoodFilter: "Castilla",
};

test("parseCatalogFilterSearchParams hidrata desde query real y degrada sort legado a base", () => {
  const params = new URLSearchParams(
    "kind=library&sort_by=distance&q=Chamartin&open_now=true&has_wifi=true&accessible=true&has_ser=true&district=Chamartin&neighborhood=Castilla",
  );

  assert.deepEqual(parseCatalogFilterSearchParams(params), FULL_FILTERS);
});

test("buildCatalogFilterSearchParams serializa solo estado no default", () => {
  const params = buildCatalogFilterSearchParams(FULL_FILTERS);

  assert.equal(params.get("kind"), "library");
  assert.equal(params.get("sort_by"), null);
  assert.equal(params.get("q"), "Chamartin");
  assert.equal(params.get("open_now"), "true");
  assert.equal(params.get("has_wifi"), "true");
  assert.equal(params.get("accessible"), "true");
  assert.equal(params.get("has_ser"), "true");
  assert.equal(params.get("district"), "Chamartin");
  assert.equal(params.get("neighborhood"), "Castilla");
});

test("buildCatalogActiveFilterChips y clearCatalogFilter comparten la misma verdad", () => {
  const chips = buildCatalogActiveFilterChips(FULL_FILTERS);

  assert.deepEqual(
    chips.map((chip) => chip.label),
    [
      "Bibliotecas",
      "Abierto ahora",
      "WiFi",
      "Accesible",
      "Zona SER",
      "Chamartin",
      "Castilla",
    ],
  );

  const cleared = clearCatalogFilter(FULL_FILTERS, "district");

  assert.equal(cleared.districtFilter, "");
  assert.equal(buildCatalogActiveFilterChips(cleared).some((chip) => chip.key === "district"), false);
});

test("buildBaseCatalogListQuery construye solo query de exploracion base", () => {
  const query = buildBaseCatalogListQuery(FULL_FILTERS, {
    deferredSearch: FULL_FILTERS.searchText,
    limit: 18,
    offset: 36,
  });

  assert.deepEqual(query, {
    kind: "library",
    q: "Chamartin",
    limit: 18,
    offset: 36,
    open_now: true,
    has_wifi: true,
    accessible: true,
    has_ser: true,
    district: "Chamartin",
    neighborhood: "Castilla",
    sort_by: "open_now",
  });
});

test("buildTopMobilityQuery mantiene el contexto enriquecido separado del listado base", () => {
  const query = buildTopMobilityQuery({
    limit: 12,
    offset: 0,
    userLat: 40.45,
    userLon: -3.68,
  });

  assert.deepEqual(query, {
    limit: 12,
    offset: 0,
    sort_by: "recommended",
    user_lat: 40.45,
    user_lon: -3.68,
  });
});
