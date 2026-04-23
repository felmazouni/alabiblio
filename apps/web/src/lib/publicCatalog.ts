import type {
  CenterRatingVoteInput,
  CenterCatalogItem,
  CenterKind,
  DataOrigin,
  PublicCatalogResponse,
  PublicCenterDetailResponse,
  PublicCenterRatingsResponse,
  PublicFiltersResponse,
  SortMode,
  TransportMode,
} from "@alabiblio/contracts";
import { useEffect, useMemo, useState } from "react";
import type { UserLocation } from "./userLocation";

export type TimeSlot = "morning" | "afternoon" | "evening";

export interface PublicFiltersState {
  query: string;
  kinds: CenterKind[];
  transportModes: TransportMode[];
  districts: string[];
  neighborhoods: string[];
  openNow: boolean;
  accessible: boolean;
  withWifi: boolean;
  withCapacity: boolean;
  withSer: boolean;
  radiusMeters: number;
  sort: SortMode;
  weekdays: number[];
  timeSlot: TimeSlot | null;
}

export const defaultPublicFilters: PublicFiltersState = {
  query: "",
  kinds: [],
  transportModes: [],
  districts: [],
  neighborhoods: [],
  openNow: false,
  accessible: false,
  withWifi: false,
  withCapacity: false,
  withSer: false,
  radiusMeters: 120000,
  sort: "relevance",
  weekdays: [],
  timeSlot: null,
};

const FILTER_PARAM_KEYS = [
  "q",
  "kinds",
  "transport",
  "district",
  "districts",
  "neighborhood",
  "neighborhoods",
  "open_now",
  "accessible",
  "wifi",
  "with_capacity",
  "ser",
  "with_ser",
  "radius_m",
  "sort",
  "days",
  "time_slot",
] as const;

const ALLOWED_KINDS: CenterKind[] = ["library", "study_room"];
const ALLOWED_TRANSPORT: TransportMode[] = [
  "metro",
  "cercanias",
  "metro_ligero",
  "emt_bus",
  "interurban_bus",
  "bicimad",
  "car",
];
const ALLOWED_SORT: SortMode[] = [
  "relevance",
  "distance",
  "closing",
  "capacity",
  "name",
];

function readCsvParams(searchParams: URLSearchParams, keys: string[]): string[] {
  const tokens = keys.flatMap((key) => {
    const allValues = searchParams.getAll(key);
    return allValues.flatMap((value) => value.split(",").map((item) => item.trim()));
  });

  return [...new Set(tokens.filter(Boolean))];
}

function readFlag(searchParams: URLSearchParams, keys: string[]): boolean {
  return keys.some((key) => {
    const value = searchParams.get(key);
    if (!value) {
      return false;
    }

    const normalized = value.trim().toLocaleLowerCase("es-ES");
    return normalized === "1" || normalized === "true" || normalized === "yes";
  });
}

function sortCsv(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "es-ES"));
}

export function parsePublicFiltersFromSearchParams(
  searchParams: URLSearchParams,
): PublicFiltersState {
  const query = (searchParams.get("q") ?? "").trim();
  const kinds = readCsvParams(searchParams, ["kinds"]).filter((value): value is CenterKind =>
    ALLOWED_KINDS.includes(value as CenterKind),
  );
  const transportModes = readCsvParams(searchParams, ["transport"]).filter(
    (value): value is TransportMode => ALLOWED_TRANSPORT.includes(value as TransportMode),
  );
  const districts = readCsvParams(searchParams, ["district", "districts"]);
  const neighborhoods = readCsvParams(searchParams, ["neighborhood", "neighborhoods"]);
  const openNow = readFlag(searchParams, ["open_now"]);
  const accessible = readFlag(searchParams, ["accessible"]);
  const withWifi = readFlag(searchParams, ["wifi"]);
  const withCapacity = readFlag(searchParams, ["with_capacity"]);
  const withSer = readFlag(searchParams, ["ser", "with_ser"]);
  const radiusRaw = Number(searchParams.get("radius_m") ?? "");
  const radiusMeters = Number.isFinite(radiusRaw)
    ? Math.max(5000, Math.min(120000, Math.round(radiusRaw)))
    : defaultPublicFilters.radiusMeters;

  const sortRaw = (searchParams.get("sort") ?? defaultPublicFilters.sort).trim();
  const sort = ALLOWED_SORT.includes(sortRaw as SortMode)
    ? (sortRaw as SortMode)
    : defaultPublicFilters.sort;

  const weekdaysRaw = readCsvParams(searchParams, ["days"]);
  const weekdays = weekdaysRaw
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const timeSlotRaw = (searchParams.get("time_slot") ?? "").trim();
  const timeSlot: TimeSlot | null =
    timeSlotRaw === "morning" || timeSlotRaw === "afternoon" || timeSlotRaw === "evening"
      ? timeSlotRaw
      : null;

  return {
    query,
    kinds,
    transportModes,
    districts,
    neighborhoods,
    openNow,
    accessible,
    withWifi,
    withCapacity,
    withSer,
    radiusMeters,
    sort,
    weekdays,
    timeSlot,
  };
}

export function writePublicFiltersToSearchParams(
  currentSearchParams: URLSearchParams,
  filters: PublicFiltersState,
): URLSearchParams {
  const params = new URLSearchParams(currentSearchParams);

  for (const key of FILTER_PARAM_KEYS) {
    params.delete(key);
  }

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.kinds.length > 0) {
    params.set("kinds", sortCsv(filters.kinds).join(","));
  }
  if (filters.transportModes.length > 0) {
    params.set("transport", sortCsv(filters.transportModes).join(","));
  }
  if (filters.districts.length > 0) {
    params.set("district", sortCsv(filters.districts).join(","));
  }
  if (filters.neighborhoods.length > 0) {
    params.set("neighborhood", sortCsv(filters.neighborhoods).join(","));
  }
  if (filters.openNow) {
    params.set("open_now", "1");
  }
  if (filters.accessible) {
    params.set("accessible", "1");
  }
  if (filters.withWifi) {
    params.set("wifi", "1");
  }
  if (filters.withCapacity) {
    params.set("with_capacity", "1");
  }
  if (filters.withSer) {
    params.set("ser", "1");
  }
  if (filters.radiusMeters !== defaultPublicFilters.radiusMeters) {
    params.set("radius_m", String(filters.radiusMeters));
  }

  params.set("sort", filters.sort);

  if (filters.weekdays.length > 0) {
    params.set("days", [...filters.weekdays].sort((a, b) => a - b).join(","));
  }

  if (filters.timeSlot) {
    params.set("time_slot", filters.timeSlot);
  }

  return params;
}

function buildQueryString(
  filters: PublicFiltersState,
  location: UserLocation | null,
  limit?: number,
): string {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (location) {
    params.set("lat", String(location.lat));
    params.set("lon", String(location.lon));
    params.set("radius_m", String(filters.radiusMeters));
  }

  if (filters.kinds.length > 0) {
    params.set("kinds", filters.kinds.join(","));
  }

  if (filters.transportModes.length > 0) {
    params.set("transport", filters.transportModes.join(","));
  }

  if (filters.districts.length > 0) {
    params.set("district", filters.districts.join(","));
  }

  if (filters.neighborhoods.length > 0) {
    params.set("neighborhood", filters.neighborhoods.join(","));
  }

  if (filters.openNow) {
    params.set("open_now", "1");
  }

  if (filters.accessible) {
    params.set("accessible", "1");
  }

  if (filters.withWifi) {
    params.set("wifi", "1");
  }

  if (filters.withCapacity) {
    params.set("with_capacity", "1");
  }

  if (filters.withSer) {
    params.set("ser", "1");
  }

  params.set("sort", filters.sort);

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function usePublicCatalog(filters: PublicFiltersState, location: UserLocation | null, limit?: number) {
  const [data, setData] = useState<PublicCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchJson<PublicCatalogResponse>(
      `/api/public/catalog${buildQueryString(filters, location, limit)}`,
      controller.signal,
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "catalog_fetch_failed",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, location, limit]);

  const topItems = useMemo(() => data?.items.slice(0, 3) ?? [], [data?.items]);

  return {
    loading,
    error,
    data,
    items: data?.items ?? [],
    metrics: data?.metrics ?? null,
    total: data?.total ?? 0,
    topItems,
  };
}

export function usePublicFilters(filters: PublicFiltersState, location: UserLocation | null) {
  const [data, setData] = useState<PublicFiltersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchJson<PublicFiltersResponse>(
      `/api/public/filters${buildQueryString(filters, location)}`,
      controller.signal,
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "filters_fetch_failed",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters, location]);

  return {
    loading,
    error,
    data,
  };
}

export function usePublicCenterDetail(
  slug: string | undefined,
  location: UserLocation | null,
) {
  const [data, setData] = useState<PublicCenterDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setLoading(false);
      setError("missing_slug");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const query = location
      ? `?lat=${location.lat}&lon=${location.lon}`
      : "";

    fetchJson<PublicCenterDetailResponse>(
      `/api/public/centers/${slug}${query}`,
      controller.signal,
    )
      .then((payload) => {
        setData(payload);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "center_fetch_failed",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug, location]);

  return {
    loading,
    error,
    data,
    center: data?.item.center ?? null,
  };
}

export type PublicCenterPresentation = CenterCatalogItem & {
  rankingPosition?: number;
};

const NORMALIZED_WEEKDAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

function normalizeScheduleText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addWeekdayRange(target: Set<number>, startDay: string, endDay: string) {
  const start = NORMALIZED_WEEKDAYS.indexOf(startDay as (typeof NORMALIZED_WEEKDAYS)[number]);
  const end = NORMALIZED_WEEKDAYS.indexOf(endDay as (typeof NORMALIZED_WEEKDAYS)[number]);

  if (start === -1 || end === -1 || start > end) {
    return;
  }

  for (let weekday = start; weekday <= end; weekday += 1) {
    target.add(weekday);
  }
}

function extractExpectedOpenDays(text: string): Set<number> | null {
  const normalized = normalizeScheduleText(text);

  if (/(todos? los dias|diariamente|de lunes a domingo)/.test(normalized)) {
    return new Set([0, 1, 2, 3, 4, 5, 6]);
  }

  const expectedDays = new Set<number>();

  for (const match of normalized.matchAll(
    /(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/g,
  )) {
    if (match[1] && match[2]) {
      addWeekdayRange(expectedDays, match[1], match[2]);
    }
  }

  if (/fines? de semana/.test(normalized)) {
    expectedDays.add(5);
    expectedDays.add(6);
  }

  return expectedDays.size > 0 ? expectedDays : null;
}

function extractExplicitClosedDays(text: string): Set<number> {
  const normalized = normalizeScheduleText(text);
  const closedDays = new Set<number>();

  for (const match of normalized.matchAll(
    /(lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?:\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo))?\s+cerrad[oa]s?/g,
  )) {
    if (match[1] && match[2]) {
      addWeekdayRange(closedDays, match[1], match[2]);
    } else if (match[1]) {
      addWeekdayRange(closedDays, match[1], match[1]);
    }
  }

  for (const match of normalized.matchAll(
    /cerrad[oa]s?\s+(?:los\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?:\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo))?/g,
  )) {
    if (match[1] && match[2]) {
      addWeekdayRange(closedDays, match[1], match[2]);
    } else if (match[1]) {
      addWeekdayRange(closedDays, match[1], match[1]);
    }
  }

  if (/fines? de semana\s+cerrad[oa]s?|cerrad[oa]s?\s+fines? de semana/.test(normalized)) {
    closedDays.add(5);
    closedDays.add(6);
  }

  return closedDays;
}

function structuredRuleWeekdays(schedule: CenterCatalogItem["schedule"]): Set<number> {
  return new Set(schedule.rules.map((rule) => rule.weekday));
}

function formatNormalizedTime(hours: string, minutes?: string): string {
  return `${hours.padStart(2, "0")}:${(minutes ?? "00").padStart(2, "0")}`;
}

function extractTimeRange(text: string): { opensAt: string; closesAt: string } | null {
  const normalized = normalizeScheduleText(text);
  const match = normalized.match(
    /(?:de\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:a|-)\s*(\d{1,2})(?::(\d{2}))?\s*horas?/,
  ) ?? normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(?:a|-)\s*(\d{1,2})(?::(\d{2}))/);

  if (!match?.[1] || !match[3]) {
    return null;
  }

  return {
    opensAt: formatNormalizedTime(match[1], match[2]),
    closesAt: formatNormalizedTime(match[3], match[4]),
  };
}

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export interface ScheduleWeekdayRow {
  weekday: number;
  label: string;
  status: "open" | "closed" | "unknown";
  entries: string[];
  source: "structured" | "official_text";
}

interface OfficialScheduleCandidate {
  rows: ScheduleWeekdayRow[];
  completeness: "full" | "partial";
  coveredDays: Set<number>;
  openDays: Set<number>;
  explicitClosedDays: Set<number>;
}

function buildRowsFromStructuredRules(
  schedule: Pick<CenterCatalogItem, "schedule">,
): ScheduleWeekdayRow[] {
  return WEEKDAY_LABELS.map((label, weekday) => {
    const entries = schedule.schedule.rules
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => `${rule.opensAt}–${rule.closesAt}`);

    return {
      weekday,
      label,
      status: entries.length > 0 ? "open" : "closed",
      entries,
      source: "structured",
    };
  });
}

function extractOfficialScheduleCandidate(text: string | null): OfficialScheduleCandidate | null {
  if (!text) {
    return null;
  }

  const openDays = extractExpectedOpenDays(text) ?? new Set<number>();
  const explicitClosedDays = extractExplicitClosedDays(text);
  const timeRange = extractTimeRange(text);

  if (openDays.size === 0 && explicitClosedDays.size === 0) {
    return null;
  }

  if (openDays.size > 0 && !timeRange) {
    return null;
  }

  const rows = WEEKDAY_LABELS.map((label, weekday) => {
    if (openDays.has(weekday) && timeRange) {
      return {
        weekday,
        label,
        status: "open" as const,
        entries: [`${timeRange.opensAt}–${timeRange.closesAt}`],
        source: "official_text" as const,
      };
    }

    if (explicitClosedDays.has(weekday)) {
      return {
        weekday,
        label,
        status: "closed" as const,
        entries: [],
        source: "official_text" as const,
      };
    }

    return {
      weekday,
      label,
      status: "unknown" as const,
      entries: [],
      source: "official_text" as const,
    };
  });

  const coveredDays = new Set<number>([...openDays, ...explicitClosedDays]);

  return {
    rows,
    completeness: coveredDays.size === 7 ? "full" : "partial",
    coveredDays,
    openDays,
    explicitClosedDays,
  };
}

function currentMadridWeekday(): number {
  const weekdayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  }).format(new Date());

  switch (weekdayLabel) {
    case "Mon": return 0;
    case "Tue": return 1;
    case "Wed": return 2;
    case "Thu": return 3;
    case "Fri": return 4;
    case "Sat": return 5;
    case "Sun": return 6;
    default: return 0;
  }
}

function todayRangeFromRows(rows: ScheduleWeekdayRow[]): string | null {
  const today = rows.find((row) => row.weekday === currentMadridWeekday());
  if (!today || today.status !== "open" || today.entries.length === 0) {
    return null;
  }

  const firstEntry = today.entries[0]?.match(/(\d{2}:\d{2})–(\d{2}:\d{2})/);
  if (!firstEntry?.[1] || !firstEntry[2]) {
    return null;
  }

  return `Hoy · ${firstEntry[1]} — ${firstEntry[2]}`;
}

function hasTrustedStructuredRules(center: Pick<CenterCatalogItem, "schedule">): boolean {
  return (
    center.schedule.rules.length > 0 &&
    !center.schedule.needsManualReview &&
    center.schedule.source !== "manual_review_pending" &&
    (center.schedule.confidence === "high" || center.schedule.confidence === "medium")
  );
}

function matchesShiftedOfficialPattern(
  officialCandidate: OfficialScheduleCandidate,
  structuredRows: ScheduleWeekdayRow[],
): boolean {
  const officialOpenRows = officialCandidate.rows.filter((row) => row.status === "open");
  const structuredOpenRows = structuredRows.filter((row) => row.status === "open");

  if (officialOpenRows.length === 0 || officialOpenRows.length !== structuredOpenRows.length) {
    return false;
  }

  return officialOpenRows.every((officialRow) => {
    const shiftedWeekday = officialRow.weekday + 1;
    const structuredRow = structuredRows[shiftedWeekday];
    return structuredRow?.status === "open" && structuredRow.entries.join(", ") === officialRow.entries.join(", ");
  });
}

/**
 * Returns a "Hoy · HH:MM — HH:MM" style label for the card/detail schedule pill.
 * Strategy (in priority order):
 *  1. Parse todaySummary (format "diadelasemana: HH:MM-HH:MM") → full range display.
 *  2. When isOpenNow=true and nextChangeAt is set → "Hoy · hasta HH:MM".
 *  3. Return null → caller falls back to scheduleLabel.
 */
export function todayRangeLabel(
  center: Pick<CenterCatalogItem, "schedule">,
): string | null {
  const { schedule } = center;

  // 1. todaySummary contains "diadelasemana: HH:MM-HH:MM" (e.g. "lunes: 09:00-22:00")
  if (schedule.todaySummary) {
    const rangeMatch = schedule.todaySummary.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    if (rangeMatch?.[1] && rangeMatch[2]) {
      return `Hoy · ${rangeMatch[1]} — ${rangeMatch[2]}`;
    }
  }

  // 2. Center is open: format close time from nextChangeAt (Madrid timezone)
  if (schedule.isOpenNow === true && schedule.nextChangeAt) {
    try {
      const close = new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(schedule.nextChangeAt));
      return `Hoy · hasta ${close}`;
    } catch {
      // ignore — fall through
    }
  }

  return null;
}

export function hasPotentialScheduleConflict(
  center: Pick<CenterCatalogItem, "schedule">,
): boolean {
  const officialText = center.schedule.displayText ?? center.schedule.rawText;
  const officialCandidate = extractOfficialScheduleCandidate(officialText);

  if (!officialCandidate || !hasTrustedStructuredRules(center)) {
    return false;
  }

  const structuredRows = buildRowsFromStructuredRules(center);

  if (matchesShiftedOfficialPattern(officialCandidate, structuredRows)) {
    return false;
  }

  return officialCandidate.rows.some((officialRow) => {
    if (!officialCandidate.coveredDays.has(officialRow.weekday)) {
      return false;
    }

    const structuredRow = structuredRows[officialRow.weekday];
    if (!structuredRow) {
      return false;
    }

    if (officialRow.status === "closed") {
      return structuredRow.status === "open";
    }

    if (officialRow.status === "open") {
      return structuredRow.status !== "open" || structuredRow.entries.join(", ") !== officialRow.entries.join(", ");
    }

    return false;
  });
}

export interface SchedulePresentationState {
  todayLabel: string;
  statusLabel: string;
  validationLabel: "Validado" | "Parcialmente validado" | "Pendiente de validación";
  validationHelpText: string | null;
  validationTone: "warning" | "provisional" | "verified";
  canRenderWeeklyTable: boolean;
  officialText: string | null;
  hasPotentialConflict: boolean;
  weeklyRows: ScheduleWeekdayRow[];
  weeklyRowsArePartial: boolean;
}

export function getSchedulePresentation(
  center: Pick<CenterCatalogItem, "schedule" | "scheduleLabel" | "headlineStatus">,
): SchedulePresentationState {
  const officialText = center.schedule.displayText ?? center.schedule.rawText;
  const officialCandidate = extractOfficialScheduleCandidate(officialText);
  const hasPotentialConflict = hasPotentialScheduleConflict(center);
  const lowConfidenceOrManualReview =
    center.schedule.confidence === "low" ||
    center.schedule.needsManualReview ||
    center.schedule.source === "manual_review_pending";
  const trustedStructuredRules = hasTrustedStructuredRules(center);

  let validationLabel: SchedulePresentationState["validationLabel"] = "Pendiente de validación";
  let validationHelpText: string | null = null;
  let validationTone: SchedulePresentationState["validationTone"] = "verified";
  let weeklyRows: ScheduleWeekdayRow[] = [];
  let weeklyRowsArePartial = false;
  let canRenderWeeklyTable = false;

  if (hasPotentialConflict) {
    validationLabel = "Pendiente de validación";
    validationHelpText = "El texto oficial y la normalización estructurada no coinciden. Se oculta la tabla hasta validar el horario.";
    validationTone = "warning";
  } else if (officialCandidate) {
    weeklyRows = officialCandidate.rows;
    weeklyRowsArePartial = officialCandidate.completeness === "partial";
    canRenderWeeklyTable = true;

    if (officialCandidate.completeness === "full" && !lowConfidenceOrManualReview) {
      validationLabel = "Validado";
      validationHelpText = "El texto oficial permite una lectura semanal completa y consistente.";
      validationTone = "verified";
    } else {
      validationLabel = "Parcialmente validado";
      validationHelpText = officialCandidate.completeness === "partial"
        ? "Se muestra solo la parte del horario que el texto oficial permite validar con claridad."
        : "El horario es usable, pero sigue pendiente de consolidación completa.";
      validationTone = "provisional";
    }
  } else if (trustedStructuredRules) {
    weeklyRows = buildRowsFromStructuredRules(center);
    canRenderWeeklyTable = true;

    if (center.schedule.confidence === "high") {
      validationLabel = "Validado";
      validationHelpText = "La tabla semanal está validada con estructura suficiente.";
      validationTone = "verified";
    } else {
      validationLabel = "Parcialmente validado";
      validationHelpText = "La tabla semanal es usable, pero sigue marcada como provisional.";
      validationTone = "provisional";
    }
  } else {
    validationLabel = "Pendiente de validación";
    validationHelpText = "No hay estructura suficiente para mostrar una tabla semanal fiable.";
    validationTone = "warning";
  }

  const todayLabel =
    todayRangeFromRows(weeklyRows) ??
    todayRangeLabel(center) ??
    (validationLabel === "Parcialmente validado"
      ? "Horario parcialmente validado"
      : validationLabel === "Pendiente de validación"
        ? "Horario pendiente de validación"
        : center.scheduleLabel);

  return {
    todayLabel,
    statusLabel:
      validationLabel === "Validado"
        ? center.headlineStatus
        : validationLabel === "Parcialmente validado"
          ? "Horario parcialmente validado"
          : "Horario pendiente de validación",
    validationLabel,
    validationHelpText,
    validationTone,
    canRenderWeeklyTable,
    officialText,
    hasPotentialConflict,
    weeklyRows,
    weeklyRowsArePartial,
  };
}

export interface BicimadAvailabilityResponse {
  stationId: string;
  bikesAvailable: number | null;
  docksAvailable: number | null;
  dataOrigin: DataOrigin;
  sourceLabel: string;
  fetchedAt: string | null;
  note: string | null;
}

export async function fetchBicimadAvailability(
  stationId: string,
  stationName?: string | null,
  signal?: AbortSignal,
): Promise<BicimadAvailabilityResponse> {
  const params = new URLSearchParams({ station_id: stationId });
  if (stationName && stationName.trim() !== "") {
    params.set("station_name", stationName.trim());
  }
  return fetchJson<BicimadAvailabilityResponse>(
    `/api/public/transport/bicimad/availability?${params.toString()}`,
    signal ?? new AbortController().signal,
  );
}

export interface CallejeroSuggestion {
  lat: number;
  lon: number;
  label: string;
}

export async function fetchCallejeroSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<CallejeroSuggestion[]> {
  if (query.trim().length < 3) {
    return [];
  }
  return fetchJson<CallejeroSuggestion[]>(
    `/api/public/callejero/autocomplete?q=${encodeURIComponent(query.trim())}`,
    signal ?? new AbortController().signal,
  );
}

export interface GoogleAuthConfigResponse {
  enabled: boolean;
  clientId: string | null;
}

export async function fetchGoogleAuthConfig(
  signal?: AbortSignal,
): Promise<GoogleAuthConfigResponse> {
  return fetchJson<GoogleAuthConfigResponse>(
    "/api/public/auth/google/config",
    signal ?? new AbortController().signal,
  );
}

export async function fetchCenterRatings(
  slug: string,
  idToken?: string | null,
  signal?: AbortSignal,
): Promise<PublicCenterRatingsResponse> {
  const response = await fetch(`/api/public/centers/${slug}/ratings`, {
    headers: {
      accept: "application/json",
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
    signal: signal ?? new AbortController().signal,
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json() as Promise<PublicCenterRatingsResponse>;
}

export async function submitCenterRating(
  slug: string,
  vote: CenterRatingVoteInput,
  idToken: string,
): Promise<PublicCenterRatingsResponse> {
  const response = await fetch(`/api/public/centers/${slug}/ratings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ idToken, vote }),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  return response.json() as Promise<PublicCenterRatingsResponse>;
}

export function useCenterRatings(slug: string | undefined, idToken?: string | null) {
  const [data, setData] = useState<PublicCenterRatingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setError("missing_slug");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCenterRatings(slug, idToken, controller.signal)
      .then((payload) => setData(payload))
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "ratings_fetch_failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug, idToken]);

  return {
    data,
    loading,
    error,
    refresh: async () => {
      if (!slug) {
        return;
      }
      const payload = await fetchCenterRatings(slug, idToken);
      setData(payload);
      setError(null);
    },
  };
}
