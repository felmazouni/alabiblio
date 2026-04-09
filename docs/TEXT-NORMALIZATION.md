# Text Normalization Contract

`normalizeSourceText` is the only normalization boundary for external source text in Alabiblio.

## Exact Order

1. Decode HTML entities repeatedly.
2. Repair known UTF-8/latin1 mojibake conservatively.
3. Normalize Unicode to `NFC`.
4. Collapse repeated whitespace and trim.

## Guarantees

- Idempotent:
  - `normalizeSourceText(normalizeSourceText(x)) === normalizeSourceText(x)`
- Returns `null` for:
  - non-string input
  - empty strings after trim
- Leaves already-clean text stable.

## What It Does Not Do

- It does not transliterate or strip accents.
- It does not title-case or restyle text.
- It does not translate text.
- It does not infer semantics from free text.
- It does not apply manual one-off replacements such as `â€” -> —`.
- It does not "repair" arbitrary strings unless they match known mojibake markers.

## Real Examples

| Input | Output |
| --- | --- |
| `Sala de estudio Luis García Berlanga` | `Sala de estudio Luis García Berlanga` |
| `VI&amp;Ntilde;A VIRGEN` | `VIÑA VIRGEN` |
| `JosÃ© CastÃ¡n TobeÃ±as` | `José Castán Tobeñas` |
| `Cafe\u0301 &amp; Co. MalasaÃ±a Â· Centro` | `Café & Co. Malasaña · Centro` |

## Frontiers Covered

- Centers ingestion:
  - `packages/ingestion/src/normalizers/center.ts`
- Mobility source ingestion:
  - `packages/mobility/src/sources/bicimadStations.ts`
  - `packages/mobility/src/sources/emtStops.ts`
  - `packages/mobility/src/sources/metroStations.ts`
  - `packages/mobility/src/sources/parkings.ts`
- Callejero ingestion:
  - `scripts/ingest-callejero.ts`
- Live geocode runtime:
  - `apps/web/worker/routes/geocode.ts`

## Search / Autocomplete Coverage

- Origin autocomplete in the UI calls `/api/geocode`, so live search results pass through `normalizeSourceText` in the worker.
- `/api/origin/presets` does not use an upstream source. It returns static literals defined in repo code, not external text.
- `/api/centers` search parameters are query filters only. The returned center text comes from already-ingested normalized records.

## Runtime Guardrail

- Worker responses are scanned for suspicious mojibake markers.
- If suspicious text appears, the worker logs:
  - `text_suspect=true`
  - `source`
  - `field`
  - `raw_snippet`
- This guardrail is detection only. It does not mutate response payloads.
