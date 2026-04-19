import type { ScheduleConfidence, ScheduleOverride, ScheduleOverrideKind, ScheduleRule, ScheduleSummary } from "@alabiblio/contracts";
import { normalizeSearch, repairSourceText } from "./text";

const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
] as const;

const DAY_INDEX: Record<(typeof DAY_NAMES)[number], number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const SPECIAL_MARKERS = [
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "verano",
  "invierno",
  "examenes",
  "dias de cierre",
  "dia de cierre",
  "festivos",
  "festivo",
  "fuera de este horario",
  "horario de secretaria",
  "excepto",
  "otros",
  "cierre temporal",
  "mantenimiento",
  "horario especial",
  "ampliacion de horario",
  "cerrado",
  "cerrada",
  "cerrados",
  "cerradas",
  "fines de semana y festivos",
  "mes de agosto",
  "meses de julio y agosto",
  "del ",
] as const;

function normalizeTime(raw: string): string {
  const [hoursPart, minutesPart] = raw.split(":");
  const hours = (hoursPart ?? "00").padStart(2, "0");
  const minutes = (minutesPart ?? "00").padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function formatTime(value: string): string {
  const [hours, minutes] = value.split(":");
  return `${hours}:${minutes}`;
}

function formatWeekday(weekday: number): string {
  return DAY_NAMES[weekday] ?? "dia";
}

function expandRange(start: number, end: number): number[] {
  if (start <= end) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  return [
    ...Array.from({ length: 7 - start }, (_, index) => start + index),
    ...Array.from({ length: end + 1 }, (_, index) => index),
  ];
}

function splitClauses(value: string): string[] {
  return value
    .split(/[.;\n\r]/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function parseWeekdays(clause: string): number[] {
  const search = normalizeSearch(clause);

  if (search.includes("todos los dias")) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  if (search.includes("de lunes a sabado")) {
    return [1, 2, 3, 4, 5, 6];
  }

  if (search.includes("de lunes a viernes")) {
    return [1, 2, 3, 4, 5];
  }

  if (search.includes("sabados")) {
    return [6];
  }

  if (search.includes("domingos")) {
    return [0];
  }

  if (search.includes("fines de semana")) {
    return [0, 6];
  }

  const rangeMatch = search.match(
    /(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/,
  );

  if (rangeMatch?.[1] && rangeMatch[2]) {
    return expandRange(
      DAY_INDEX[rangeMatch[1] as keyof typeof DAY_INDEX],
      DAY_INDEX[rangeMatch[2] as keyof typeof DAY_INDEX],
    );
  }

  const matches = [...search.matchAll(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)s?\b/g)];
  return [...new Set(matches.map((match) => DAY_INDEX[match[1] as keyof typeof DAY_INDEX]))];
}

function parseTimeRanges(clause: string): Array<{ opensAt: string; closesAt: string }> {
  return [
    ...clause.matchAll(
      /(\d{1,2}(?::\d{2})?)\s*(?:horas|h)?\s*(?:a|-)\s*(\d{1,2}(?::\d{2})?)/gi,
    ),
  ].flatMap((match) => {
    const opensAt = match[1];
    const closesAt = match[2];

    if (!opensAt || !closesAt) {
      return [];
    }

    return [{ opensAt: normalizeTime(opensAt), closesAt: normalizeTime(closesAt) }];
  });
}

function uniqueRules(rules: ScheduleRule[]): ScheduleRule[] {
  const seen = new Set<string>();
  const unique: ScheduleRule[] = [];

  for (const rule of rules) {
    const key = `${rule.weekday}:${rule.opensAt}:${rule.closesAt}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(rule);
  }

  return unique.sort((left, right) => {
    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday;
    }

    return toMinutes(left.opensAt) - toMinutes(right.opensAt);
  });
}

function hasSpecialMarkers(value: string): boolean {
  const search = normalizeSearch(value);
  return (
    SPECIAL_MARKERS.some((marker) => search.includes(marker)) ||
    /\b\d{1,2}\s+de\s+[a-z]+/.test(search)
  );
}

function isSpecialClause(clause: string): boolean {
  const search = normalizeSearch(clause);
  return (
    SPECIAL_MARKERS.some((marker) => search.includes(marker)) ||
    search.includes("cierre") ||
    search.includes("secretar") ||
    /\b\d{1,2}\s+de\s+[a-z]+/.test(search)
  );
}

function extractRegularRules(rawText: string): ScheduleRule[] {
  const clauses = splitClauses(rawText);
  const rules: ScheduleRule[] = [];
  let inheritedWeekdays: number[] = [];

  for (const clause of clauses) {
    if (isSpecialClause(clause)) {
      continue;
    }

    const weekdays = parseWeekdays(clause);
    const timeRanges = parseTimeRanges(clause);

    if (weekdays.length > 0 && timeRanges.length === 0) {
      inheritedWeekdays = weekdays;
      continue;
    }

    const effectiveWeekdays =
      weekdays.length > 0 ? weekdays : timeRanges.length > 0 ? inheritedWeekdays : [];

    if (effectiveWeekdays.length === 0 || timeRanges.length === 0) {
      continue;
    }

    if (weekdays.length > 0) {
      inheritedWeekdays = weekdays;
    }

    for (const weekday of effectiveWeekdays) {
      for (const range of timeRanges) {
        rules.push({
          weekday,
          opensAt: range.opensAt,
          closesAt: range.closesAt,
        });
      }
    }
  }

  return uniqueRules(rules);
}

function extractSpecialClauses(rawText: string): string[] {
  return splitClauses(rawText).filter((clause) => isSpecialClause(clause));
}

const MONTH_INDEX: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

function extractDateRange(clause: string): { fromDate: string | null; toDate: string | null } {
  const search = normalizeSearch(clause);
  const year = new Date().getFullYear();

  const fullMatch = search.match(
    /(?:del?\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:al?|hasta)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/,
  );

  if (fullMatch) {
    const fromMonth = MONTH_INDEX[fullMatch[2] ?? ""] ?? null;
    const toMonth = MONTH_INDEX[fullMatch[4] ?? ""] ?? null;

    if (fromMonth && toMonth) {
      const fromDay = String(fullMatch[1] ?? "1").padStart(2, "0");
      const toDay = String(fullMatch[3] ?? "1").padStart(2, "0");
      return { fromDate: `${year}-${fromMonth}-${fromDay}`, toDate: `${year}-${toMonth}-${toDay}` };
    }
  }

  const monthRangeMatch = search.match(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b(?:\s+y\s+|\s*-\s*)\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/,
  );

  if (monthRangeMatch) {
    const fromMonth = MONTH_INDEX[monthRangeMatch[1] ?? ""] ?? null;
    const toMonth = MONTH_INDEX[monthRangeMatch[2] ?? ""] ?? null;

    if (fromMonth && toMonth) {
      return { fromDate: `${year}-${fromMonth}-01`, toDate: `${year}-${toMonth}-31` };
    }
  }

  const singleMonthMatch = search.match(
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/,
  );

  if (singleMonthMatch) {
    const month = MONTH_INDEX[singleMonthMatch[1] ?? ""] ?? null;

    if (month) {
      return { fromDate: `${year}-${month}-01`, toDate: `${year}-${month}-31` };
    }
  }

  return { fromDate: null, toDate: null };
}

function determineOverrideKind(search: string): ScheduleOverrideKind {
  if (search.includes("cierre temporal") || search.includes("mantenimiento")) {
    return "temporary_closure";
  }

  if (search.includes("examen")) {
    return "exam_period";
  }

  if (search.includes("verano") || (search.includes("julio") && search.includes("agosto"))) {
    return "summer";
  }

  if (search.includes("festivo")) {
    return "holiday_exceptions";
  }

  if (search.includes("julio") || search.includes("agosto") || search.includes("invierno")) {
    return "reduced_hours";
  }

  return "special";
}

function buildOverrideLabel(clause: string): string {
  const labelPart = clause.split(/[:(]/)[0]?.trim() ?? clause;
  return labelPart.length > 60 ? `${labelPart.slice(0, 57)}...` : labelPart;
}

function extractOverrideRules(clause: string, inheritedWeekdays: number[]): ScheduleRule[] {
  const stripped = clause
    .replace(/^[^:(]*\([^)]*\)\s*:\s*/, "")
    .replace(/^[^:]+:\s*/, "");

  const weekdays = parseWeekdays(stripped);
  const timeRanges = parseTimeRanges(stripped);

  if (timeRanges.length === 0) {
    return [];
  }

  const effectiveWeekdays = weekdays.length > 0 ? weekdays : inheritedWeekdays;

  if (effectiveWeekdays.length === 0) {
    return [];
  }

  const rules: ScheduleRule[] = [];

  for (const weekday of effectiveWeekdays) {
    for (const range of timeRanges) {
      rules.push({ weekday, opensAt: range.opensAt, closesAt: range.closesAt });
    }
  }

  return uniqueRules(rules);
}

function extractOverrides(rawText: string, regularRulesWeekdays: number[]): ScheduleOverride[] {
  const clauses = splitClauses(rawText);
  const overrides: ScheduleOverride[] = [];
  let inheritedWeekdays: number[] = regularRulesWeekdays;

  for (const clause of clauses) {
    if (!isSpecialClause(clause)) {
      const weekdays = parseWeekdays(clause);

      if (weekdays.length > 0) {
        inheritedWeekdays = weekdays;
      }

      continue;
    }

    const search = normalizeSearch(clause);
    const kind = determineOverrideKind(search);
    const { fromDate, toDate } = extractDateRange(clause);
    const label = buildOverrideLabel(clause);
    const isClosed =
      search.includes("cerrado") ||
      search.includes("cerrada") ||
      search.includes("cerrados") ||
      search.includes("cerradas") ||
      (search.includes("cierre") && !search.includes("de cierre del"));

    if (isClosed) {
      overrides.push({ kind, label, rules: [], fromDate, toDate, notes: clause, closed: true });
      continue;
    }

    const rules = extractOverrideRules(clause, inheritedWeekdays);
    overrides.push({
      kind,
      label,
      rules,
      fromDate,
      toDate,
      notes: rules.length === 0 ? clause : null,
      closed: false,
    });
  }

  return overrides;
}

function detectActiveOverride(overrides: ScheduleOverride[]): ScheduleOverride | null {
  const parts = currentMadridDateParts();
  const today = `${parts.year}-${parts.month}-${parts.day}`;

  return (
    overrides.find((override) => {
      if (!override.fromDate || !override.toDate) {
        return false;
      }

      return today >= override.fromDate && today <= override.toDate;
    }) ?? null
  );
}

function currentMadridDateParts(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[values.weekday ?? "Mon"] ?? 1,
    hour: Number(values.hour ?? "0"),
    minute: Number(values.minute ?? "0"),
    day: values.day ?? "01",
    month: values.month ?? "01",
    year: values.year ?? "1970",
  };
}

function madridOffsetAt(parts: { year: string; month: string; day: string }, time: string): string {
  const [hours, minutes] = time.split(":").map((value) => Number(value));
  const probeDate = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      0,
    ),
  );
  const offsetText = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  })
    .formatToParts(probeDate)
    .find((part) => part.type === "timeZoneName")?.value;

  const normalized = offsetText?.replace("GMT", "") ?? "+01:00";
  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return "+01:00";
  }

  const sign = match[1];
  const hoursPart = String(match[2] ?? "01").padStart(2, "0");
  const minutesPart = String(match[3] ?? "00").padStart(2, "0");
  return `${sign}${hoursPart}:${minutesPart}`;
}

function isoInMadrid(parts: { year: string; month: string; day: string }, time: string): string {
  return `${parts.year}-${parts.month}-${parts.day}T${time}:00${madridOffsetAt(parts, time)}`;
}

function buildTodaySummary(rules: ScheduleRule[], weekday: number): string | null {
  const todayRules = rules
    .filter((rule) => rule.weekday === weekday)
    .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt));

  if (todayRules.length === 0) {
    return null;
  }

  const ranges = todayRules.map((rule) => `${formatTime(rule.opensAt)}-${formatTime(rule.closesAt)}`);
  return `${formatWeekday(weekday)}: ${ranges.join(" / ")}`;
}

function computeOpenState(rules: ScheduleRule[], activeOverride: ScheduleOverride | null): Pick<ScheduleSummary, "isOpenNow" | "nextChangeAt" | "nextOpening" | "todaySummary"> {
  if (activeOverride?.closed) {
    return {
      isOpenNow: false,
      nextChangeAt: activeOverride.toDate ? `${activeOverride.toDate}T00:00:00+01:00` : null,
      nextOpening: null,
      todaySummary: activeOverride.label,
    };
  }

  const effectiveRules = activeOverride?.rules.length ? activeOverride.rules : rules;

  if (effectiveRules.length === 0) {
    return {
      isOpenNow: null,
      nextChangeAt: null,
      nextOpening: null,
      todaySummary: null,
    };
  }

  const now = currentMadridDateParts();
  const currentMinutes = now.hour * 60 + now.minute;
  const todayRules = effectiveRules
    .filter((rule) => rule.weekday === now.weekday)
    .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt));
  const todaySummary = buildTodaySummary(effectiveRules, now.weekday);
  const currentRule = todayRules.find(
    (rule) => currentMinutes >= toMinutes(rule.opensAt) && currentMinutes < toMinutes(rule.closesAt),
  );

  if (currentRule) {
    return {
      isOpenNow: true,
      nextChangeAt: isoInMadrid(now, currentRule.closesAt),
      nextOpening: null,
      todaySummary,
    };
  }

  const nextTodayRule = todayRules.find((rule) => currentMinutes < toMinutes(rule.opensAt));

  if (nextTodayRule) {
    return {
      isOpenNow: false,
      nextChangeAt: isoInMadrid(now, nextTodayRule.opensAt),
      nextOpening: isoInMadrid(now, nextTodayRule.opensAt),
      todaySummary,
    };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = (now.weekday + offset) % 7;
    const nextRule = effectiveRules
      .filter((rule) => rule.weekday === weekday)
      .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt))[0];

    if (!nextRule) {
      continue;
    }

    const candidateDate = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const candidateParts = currentMadridDateParts(candidateDate);
    const nextOpening = isoInMadrid(candidateParts, nextRule.opensAt);

    return {
      isOpenNow: false,
      nextChangeAt: nextOpening,
      nextOpening,
      todaySummary,
    };
  }

  return {
    isOpenNow: false,
    nextChangeAt: null,
    nextOpening: null,
    todaySummary,
  };
}

export function parseSchedule(rawValue: string | null | undefined): ScheduleSummary {
  const repaired = repairSourceText(rawValue);

  if (!repaired) {
    return {
      rawText: null,
      displayText: null,
      notesUnparsed: null,
      confidence: "needs_manual_review",
      rules: [],
      overrides: [],
      activeOverride: null,
      isOpenNow: null,
      nextChangeAt: null,
      nextOpening: null,
      todaySummary: null,
      specialScheduleActive: false,
      needsManualReview: true,
      source: "manual_review_pending",
    };
  }

  const rules = extractRegularRules(repaired);
  const regularRulesWeekdays = [...new Set(rules.map((rule) => rule.weekday))];
  const overrides = extractOverrides(repaired, regularRulesWeekdays);
  const activeOverride = detectActiveOverride(overrides);
  const specialClauses = extractSpecialClauses(repaired);
  const unparsedOverrides = overrides.filter((o) => !o.closed && o.rules.length === 0);
  const notesUnparsed =
    unparsedOverrides.length > 0
      ? unparsedOverrides.map((o) => o.notes ?? o.label).join(". ")
      : specialClauses.length > 0
        ? specialClauses.join(". ")
        : null;
  const confidence: ScheduleConfidence =
    rules.length === 0 && overrides.length === 0
      ? "needs_manual_review"
      : rules.length === 0
        ? "low"
        : specialClauses.length > 0
          ? "medium"
          : "high";
  const openState = computeOpenState(rules, activeOverride);
  const needsManualReview = confidence === "needs_manual_review" || confidence === "low";

  return {
    rawText: repaired,
    displayText: repaired,
    notesUnparsed,
    confidence,
    rules,
    overrides,
    activeOverride,
    isOpenNow: openState.isOpenNow,
    nextChangeAt: openState.nextChangeAt,
    nextOpening: openState.nextOpening,
    todaySummary: openState.todaySummary,
    specialScheduleActive: overrides.length > 0 || specialClauses.length > 0,
    needsManualReview,
    source: "official_text",
  };
}
