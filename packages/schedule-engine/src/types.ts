import type {
  CenterKind,
  ScheduleAudience,
  ScheduleHolidayClosure,
  ScheduleParseAnomaly,
  SchedulePartialDayOverride,
  ScheduleRegularRule,
} from "@alabiblio/contracts/centers";

export interface ScheduleBlock {
  audience: ScheduleAudience;
  label: string | null;
  text: string;
}

export interface ParsedSchedule {
  open_air_flag: boolean;
  regular_rules: ScheduleRegularRule[];
  holiday_closures: ScheduleHolidayClosure[];
  partial_day_overrides: SchedulePartialDayOverride[];
  anomalies: ScheduleParseAnomaly[];
  parse_confidence: number | null;
  normalized_summary: string | null;
}

export interface ActiveScheduleRecord {
  schedule_version_id: number;
  raw_schedule_text: string | null;
  schedule_confidence: number | null;
  open_air_flag: boolean;
  regular_rules: ScheduleRegularRule[];
  holiday_closures: ScheduleHolidayClosure[];
  partial_day_overrides: SchedulePartialDayOverride[];
  warnings: ScheduleParseAnomaly[];
}

export interface ScheduleRuntimeOptions {
  now?: Date;
  timeZone?: string;
}

export interface ParsedScheduleContext {
  kind: CenterKind;
  rawScheduleText: string | null;
  openAirFlag: boolean;
}
