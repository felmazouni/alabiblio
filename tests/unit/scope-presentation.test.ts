import assert from "node:assert/strict";
import test from "node:test";
import {
  getBaseCatalogScopeDescription,
  getBaseCatalogScopeSignal,
  getBaseExplorationFallbackCopy,
  getBaseExplorationLabel,
  getDetailMobilityScopeLabel,
  getTopMobilityScopeSignal,
} from "../../apps/web/src/features/centers/scopePresentation";

test("scopePresentation deja claro que el listado base no vende llegada contextual", () => {
  assert.equal(getBaseCatalogScopeSignal("base_exploration"), "BASE");
  assert.match(getBaseCatalogScopeDescription("base_exploration"), /Sin llegada contextual/i);
  assert.equal(getBaseExplorationLabel("base_exploration"), "Exploracion base");
  assert.equal(
    getBaseExplorationFallbackCopy("base_exploration", true),
    "Exploracion base disponible",
  );
});

test("scopePresentation mantiene el top y la movilidad como contexto de origen", () => {
  assert.equal(getTopMobilityScopeSignal("origin_enriched"), "ORIGEN");
  assert.equal(
    getDetailMobilityScopeLabel("origin_enriched"),
    "Como llegar desde tu origen",
  );
});
