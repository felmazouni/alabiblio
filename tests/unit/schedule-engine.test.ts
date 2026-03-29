import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSchedulePayload,
  parseSchedule,
} from "../../packages/schedule-engine/src/index";
import type { ActiveScheduleRecord } from "../../packages/schedule-engine/src/types";

function createActiveScheduleRecord(
  rawScheduleText: string,
): ActiveScheduleRecord {
  const parsed = parseSchedule({
    kind: "study_room",
    rawScheduleText,
    openAirFlag: false,
  });

  return {
    schedule_version_id: 1,
    raw_schedule_text: rawScheduleText,
    schedule_confidence: parsed.parse_confidence,
    open_air_flag: parsed.open_air_flag,
    regular_rules: parsed.regular_rules,
    holiday_closures: parsed.holiday_closures,
    partial_day_overrides: parsed.partial_day_overrides,
    warnings: parsed.anomalies,
  };
}

test("parsea reglas regulares simples", () => {
  const parsed = parseSchedule({
    kind: "study_room",
    rawScheduleText: "De lunes a viernes, de 9 a 14 horas.",
    openAirFlag: false,
  });

  assert.equal(parsed.regular_rules.length, 5);
  assert.equal(parsed.regular_rules[0]?.weekday, 1);
  assert.equal(parsed.regular_rules[0]?.opens_at, "09:00");
  assert.equal(parsed.regular_rules[0]?.closes_at, "14:00");
  assert.equal(parsed.holiday_closures.length, 0);
});

test("detecta horario partido y construye dos tramos por dia", () => {
  const parsed = parseSchedule({
    kind: "study_room",
    rawScheduleText: "De lunes a domingo, de 9 a 14 y de 15 a 21 horas.",
    openAirFlag: false,
  });

  assert.equal(parsed.regular_rules.length, 14);
  assert.ok(
    parsed.anomalies.some((item) => item.code === "split_schedule_detected"),
  );
});

test("detecta cierres puntuales con fechas explicitas", () => {
  const parsed = parseSchedule({
    kind: "study_room",
    rawScheduleText:
      "De lunes a domingo, de 9 a 21 horas. Cerrado 1, 5 y 6 de enero, 2 de mayo y 31 de diciembre.",
    openAirFlag: false,
  });

  assert.equal(parsed.holiday_closures.length, 5);
  assert.deepEqual(
    parsed.holiday_closures.map((item) => `${item.day}/${item.month}`),
    ["1/1", "5/1", "6/1", "2/5", "31/12"],
  );
});

test("detecta overrides parciales con dias y rango horario", () => {
  const parsed = parseSchedule({
    kind: "library",
    rawScheduleText:
      "De lunes a domingo, de 9 a 21 horas. Dias 24 y 31 de diciembre, de 9 a 14 horas.",
    openAirFlag: false,
  });

  assert.equal(parsed.partial_day_overrides.length, 2);
  assert.equal(parsed.partial_day_overrides[0]?.opens_at, "09:00");
  assert.equal(parsed.partial_day_overrides[0]?.closes_at, "14:00");
});

test("marca al aire libre y warning cuando no hay rango estructurable", () => {
  const parsed = parseSchedule({
    kind: "study_room",
    rawScheduleText: "Al aire libre",
    openAirFlag: false,
  });

  assert.equal(parsed.open_air_flag, true);
  assert.ok(
    parsed.anomalies.some(
      (item) => item.code === "open_air_without_explicit_schedule",
    ),
  );
});

test("registra warnings sobre textos ambiguos", () => {
  const parsed = parseSchedule({
    kind: "study_room",
    rawScheduleText:
      "Horario del centro: De lunes a sabado, de 9 a 22 horas. Julio: de lunes a viernes, de 9 a 15 horas. Consultar telefonicamente.",
    openAirFlag: false,
  });

  assert.ok(
    parsed.anomalies.some((item) => item.code === "seasonal_rules_unparsed"),
  );
  assert.ok(
    parsed.anomalies.some(
      (item) => item.code === "schedule_requires_manual_contact",
    ),
  );
});

test("calcula is_open_now y next_change_at cuando el centro esta abierto", () => {
  const schedule = createActiveScheduleRecord(
    "De lunes a viernes, de 9 a 14 y de 15 a 21 horas.",
  );
  const payload = buildSchedulePayload(schedule, {
    now: new Date("2026-03-30T08:30:00Z"),
  });

  assert.equal(payload.is_open_now, true);
  assert.equal(payload.opens_today, "09:00");
  assert.equal(payload.closes_today, "21:00");
  assert.equal(payload.next_change_at, "2026-03-30T14:00:00");
});

test("calcula proxima apertura en hueco de horario partido", () => {
  const schedule = createActiveScheduleRecord(
    "De lunes a viernes, de 9 a 14 y de 15 a 21 horas.",
  );
  const payload = buildSchedulePayload(schedule, {
    now: new Date("2026-03-30T12:30:00Z"),
  });

  assert.equal(payload.is_open_now, false);
  assert.equal(payload.next_change_at, "2026-03-30T15:00:00");
});

test("respeta cierres puntuales aunque exista regla regular", () => {
  const schedule = createActiveScheduleRecord(
    "De lunes a domingo, de 9 a 21 horas. Cerrado 1 de enero.",
  );
  const payload = buildSchedulePayload(schedule, {
    now: new Date("2026-01-01T10:00:00Z"),
  });

  assert.equal(payload.is_open_now, false);
  assert.equal(payload.today_human_schedule, "Cerrado hoy");
  assert.equal(payload.next_change_at, null);
});
