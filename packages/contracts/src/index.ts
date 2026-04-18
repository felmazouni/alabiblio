export type CenterKind = "library" | "study_room";

export type ReliabilityLevel = "realtime" | "static_estimate" | "heuristic";

export type ScheduleConfidence =
  | "high"
  | "medium"
  | "low"
  | "needs_manual_review";

export interface ScheduleRule {
  weekday: number;
  opensAt: string;
  closesAt: string;
}

export interface ScheduleSummary {
  rawText: string | null;
  displayText: string | null;
  notesUnparsed: string | null;
  confidence: ScheduleConfidence;
  rules: ScheduleRule[];
  isOpenNow: boolean | null;
  nextChangeAt: string | null;
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
  wifi: boolean;
  openAir: boolean;
  capacityValue: number | null;
  servicesText: string | null;
  transportText: string | null;
  sourceCode: string;
  ratingAverage: number | null;
  ratingCount: number;
  schedule: ScheduleSummary;
}

export interface PublicCatalogResponse {
  generatedAt: string;
  sourceMode: "d1" | "live";
  total: number;
  items: CenterCatalogItem[];
}
