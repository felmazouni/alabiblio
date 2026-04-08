import type { CenterResponseMetaV1 } from "./scopes";

export type MobilityMode = "car" | "bus" | "bike" | "metro";

export type MobilityConfidence = "high" | "medium" | "low";
export type MobilityConfidenceSource =
  | "realtime"
  | "estimated"
  | "frequency"
  | "heuristic"
  | "fallback";

export type TransportNodeKind =
  | "emt_stop"
  | "bicimad_station"
  | "parking"
  | "metro_station";

export type MobilityRealtimeStatus =
  | "available"
  | "unconfigured"
  | "unavailable"
  | "error"
  | "empty";

export type MobilityModuleState =
  | "ok"
  | "partial"
  | "degraded_upstream"
  | "degraded_missing_anchor"
  | "unavailable";

export interface MobilityArrival {
  line: string;
  destination: string;
  minutes: number;
}

export interface MobilityAnchor {
  id: string | null;
  name: string;
  distance_m: number;
  lat: number | null;
  lon: number | null;
}

export interface MobilityOption {
  type: Exclude<MobilityMode, "car">;
  score: number;
  confidence: MobilityConfidence;
  confidence_source: MobilityConfidenceSource;
  origin: MobilityAnchor;
  destination: MobilityAnchor;
  realtime?: {
    status?: MobilityRealtimeStatus;
    arrivals?: MobilityArrival[];
    bikes_available?: number;
    docks_available?: number;
    source_timestamp?: string | null;
  };
  route_label: string | null;
  estimated_access_minutes: number | null;
  estimated_in_vehicle_minutes: number | null;
  estimated_total_minutes: number;
}

export interface MobilityHighlightV1 {
  mode: MobilityMode | "walk";
  label: string;
  confidence: MobilityConfidence;
  confidence_source: MobilityConfidenceSource;
}

export interface MobilityHighlightsV1 {
  primary: MobilityHighlightV1 | null;
  secondary: MobilityHighlightV1 | null;
}

export interface StaticTransportStopAnchorV1 {
  id: string;
  name: string;
  distance_m: number;
  lines: string[];
  lat: number | null;
  lon: number | null;
}

export interface StaticTransportStationAnchorV1 {
  id: string;
  name: string;
  distance_m: number;
  lines: string[];
  lat: number | null;
  lon: number | null;
}

export interface StaticBicimadAnchorV1 {
  id: string;
  name: string;
  distance_m: number;
  station_number: string | null;
  lat: number | null;
  lon: number | null;
}

export interface StaticParkingAnchorV1 {
  id: string;
  name: string;
  distance_m: number;
  lat: number | null;
  lon: number | null;
}

export interface StaticTransportAnchorsV1 {
  emt_destination_stops: StaticTransportStopAnchorV1[];
  metro_destination_stations: StaticTransportStationAnchorV1[];
  bicimad_destination_station: StaticBicimadAnchorV1 | null;
  parking_candidates: StaticParkingAnchorV1[];
}

export interface OriginResolvedV1 {
  available: boolean;
  kind: "geolocation" | "manual_address" | "preset_area" | null;
  label: string | null;
  lat: number | null;
  lon: number | null;
}

export interface OriginDependentLayerV1 {
  origin_coordinates: {
    lat: number;
    lon: number;
  } | null;
  origin_emt_stops: StaticTransportStopAnchorV1[];
  origin_metro_station: StaticTransportStationAnchorV1 | null;
  origin_bicimad_station: StaticBicimadAnchorV1 | null;
  estimated_car_eta_min: number | null;
  walking_eta_min: number | null;
}

export interface RealtimeLayerV1 {
  emt_next_arrivals: MobilityArrival[];
  emt_realtime_status: MobilityRealtimeStatus;
  emt_realtime_fetched_at: string | null;
  bicimad_bikes_available: number | null;
  bicimad_docks_available: number | null;
  bicimad_realtime_status: MobilityRealtimeStatus;
  bicimad_realtime_fetched_at: string | null;
  metro_realtime_status: MobilityRealtimeStatus;
}

export interface CarModuleV1 {
  state: MobilityModuleState;
  eta_min: number | null;
  ser_enabled: boolean;
  ser_zone_name: string | null;
  distance_m: number | null;
  confidence_source: MobilityConfidenceSource;
}

export interface BusModuleV1 {
  state: MobilityModuleState;
  selected_line: string | null;
  selected_destination: string | null;
  origin_stop: StaticTransportStopAnchorV1 | null;
  destination_stop: StaticTransportStopAnchorV1 | null;
  next_arrival_min: number | null;
  estimated_travel_min: number | null;
  estimated_total_min: number | null;
  realtime_status: MobilityRealtimeStatus;
  fetched_at: string | null;
  confidence_source: MobilityConfidenceSource;
}

export interface BikeModuleV1 {
  state: MobilityModuleState;
  eta_min: number | null;
  origin_station: StaticBicimadAnchorV1 | null;
  destination_station: StaticBicimadAnchorV1 | null;
  bikes_available: number | null;
  docks_available: number | null;
  realtime_status: MobilityRealtimeStatus;
  fetched_at: string | null;
  confidence_source: MobilityConfidenceSource;
}

export interface MetroModuleV1 {
  state: MobilityModuleState;
  eta_min: number | null;
  origin_station: StaticTransportStationAnchorV1 | null;
  destination_station: StaticTransportStationAnchorV1 | null;
  line_labels: string[];
  realtime_status: MobilityRealtimeStatus;
  confidence_source: MobilityConfidenceSource;
}

export interface CenterMobilitySummaryV1 {
  best_mode: MobilityMode | "walk" | null;
  best_time_minutes: number | null;
  confidence: MobilityConfidence;
  confidence_source: MobilityConfidenceSource;
  rationale: string[];
}

export interface CenterMobilityRuntimeV1 {
  origin: OriginResolvedV1;
  origin_dependent: OriginDependentLayerV1;
  realtime: RealtimeLayerV1;
  summary: CenterMobilitySummaryV1;
  highlights: MobilityHighlightsV1;
  modules: {
    car: CarModuleV1;
    bus: BusModuleV1;
    bike: BikeModuleV1;
    metro: MetroModuleV1;
  };
  degraded_modes: MobilityMode[];
  fetched_at: string;
}

export type CenterMobility = CenterMobilityRuntimeV1;

export interface EmtRealtimeArrival {
  stop_id: string;
  stop_name: string;
  line: string;
  destination: string;
  minutes: number;
}

export interface EmtRealtimePayload {
  status: MobilityRealtimeStatus;
  message: string | null;
  arrivals: EmtRealtimeArrival[];
}

export interface GetCenterMobilityResponse {
  meta: CenterResponseMetaV1<"origin_enriched", "center_mobility">;
  item: CenterMobilityRuntimeV1;
}

export interface CenterTopMobilityCardV1 {
  id: string;
  slug: string;
  kind: "study_room" | "library";
  kind_label: string;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  is_open_now: boolean | null;
  opens_today: string | null;
  closes_today: string | null;
  today_human_schedule: string | null;
  decision: {
    best_mode: MobilityMode | "walk" | null;
    best_time_minutes: number | null;
    distance_m: number | null;
    confidence: MobilityConfidence;
    confidence_source: MobilityConfidenceSource;
    rationale: string[];
    summary_label: string | null;
  };
  ser: {
    enabled: boolean;
    zone_name: string | null;
  } | null;
}

export interface CenterTopMobilityItem {
  slug: string;
  rank: number;
  center: CenterTopMobilityCardV1;
  item: CenterMobilityRuntimeV1;
}

export interface GetTopMobilityCentersResponse {
  meta: CenterResponseMetaV1<"origin_enriched", "top_mobility_centers">;
  items: CenterTopMobilityItem[];
  open_count: number;
}

export interface GetCenterMobilitySummaryResponse {
  meta: CenterResponseMetaV1<"origin_enriched", "center_mobility_summary">;
  slug: string;
  item: CenterMobilityRuntimeV1;
}
