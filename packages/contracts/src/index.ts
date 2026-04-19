export type CenterKind = "library" | "study_room";

export type DataOrigin =
  | "realtime"
  | "official_structured"
  | "official_text_parsed"
  | "heuristic"
  | "not_available";

export type ScheduleConfidence =
  | "high"
  | "medium"
  | "low"
  | "needs_manual_review";

export type SortMode =
  | "relevance"
  | "distance"
  | "closing"
  | "capacity"
  | "name";

export type TransportMode =
  | "metro"
  | "cercanias"
  | "metro_ligero"
  | "emt_bus"
  | "bicimad"
  | "car";

export interface ScheduleRule {
  weekday: number;
  opensAt: string;
  closesAt: string;
}

export type ScheduleOverrideKind =
  | "summer"
  | "exam_period"
  | "temporary_closure"
  | "reduced_hours"
  | "holiday_exceptions"
  | "special";

export interface ScheduleOverride {
  kind: ScheduleOverrideKind;
  label: string;
  rules: ScheduleRule[];
  fromDate: string | null;
  toDate: string | null;
  notes: string | null;
  closed: boolean;
}

export interface ScheduleSummary {
  rawText: string | null;
  displayText: string | null;
  notesUnparsed: string | null;
  confidence: ScheduleConfidence;
  rules: ScheduleRule[];
  overrides: ScheduleOverride[];
  activeOverride: ScheduleOverride | null;
  isOpenNow: boolean | null;
  nextChangeAt: string | null;
  nextOpening: string | null;
  todaySummary: string | null;
  specialScheduleActive: boolean;
  needsManualReview: boolean;
  source: "official_text" | "manual_review_pending";
}

export interface TransportMetrics {
  walkDistanceMeters: number | null;
  walkMinutes: number | null;
  waitMinutes: number | null;
  totalMinutes: number | null;
}

export interface TransportOption {
  id: string;
  mode: TransportMode;
  title: string;
  sourceLabel: string;
  dataOrigin: DataOrigin;
  destinationNodeId: string | null;
  destinationNodeName: string | null;
  summary: string;
  lines: string[];
  originLabel: string | null;
  destinationLabel: string | null;
  metrics: TransportMetrics;
  stationName: string | null;
  stopName: string | null;
  serZoneLabel: string | null;
  availabilityText: string | null;
  note: string | null;
  externalUrl: string | null;
  displayPriority: number;
  relevanceScore: number;
  fetchedAt: string | null;
  cacheTtlSeconds: number | null;
}

export interface DataQualityFlags {
  hasRealDistance: boolean;
  hasRealCapacity: boolean;
  hasStructuredTransport: boolean;
  hasRealtimeTransport: boolean;
  hasIncidents: boolean;
  hasRatings: boolean;
  needsManualScheduleReview: boolean;
}

export interface CenterCatalogItem {
  id: string;
  slug: string;
  kind: CenterKind;
  kindLabel: string;
  name: string;
  addressLine: string | null;
  district: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  accessibility: boolean;
  accessibilityOrigin: DataOrigin;
  wifi: boolean;
  wifiOrigin: DataOrigin;
  openAir: boolean;
  capacityValue: number | null;
  servicesText: string | null;
  transportText: string | null;
  sourceCode: string;
  ratingAverage: number | null;
  ratingCount: number;
  schedule: ScheduleSummary;
  ratingOrigin: DataOrigin;
  headlineStatus: "Abierta" | "Cerrada" | "Revision manual";
  scheduleLabel: string;
  occupancyLabel: string | null;
  capacityOrigin: DataOrigin;
  distanceMeters: number | null;
  distanceLabel: string | null;
  distanceOrigin: DataOrigin;
  mapsUrl: string | null;
  operationalNote: string | null;
  operationalNoteOrigin: DataOrigin;
  transportOptions: TransportOption[];
  serZoneLabel: string | null;
  rankingScore: number;
  rankingReasons: string[];
  dataQuality: DataQualityFlags;
}

export interface PublicCatalogMetrics {
  totalCenters: number;
  openNowCount: number;
  totalCapacity: number | null;
  capacityKnownCount: number;
}

export interface PublicCatalogQuery {
  q?: string;
  lat?: number;
  lon?: number;
  radiusMeters?: number;
  kinds?: CenterKind[];
  transportModes?: TransportMode[];
  openNow?: boolean;
  accessible?: boolean;
  withWifi?: boolean;
  withCapacity?: boolean;
  sort?: SortMode;
  limit?: number;
}

export interface PublicCatalogResponse {
  generatedAt: string;
  sourceMode: "d1" | "live";
  total: number;
  metrics: PublicCatalogMetrics;
  appliedQuery: Required<PublicCatalogQuery>;
  items: CenterCatalogItem[];
}

export interface PublicCenterDetail {
  center: CenterCatalogItem;
  contact: {
    phone: string | null;
    email: string | null;
    websiteUrl: string | null;
  };
  location: {
    latitude: number | null;
    longitude: number | null;
    addressLine: string | null;
    district: string | null;
    neighborhood: string | null;
    postalCode: string | null;
  };
  equipment: Array<{
    key: "wifi" | "accessibility" | "capacity";
    label: string;
    available: boolean;
    value: string | null;
    origin: DataOrigin;
  }>;
  flags: DataQualityFlags;
}

export interface PublicCenterDetailResponse {
  generatedAt: string;
  sourceMode: "d1" | "live";
  item: PublicCenterDetail;
}

export interface PublicFiltersResponse {
  generatedAt: string;
  totalResults: number;
  ratingsAvailable: boolean;
  availableKinds: Array<{
    kind: CenterKind;
    label: string;
    count: number;
  }>;
  availableTransportModes: Array<{
    mode: TransportMode;
    label: string;
    count: number;
  }>;
  availableSortModes: Array<{
    value: SortMode;
    label: string;
  }>;
  canUseDistanceFilter: boolean;
}
