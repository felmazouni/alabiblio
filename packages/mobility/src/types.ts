import type { CenterRecord } from "@alabiblio/contracts/centers";
import type { TransportNodeKind } from "@alabiblio/contracts/mobility";

export type MobilitySourceCode =
  | "emt_stops"
  | "bicimad_stations"
  | "metro_crtm_stations"
  | "emt_parkings"
  | "emt_realtime";

export interface MobilitySourceDefinition {
  code: MobilitySourceCode;
  name: string;
  baseUrl: string;
  format: "csv" | "api";
  licenseUrl: string;
  refreshMode: "dataset_download" | "api_runtime";
}

export interface TransportNodeRecord {
  id: string;
  kind: TransportNodeKind;
  source_id: MobilitySourceCode;
  external_id: string;
  name: string;
  address_line: string | null;
  lat: number;
  lon: number;
  metadata_json: string | null;
  is_active: boolean;
}

export interface CenterCoordinateRecord
  extends Pick<CenterRecord, "id" | "slug" | "lat" | "lon"> {}

export interface CenterTransportLinkRecord {
  center_id: string;
  transport_node_id: string;
  distance_m: number;
  rank_order: number;
}

export interface MobilitySyncBuildResult {
  sql: string;
  counts: {
    centers: number;
    emt_stops: number;
    bicimad_stations: number;
    metro_stations: number;
    parkings: number;
    center_transport_links: number;
  };
}

export interface EmtCredentials {
  clientId?: string;
  passKey?: string;
  email?: string;
  password?: string;
}

export interface EmtLoginDataItem {
  accessToken: string;
  tokenSecExpiration: number;
}

export interface EmtApiEnvelope<T> {
  code: string;
  description: string;
  datetime?: string;
  data: T[];
}

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
