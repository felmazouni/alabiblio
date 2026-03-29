import type {
  CenterSchedulePayload,
  ScheduleHolidayClosure,
  SchedulePartialDayOverride,
  ScheduleRegularRule,
} from "@alabiblio/contracts/centers";
import type { ActiveScheduleRecord, ScheduleRuntimeOptions } from "./types";

type MadridDateParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

type TimeRange = {
  opens_at: string;
  closes_at: string;
  sequence: number;
};

const WEEKDAY_ORDER = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function getMadridParts(date: Date, timeZone: string): MadridDateParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });

  const entries = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(entries.year),
    month: Number(entries.month),
    day: Number(entries.day),
    weekday: WEEKDAY_ORDER.indexOf(
      (entries.weekday ?? "sun").toLowerCase() as (typeof WEEKDAY_ORDER)[number],
    ),
    hour: Number(entries.hour),
    minute: Number(entries.minute),
  };
}

function timeToMinutes(time: string): number {
  const [hoursText, minutesText] = time.split(":");
  return Number(hoursText) * 60 + Number(minutesText);
}

function buildTodayRanges(
  regularRules: ScheduleRegularRule[],
  partialOverrides: SchedulePartialDayOverride[],
  weekday: number,
  month: number,
  day: number,
): TimeRange[] {
  const overrides = partialOverrides
    .filter((rule) => rule.month === month && rule.day === day)
    .sort((left, right) => left.sequence - right.sequence);

  if (overrides.length > 0) {
    return overrides.map((rule) => ({
      opens_at: rule.opens_at,
      closes_at: rule.closes_at,
      sequence: rule.sequence,
    }));
  }

  return regularRules
    .filter((rule) => rule.weekday === weekday)
    .sort((left, right) => left.sequence - right.sequence)
    .map((rule) => ({
      opens_at: rule.opens_at,
      closes_at: rule.closes_at,
      sequence: rule.sequence,
    }));
}

function hasClosureToday(
  closures: ScheduleHolidayClosure[],
  month: number,
  day: number,
): boolean {
  return closures.some((closure) => closure.month === month && closure.day === day);
}

function formatTodayHumanSchedule(
  ranges: TimeRange[],
  closedByHoliday: boolean,
  hasStructuredRules: boolean,
  scheduleConfidence: number | null,
): string | null {
  if (closedByHoliday) {
    return "Cerrado hoy";
  }

  if (ranges.length === 0) {
    if (hasStructuredRules && (scheduleConfidence === null || scheduleConfidence >= 0.4)) {
      return "Cerrado hoy";
    }

    return null;
  }

  return ranges.map((range) => `${range.opens_at}-${range.closes_at}`).join(" · ");
}

function formatLocalChangeAt(parts: MadridDateParts, time: string): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${time}:00`;
}

export function buildSchedulePayload(
  schedule: ActiveScheduleRecord | null,
  options?: ScheduleRuntimeOptions,
): CenterSchedulePayload {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? "Europe/Madrid";

  if (!schedule) {
    return {
      raw_schedule_text: null,
      regular_rules: [],
      holiday_closures: [],
      partial_day_overrides: [],
      warnings: [],
      schedule_confidence: null,
      is_open_now: null,
      next_change_at: null,
      today_human_schedule: null,
      opens_today: null,
      closes_today: null,
    };
  }

  const parts = getMadridParts(now, timeZone);
  const closedByHoliday = hasClosureToday(
    schedule.holiday_closures,
    parts.month,
    parts.day,
  );
  const ranges = closedByHoliday
    ? []
    : buildTodayRanges(
        schedule.regular_rules,
        schedule.partial_day_overrides,
        parts.weekday,
        parts.month,
        parts.day,
      );
  const currentMinutes = parts.hour * 60 + parts.minute;
  const currentRange =
    ranges.find((range) => {
      const opensAt = timeToMinutes(range.opens_at);
      const closesAt = timeToMinutes(range.closes_at);
      return currentMinutes >= opensAt && currentMinutes < closesAt;
    }) ?? null;
  const nextRange =
    ranges.find((range) => currentMinutes < timeToMinutes(range.opens_at)) ?? null;

  return {
    raw_schedule_text: schedule.raw_schedule_text,
    regular_rules: schedule.regular_rules,
    holiday_closures: schedule.holiday_closures,
    partial_day_overrides: schedule.partial_day_overrides,
    warnings: schedule.warnings,
    schedule_confidence: schedule.schedule_confidence,
    is_open_now:
      schedule.schedule_confidence !== null && schedule.schedule_confidence < 0.3
        ? null
        : currentRange !== null,
    next_change_at:
      currentRange !== null
        ? formatLocalChangeAt(parts, currentRange.closes_at)
        : nextRange !== null
          ? formatLocalChangeAt(parts, nextRange.opens_at)
          : null,
    today_human_schedule: formatTodayHumanSchedule(
      ranges,
      closedByHoliday,
      schedule.regular_rules.length > 0,
      schedule.schedule_confidence,
    ),
    opens_today: ranges[0]?.opens_at ?? null,
    closes_today: ranges.length > 0 ? ranges[ranges.length - 1]?.closes_at ?? null : null,
  };
}
