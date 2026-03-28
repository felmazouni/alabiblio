export type CenterKind = "study_room" | "library";

export type CenterCoordStatus = "provided" | "missing" | "invalid";

export interface ListCentersQuery {
  kind?: CenterKind;
  limit?: number;
  offset?: number;
  q?: string;
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

export interface CenterListItem {
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
  lat: number | null;
  lon: number | null;
  coord_status: CenterCoordStatus;
  capacity_text: string | null;
  wifi_flag: boolean;
  sockets_flag: boolean;
  accessibility_flag: boolean;
  open_air_flag: boolean;
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
  lat: number | null;
  lon: number | null;
  coord_status: CenterCoordStatus;
  capacity_value: number | null;
  capacity_text: string | null;
  wifi_flag: boolean;
  sockets_flag: boolean;
  accessibility_flag: boolean;
  open_air_flag: boolean;
  raw_schedule_text: string | null;
  notes_raw: string | null;
  sources: CenterSourceSummary[];
}

export interface GetCenterDetailResponse {
  item: CenterDetailItem;
}
