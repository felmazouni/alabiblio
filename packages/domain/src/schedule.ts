import type { ScheduleConfidence, ScheduleRule, ScheduleSummary } from "@alabiblio/contracts";
import { repairSourceText } from "./text";

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

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

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

function expandRange(start: number, end: number): number[] {
  if (start <= end) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  return [
    ...Array.from({ length: 7 - start }, (_, index) => start + index),
    ...Array.from({ length: end + 1 }, (_, index) => index),
  ];
}

function parseWeekdays(clause: string): number[] {
  const search = normalizeSearch(clause);

  if (search.includes("todos los dias")) {
    return [0, 1, 2, 3, 4, 5, 6];
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

  if (search.includes("fines de semana")) {
    return [0, 6];
  }

  const matches = [...search.matchAll(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)s?\b/g)];
  return [...new Set(matches.map((match) => DAY_INDEX[match[1] as keyof typeof DAY_INDEX]))];
}

function parseTimeRanges(clause: string): Array<{ opensAt: string; closesAt: string }> {
  const matches = [
    ...clause.matchAll(
      /(\d{1,2}(?::\d{2})?)\s*(?:horas|h)?\s*a\s*(\d{1,2}(?::\d{2})?)/gi,
    ),
  ];

  return matches.flatMap((match) => {
    const opensAt = match[1];
    const closesAt = match[2];

    if (!opensAt || !closesAt) {
      return [];
    }

    return [{ opensAt: normalizeTime(opensAt), closesAt: normalizeTime(closesAt) }];
  });
}

function hasSpecialMarkers(value: string): boolean {
  const search = normalizeSearch(value);
  return [
    "julio",
    "agosto",
    "septiembre",
    "verano",
    "examenes",
    "dias de cierre",
    "cerrado",
    "festivos",
    "fuera de este horario",
    "horario de secretaria",
  ].some((marker) => search.includes(marker));
}

function extractRegularRules(rawText: string): ScheduleRule[] {
  const clauses = rawText
    .split(/[.;]/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  const rules: ScheduleRule[] = [];

  for (const clause of clauses) {
    const weekdays = parseWeekdays(clause);
    const timeRanges = parseTimeRanges(clause);

    if (weekdays.length === 0 || timeRanges.length === 0) {
      continue;
    }

    for (const weekday of weekdays) {
      for (const range of timeRanges) {
        rules.push({
          weekday,
          opensAt: range.opensAt,
          closesAt: range.closesAt,
        });
      }
    }
  }

  return rules;
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

function isoInMadrid(parts: { year: string; month: string; day: string }, time: string): string {
  return `${parts.year}-${parts.month}-${parts.day}T${time}:00+01:00`;
}

function computeOpenState(rules: ScheduleRule[]): Pick<ScheduleSummary, "isOpenNow" | "nextChangeAt"> {
  if (rules.length === 0) {
    return {
      isOpenNow: null,
      nextChangeAt: null,
    };
  }

  const now = currentMadridDateParts();
  const currentMinutes = now.hour * 60 + now.minute;
  const todayRules = rules
    .filter((rule) => rule.weekday === now.weekday)
    .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt));

  const currentRule = todayRules.find(
    (rule) => currentMinutes >= toMinutes(rule.opensAt) && currentMinutes < toMinutes(rule.closesAt),
  );

  if (currentRule) {
    return {
      isOpenNow: true,
      nextChangeAt: isoInMadrid(now, currentRule.closesAt),
    };
  }

  const nextTodayRule = todayRules.find((rule) => currentMinutes < toMinutes(rule.opensAt));

  if (nextTodayRule) {
    return {
      isOpenNow: false,
      nextChangeAt: isoInMadrid(now, nextTodayRule.opensAt),
    };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = (now.weekday + offset) % 7;
    const nextRule = rules
      .filter((rule) => rule.weekday === weekday)
      .sort((left, right) => toMinutes(left.opensAt) - toMinutes(right.opensAt))[0];

    if (!nextRule) {
      continue;
    }

    const candidateDate = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const candidateParts = currentMadridDateParts(candidateDate);

    return {
      isOpenNow: false,
      nextChangeAt: isoInMadrid(candidateParts, nextRule.opensAt),
    };
  }

  return {
    isOpenNow: false,
    nextChangeAt: null,
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
      isOpenNow: null,
      nextChangeAt: null,
    };
  }

  const rules = extractRegularRules(repaired);
  const specialMarkers = hasSpecialMarkers(repaired);
  const confidence: ScheduleConfidence =
    rules.length === 0
      ? "needs_manual_review"
      : specialMarkers
        ? "medium"
        : "high";

  const openState = computeOpenState(rules);

  return {
    rawText: repaired,
    displayText: repaired,
    notesUnparsed: specialMarkers ? repaired : null,
    confidence,
    rules,
    isOpenNow: openState.isOpenNow,
    nextChangeAt: openState.nextChangeAt,
  };
}
