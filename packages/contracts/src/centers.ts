export type CenterKind = "study_room" | "library";

export type CenterCoordStatus = "provided" | "missing" | "invalid";

export type ScheduleAudience = "sala" | "centro" | "secretaria" | "otros";

export type ScheduleAnomalySeverity = "info" | "warning" | "error";

export type ScheduleConfidenceLabel = "high" | "medium" | "low";

export type ScheduleAnomalyCode =
  | "schedule_missing"
  | "open_air_without_explicit_schedule"
  | "schedule_requires_manual_contact"
  | "seasonal_rules_detected"
  | "seasonal_july_august_detected"
  | "exam_extension_detected"
  | "multiple_primary_audiences"
  | "regular_rules_not_parsed"
  | "holiday_without_explicit_dates"
  | "split_schedule_detected"
  | "partial_override_without_open_range";

export interface ListCentersQuery {
  kind?: CenterKind;
  limit?: number;
  offset?: number;
  q?: string;
  open_now?: boolean;
  has_wifi?: boolean;
  accessible?: boolean;
  open_air?: boolean;
}

export interface CenterRecord {
  id: string;
  slug: string;
  kind: CenterKind;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  postal_code: string | null;
  municipality: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  raw_lat: number | null;
  raw_lon: number | null;
  lat: number | null;
  lon: number | null;
  coord_status: CenterCoordStatus;
  coord_resolution_method: string | null;
  capacity_value: number | null;
  capacity_text: string | null;
  wifi_flag: boolean;
  sockets_flag: boolean;
  accessibility_flag: boolean;
  open_air_flag: boolean;
  notes_raw: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRegularRule {
  audience: ScheduleAudience;
  weekday: number;
  opens_at: string;
  closes_at: string;
  sequence: number;
}

export interface ScheduleHolidayClosure {
  audience: ScheduleAudience;
  month: number;
  day: number;
  label: string;
}

export interface SchedulePartialDayOverride {
  audience: ScheduleAudience;
  month: number;
  day: number;
  opens_at: string;
  closes_at: string;
  sequence: number;
  label: string;
}

export interface ScheduleParseAnomaly {
  code: ScheduleAnomalyCode;
  severity: ScheduleAnomalySeverity;
  field_name: string | null;
  raw_fragment: string | null;
  message: string;
}

export interface CenterScheduleSummary {
  is_open_now: boolean | null;
  next_change_at: string | null;
  today_human_schedule: string | null;
  schedule_confidence: number | null;
  schedule_confidence_label: ScheduleConfidenceLabel;
  opens_today: string | null;
  closes_today: string | null;
}

export interface CenterListItem extends CenterScheduleSummary {
  id: string;
  slug: string;
  kind: CenterKind;
  kind_label: string;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  contact_summary: string | null;
  lat: number | null;
  lon: number | null;
  coord_status: CenterCoordStatus;
  capacity_text: string | null;
  wifi_flag: boolean;
  sockets_flag: boolean;
  accessibility_flag: boolean;
  open_air_flag: boolean;
  source_last_updated: string | null;
  data_freshness: string | null;
}

export interface ListCentersResponse {
  items: CenterListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CenterSourceSummary {
  code: string;
  name: string;
  external_id: string;
}

export interface CenterSchedulePayload extends CenterScheduleSummary {
  raw_schedule_text: string | null;
  notes_raw: string | null;
  regular_rules: ScheduleRegularRule[];
  holiday_closures: ScheduleHolidayClosure[];
  partial_day_overrides: SchedulePartialDayOverride[];
  warnings: ScheduleParseAnomaly[];
  source_last_updated: string | null;
  data_freshness: string | null;
}

export interface CenterDetailItem {
  id: string;
  slug: string;
  kind: CenterKind;
  kind_label: string;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  postal_code: string | null;
  municipality: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  contact_summary: string | null;
  lat: number | null;
  lon: number | null;
  coord_status: CenterCoordStatus;
  capacity_value: number | null;
  capacity_text: string | null;
  wifi_flag: boolean;
  sockets_flag: boolean;
  accessibility_flag: boolean;
  open_air_flag: boolean;
  notes_raw: string | null;
  source_last_updated: string | null;
  data_freshness: string | null;
  sources: CenterSourceSummary[];
  schedule: CenterSchedulePayload;
}

export interface GetCenterDetailResponse {
  item: CenterDetailItem;
}

export interface GetCenterScheduleResponse {
  item: CenterSchedulePayload;
}
