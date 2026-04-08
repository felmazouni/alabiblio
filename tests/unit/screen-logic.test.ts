import assert from "node:assert/strict";
import test from "node:test";
import { buildFeaturedCardFrame, formatFetchError } from "../../apps/web/src/features/centers/screenLogic";

test("buildFeaturedCardFrame no llama mejor opcion ahora a un centro cerrado", () => {
  const frame = buildFeaturedCardFrame(
    {
      is_open_now: false,
      opens_today: "09:00",
      decision: {
        best_mode: "bike",
        best_time_minutes: 12,
        distance_m: 2100,
        confidence: "medium",
        confidence_source: "frequency",
        rationale: [],
        summary_label: "Bici 12 min",
      },
    },
    "bike",
    0,
  );

  assert.equal(frame.eyebrow, "Mejor opcion proxima");
  assert.equal(frame.sectionTitle, "Preparala para cuando abra");
  assert.match(frame.sectionSummary, /Abre a las 09:00/);
});

test("formatFetchError distingue catalogo y top", () => {
  assert.match(formatFetchError("catalog", new Error("Failed to fetch")), /listado/i);
  assert.match(formatFetchError("catalog", new Error("request_timeout")), /no respondio a tiempo/i);
  assert.match(formatFetchError("top", new Error("top_mobility_500")), /error interno/i);
});
