import type { CenterFeature } from "./features";
import type {
  MobilityConfidence,
  MobilityMode,
  StaticTransportAnchorsV1,
} from "./mobility";
import type { CenterResponseMetaV1 } from "./scopes";

export type CenterKind = "study_room" | "library";

export type CenterCoordStatus = "provided" | "missing" | "invalid";

export type ScheduleAudience = "sala" | "centro" | "secretaria" | "otros";

export type ScheduleAnomalySeverity = "info" | "warning" | "error";

export type ScheduleConfidenceLabel = "high" | "medium" | "low";

export type CenterSortBy = "recommended" | "distance" | "arrival" | "open_now";

export interface CenterSerInfo {
  enabled: boolean;
  zone_name: string | null;
  coverage_method: string | null;
  distance_m: number | null;
}

export interface CenterServicesV1 {
  wifi: boolean;
  sockets: boolean;
  accessible: boolean;
  open_air: boolean;
}

export interface UserLocationInput {
  lat: number;
  lon: number;
}

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
  has_sockets?: boolean;
  accessible?: boolean;
  open_air?: boolean;
  has_ser?: boolean;
  district?: string;
  neighborhood?: string;
  sort_by?: CenterSortBy;
  user_lat?: number;
  user_lon?: number;
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

export interface CenterDecisionSummary {
  best_mode: "walk" | MobilityMode | null;
  best_time_minutes: number | null;
  distance_m: number | null;
  confidence: MobilityConfidence;
  rationale: string[];
  summary_label: string | null;
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

export interface CenterListBaseItemV1 extends CenterScheduleSummary {
  id: string;
  slug: string;
  kind: CenterKind;
  kind_label: string;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  capacity_value: number | null;
  ser: {
    enabled: boolean;
    zone_name: string | null;
  } | null;
  services: CenterServicesV1;
}

export interface CenterDetailBaseV1 {
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
  notes_raw: string | null;
  ser: CenterSerInfo;
  services: CenterServicesV1;
  schedule: CenterSchedulePayload;
  static_transport: StaticTransportAnchorsV1;
  features: CenterFeature[];
  data_freshness: {
    center_updated_at: string | null;
    mobility_static_updated_at: string | null;
  };
  sources: CenterSourceSummary[];
}

export type CenterDecisionCardItem = CenterListBaseItemV1;
export type CenterListItem = CenterListBaseItemV1;
export type CenterDetailDecisionItem = CenterDetailBaseV1;
export type CenterDetailItem = CenterDetailBaseV1;

export interface ListCentersResponse {
  meta: CenterResponseMetaV1<"base_exploration", "list_centers">;
  items: CenterListBaseItemV1[];
  total: number;
  open_count: number;
  limit: number;
  offset: number;
  next_offset?: number | null;
}

export interface GetCenterDetailResponse {
  meta: CenterResponseMetaV1<"base_exploration", "center_detail">;
  item: CenterDetailBaseV1;
}

export interface GetCenterScheduleResponse {
  item: CenterSchedulePayload;
}
