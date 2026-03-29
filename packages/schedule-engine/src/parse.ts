import type {
  CenterKind,
  ScheduleAudience,
  ScheduleHolidayClosure,
  ScheduleParseAnomaly,
  SchedulePartialDayOverride,
  ScheduleRegularRule,
} from "@alabiblio/contracts/centers";
import type { ParsedSchedule, ParsedScheduleContext, ScheduleBlock } from "./types";

const SPANISH_DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
] as const;

const DAY_TO_INDEX: Record<(typeof SPANISH_DAY_NAMES)[number], number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const MONTH_TO_INDEX: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}+/gu, "");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearch(value: string): string {
  return stripAccents(normalizeWhitespace(value)).toLowerCase();
}

function createAnomaly(
  code: string,
  severity: "info" | "warning" | "error",
  message: string,
  rawFragment: string | null,
  fieldName: string | null = "raw_schedule_text",
): ScheduleParseAnomaly {
  return {
    code,
    severity,
    field_name: fieldName,
    raw_fragment: rawFragment,
    message,
  };
}

function inferPrimaryAudience(kind: CenterKind): ScheduleAudience {
  return kind === "study_room" ? "sala" : "centro";
}

function classifyBlockAudience(
  label: string | null,
  text: string,
  kind: CenterKind,
): ScheduleAudience {
  const haystack = normalizeSearch(`${label ?? ""} ${text}`);

  if (haystack.includes("secretaria")) {
    return "secretaria";
  }

  if (haystack.includes("horario especial")) {
    return "otros";
  }

  if (haystack.includes("centro")) {
    return "centro";
  }

  return inferPrimaryAudience(kind);
}

export function segmentScheduleBlocks(
  rawScheduleText: string | null,
  kind: CenterKind,
): ScheduleBlock[] {
  const text = normalizeWhitespace(rawScheduleText ?? "");

  if (text === "") {
    return [];
  }

  const headingRegex =
    /(Horario(?:\s+de\s+funcionamiento)?(?:\s+del\s+centro)?|Horario\s+del\s+centro|Horario\s+de\s+secretar(?:ia|ía)|Horario\s+especial(?:\s+examenes|\s+exámenes)?)\s*:/gi;
  const blocks: ScheduleBlock[] = [];
  const matches = [...text.matchAll(headingRegex)];

  if (matches.length === 0) {
    return [
      {
        audience: classifyBlockAudience(null, text, kind),
        label: null,
        text,
      },
    ];
  }

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];

    if (!match) {
      continue;
    }

    const start = match.index ?? 0;
    const bodyStart = start + match[0].length;
    const nextStart = matches[index + 1]?.index ?? text.length;
    const body = normalizeWhitespace(text.slice(bodyStart, nextStart));
    const label = normalizeWhitespace(match[1] ?? match[0]);

    if (body === "") {
      continue;
    }

    blocks.push({
      audience: classifyBlockAudience(label, body, kind),
      label,
      text: body,
    });
  }

  return blocks;
}

function extractClauses(text: string): string[] {
  return text
    .split(/[.;]/)
    .map((clause) => normalizeWhitespace(clause))
    .filter((clause) => clause !== "");
}

function normalizeTime(raw: string): string {
  const [hoursPart, minutesPart] = raw.split(":");
  const hours = (hoursPart ?? "00").padStart(2, "0");
  const minutes = (minutesPart ?? "00").padStart(2, "0");
  return `${hours}:${minutes}`;
}

function extractTimeRanges(clause: string): Array<{ opens_at: string; closes_at: string }> {
  const ranges = [...clause.matchAll(/(\d{1,2}(?::\d{2})?)\s*(?:h(?:oras?)?(?:\s*a\.m\.)?)?\s*a\s*(\d{1,2}(?::\d{2})?)/gi)];

  return ranges.flatMap((match) => {
    const opensAt = match[1];
    const closesAt = match[2];

    if (!opensAt || !closesAt) {
      return [];
    }

    return [
      {
        opens_at: normalizeTime(opensAt),
        closes_at: normalizeTime(closesAt),
      },
    ];
  });
}

function expandDayRange(start: number, end: number): number[] {
  if (start <= end) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  return [...Array.from({ length: 7 - start }, (_, index) => start + index), ...Array.from({ length: end + 1 }, (_, index) => index)];
}

function extractWeekdays(clause: string): number[] {
  const search = normalizeSearch(clause);
  const rangeMatch = search.match(
    /(?:de\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/i,
  );

  if (rangeMatch?.[1] && rangeMatch[2]) {
    return expandDayRange(
      DAY_TO_INDEX[rangeMatch[1] as keyof typeof DAY_TO_INDEX],
      DAY_TO_INDEX[rangeMatch[2] as keyof typeof DAY_TO_INDEX],
    );
  }

  const matches = [...search.matchAll(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)s?\b/g)].map(
    (match) => DAY_TO_INDEX[match[1] as keyof typeof DAY_TO_INDEX],
  );

  return [...new Set(matches)];
}

function parseMonthDayPairs(clause: string): Array<{ month: number; day: number }> {
  const search = normalizeSearch(clause);
  const results: Array<{ month: number; day: number }> = [];
  const pattern =
    /((?:\d{1,2}\s*(?:,|\sy\s)?\s*)+)(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/gi;

  for (const match of search.matchAll(pattern)) {
    const monthName = match[2];
    const dayChunk = match[1];

    if (!monthName || !dayChunk) {
      continue;
    }

    const month = MONTH_TO_INDEX[monthName];
    const days = [...dayChunk.matchAll(/\d{1,2}/g)].map((item) => Number(item[0]));

    if (!month) {
      continue;
    }

    for (const day of days) {
      if (day >= 1 && day <= 31) {
        results.push({ month, day });
      }
    }
  }

  return results;
}

function buildRegularRules(
  block: ScheduleBlock,
  anomalies: ScheduleParseAnomaly[],
): ScheduleRegularRule[] {
  const rules: ScheduleRegularRule[] = [];
  const clauses = extractClauses(block.text);

  for (const clause of clauses) {
    const search = normalizeSearch(clause);

    if (Object.keys(MONTH_TO_INDEX).some((month) => search.includes(month))) {
      continue;
    }

    if (!search.match(/\d{1,2}(?::\d{2})?\s*a\s*\d{1,2}(?::\d{2})?/)) {
      continue;
    }

    const weekdays = extractWeekdays(clause);
    if (weekdays.length === 0) {
      continue;
    }

    const ranges = extractTimeRanges(clause);
    if (ranges.length === 0) {
      continue;
    }

    if (ranges.length > 1) {
      anomalies.push(
        createAnomaly(
          "split_schedule_detected",
          "info",
          "Se detecto un horario partido.",
          clause,
        ),
      );
    }

    for (const weekday of weekdays) {
      ranges.forEach((range, index) => {
        rules.push({
          audience: block.audience,
          weekday,
          opens_at: range.opens_at,
          closes_at: range.closes_at,
          sequence: index + 1,
        });
      });
    }
  }

  return rules;
}

function buildHolidayClosures(
  block: ScheduleBlock,
  anomalies: ScheduleParseAnomaly[],
): ScheduleHolidayClosure[] {
  const closures: ScheduleHolidayClosure[] = [];

  for (const clause of extractClauses(block.text)) {
    const search = normalizeSearch(clause);

    if (!search.includes("cerrad")) {
      continue;
    }

    const pairs = parseMonthDayPairs(clause);
    if (pairs.length === 0) {
      if (search.includes("festiv")) {
        anomalies.push(
          createAnomaly(
            "unspecified_holiday_reference",
            "warning",
            "Se mencionan festivos sin fechas explicitas.",
            clause,
          ),
        );
      }

      continue;
    }

    for (const pair of pairs) {
      closures.push({
        audience: block.audience,
        month: pair.month,
        day: pair.day,
        label: clause,
      });
    }
  }

  return closures;
}

function buildPartialDayOverrides(
  block: ScheduleBlock,
  anomalies: ScheduleParseAnomaly[],
): SchedulePartialDayOverride[] {
  const overrides: SchedulePartialDayOverride[] = [];

  for (const clause of extractClauses(block.text)) {
    const pairs = parseMonthDayPairs(clause);

    if (pairs.length === 0) {
      continue;
    }

    const search = normalizeSearch(clause);
    if (search.includes("cerrad")) {
      continue;
    }

    const ranges = extractTimeRanges(clause);

    if (ranges.length === 0) {
      if (search.includes("hasta las")) {
        anomalies.push(
          createAnomaly(
            "partial_override_without_open_range",
            "warning",
            "Se detecto un horario parcial sin rango completo de apertura.",
            clause,
          ),
        );
      }

      continue;
    }

    for (const pair of pairs) {
      ranges.forEach((range, index) => {
        overrides.push({
          audience: block.audience,
          month: pair.month,
          day: pair.day,
          opens_at: range.opens_at,
          closes_at: range.closes_at,
          sequence: index + 1,
          label: clause,
        });
      });
    }
  }

  return overrides;
}

function buildAnomalies(
  context: ParsedScheduleContext,
  blocks: ScheduleBlock[],
  regularRules: ScheduleRegularRule[],
  existing: ScheduleParseAnomaly[],
): ScheduleParseAnomaly[] {
  const anomalies = [...existing];
  const text = normalizeSearch(context.rawScheduleText ?? "");

  if ((context.rawScheduleText ?? "").trim() === "") {
    anomalies.push(
      createAnomaly(
        "schedule_missing",
        "error",
        "No hay horario raw disponible.",
        null,
      ),
    );
    return anomalies;
  }

  if (text === "al aire libre") {
    anomalies.push(
      createAnomaly(
        "open_air_without_explicit_schedule",
        "warning",
        "Centro al aire libre sin rango horario estructurado.",
        context.rawScheduleText,
      ),
    );
  }

  if (text.includes("consultar telefonicamente")) {
    anomalies.push(
      createAnomaly(
        "schedule_requires_manual_contact",
        "error",
        "El horario remite a consulta telefonica y no puede estructurarse con fiabilidad.",
        context.rawScheduleText,
      ),
    );
  }

  if (text.includes("julio") || text.includes("agosto")) {
    anomalies.push(
      createAnomaly(
        "seasonal_rules_unparsed",
        "warning",
        "Se detectan reglas estacionales no estructuradas todavia.",
        context.rawScheduleText,
      ),
    );
  }

  if (text.includes("examen")) {
    anomalies.push(
      createAnomaly(
        "exam_extension_unparsed",
        "warning",
        "Se detecta ampliacion por examenes aun no estructurada.",
        context.rawScheduleText,
      ),
    );
  }

  const primaryAudiences = new Set(
    blocks
      .filter((block) => block.audience === "sala" || block.audience === "centro")
      .map((block) => block.audience),
  );

  if (primaryAudiences.size > 1) {
    anomalies.push(
      createAnomaly(
        "multiple_primary_audiences",
        "warning",
        "Se detectan bloques multiples de horario potencialmente incompatibles.",
        context.rawScheduleText,
      ),
    );
  }

  if (regularRules.length === 0 && !context.openAirFlag) {
    anomalies.push(
      createAnomaly(
        "regular_rules_not_parsed",
        "error",
        "No se han podido extraer reglas regulares fiables.",
        context.rawScheduleText,
      ),
    );
  }

  return anomalies;
}

function computeConfidence(anomalies: ScheduleParseAnomaly[], regularRulesCount: number): number | null {
  if (anomalies.some((item) => item.code === "schedule_missing")) {
    return null;
  }

  let confidence = regularRulesCount > 0 ? 0.92 : 0.25;

  for (const anomaly of anomalies) {
    if (anomaly.severity === "error") {
      confidence -= 0.35;
    } else if (anomaly.severity === "warning") {
      confidence -= 0.14;
    } else {
      confidence -= 0.04;
    }
  }

  if (confidence < 0) {
    return 0;
  }

  if (confidence > 1) {
    return 1;
  }

  return Number(confidence.toFixed(2));
}

export function parseSchedule(context: ParsedScheduleContext): ParsedSchedule {
  const blocks = segmentScheduleBlocks(context.rawScheduleText, context.kind);
  const openAirFlag =
    context.openAirFlag || normalizeSearch(context.rawScheduleText ?? "").includes("al aire libre");
  const anomalies: ScheduleParseAnomaly[] = [];
  const regularRules = blocks.flatMap((block) => buildRegularRules(block, anomalies));
  const holidayClosures = blocks.flatMap((block) => buildHolidayClosures(block, anomalies));
  const partialDayOverrides = blocks.flatMap((block) => buildPartialDayOverrides(block, anomalies));
  const finalAnomalies = buildAnomalies(context, blocks, regularRules, anomalies);

  return {
    open_air_flag: openAirFlag,
    regular_rules: regularRules,
    holiday_closures: holidayClosures,
    partial_day_overrides: partialDayOverrides,
    anomalies: finalAnomalies,
    parse_confidence: computeConfidence(finalAnomalies, regularRules.length),
    normalized_summary: JSON.stringify({
      block_count: blocks.length,
      audiences: [...new Set(blocks.map((block) => block.audience))],
    }),
  };
}
