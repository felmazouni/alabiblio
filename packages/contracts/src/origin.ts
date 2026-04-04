export type UserOriginKind =
  | "geolocation"
  | "manual_address"
  | "preset_area";

export type UserOrigin =
  | {
      kind: "geolocation";
      label: string;
      lat: number;
      lon: number;
    }
  | {
      kind: "manual_address";
      label: string;
      lat: number;
      lon: number;
    }
  | {
      kind: "preset_area";
      label: string;
      area_code: string;
      lat: number;
      lon: number;
    };

export interface OriginPreset {
  code: string;
  label: string;
  lat: number;
  lon: number;
}

export interface GeocodeAddressOption {
  id: string;
  label: string;
  display_name: string;
  address_line: string | null;
  neighborhood: string | null;
  district: string | null;
  municipality: string | null;
  postal_code: string | null;
  lat: number;
  lon: number;
}

export interface GeocodeSearchResponse {
  items: GeocodeAddressOption[];
}

export interface GetOriginPresetsResponse {
  items: OriginPreset[];
}
