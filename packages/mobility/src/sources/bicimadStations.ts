import type { MobilitySourceDefinition, TransportNodeRecord } from "../types";

interface GbfsRootFeed {
  name?: string;
  url?: string;
}

interface GbfsRootResponse {
  data?: Record<
    string,
    {
      feeds?: GbfsRootFeed[];
    }
  >;
}

interface BicimadStationInformationRecord {
  station_id?: string;
  short_name?: string;
  obcn?: string;
  name?: string;
  address?: string;
  post_code?: string;
  lat?: number;
  lon?: number;
  capacity?: number;
}

interface BicimadStationInformationResponse {
  data?: {
    stations?: BicimadStationInformationRecord[];
  };
}

interface BicimadStationStatusRecord {
  station_id?: string;
  num_bikes_available?: number;
  num_docks_available?: number;
  status?: string;
  last_reported?: number;
  is_renting?: boolean;
  is_returning?: boolean;
}

interface BicimadStationStatusResponse {
  data?: {
    stations?: BicimadStationStatusRecord[];
  };
}

export const bicimadStationsSource: MobilitySourceDefinition = {
  code: "bicimad_stations",
  name: "Estaciones Bicimad GBFS",
  baseUrl: "https://madrid.publicbikesystem.net/customer/gbfs/v2/gbfs.json",
  format: "api",
  licenseUrl: "https://datos.emtmadrid.es/avisolegal",
  refreshMode: "api_runtime",
};

function cleanText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned === "" ? null : cleaned;
}

function buildAddress(record: BicimadStationInformationRecord): string | null {
  return [cleanText(record.address), cleanText(record.post_code)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim() || null;
}

async function fetchJson<T>(
  url: string,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`bicimad request failed with ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

async function resolveFeedUrls(fetchImpl: typeof fetch): Promise<{
  stationInformationUrl: string;
  stationStatusUrl: string;
}> {
  const root = await fetchJson<GbfsRootResponse>(bicimadStationsSource.baseUrl, fetchImpl);
  const spanishFeeds = root.data?.es?.feeds ?? [];
  const stationInformationUrl = spanishFeeds.find((feed) => feed.name === "station_information")?.url;
  const stationStatusUrl = spanishFeeds.find((feed) => feed.name === "station_status")?.url;

  if (!stationInformationUrl || !stationStatusUrl) {
    throw new Error("bicimad gbfs feeds missing station_information or station_status");
  }

  return { stationInformationUrl, stationStatusUrl };
}

export async function loadBicimadStationNodes(
  fetchImpl: typeof fetch = fetch,
): Promise<TransportNodeRecord[]> {
  const { stationInformationUrl, stationStatusUrl } = await resolveFeedUrls(fetchImpl);
  const [information, status] = await Promise.all([
    fetchJson<BicimadStationInformationResponse>(stationInformationUrl, fetchImpl),
    fetchJson<BicimadStationStatusResponse>(stationStatusUrl, fetchImpl),
  ]);
  const statusByStationId = new Map(
    (status.data?.stations ?? [])
      .filter((station): station is BicimadStationStatusRecord & { station_id: string } =>
        typeof station.station_id === "string" && station.station_id.trim() !== "",
      )
      .map((station) => [station.station_id, station] as const),
  );

  return (information.data?.stations ?? [])
    .map((station) => {
      const stationId = cleanText(station.station_id);
      const lat = station.lat;
      const lon = station.lon;

      if (!stationId || typeof lat !== "number" || typeof lon !== "number") {
        return null;
      }

      const realtime = statusByStationId.get(stationId);
      const stationNumber = cleanText(station.short_name) ?? cleanText(station.obcn) ?? stationId;

      return {
        id: `transport_node_bicimad_station_${stationId}`,
        kind: "bicimad_station",
        source_id: bicimadStationsSource.code,
        external_id: stationId,
        name: cleanText(station.name) ?? stationNumber,
        address_line: buildAddress(station),
        lat,
        lon,
        metadata_json: JSON.stringify({
          station_number: stationNumber,
          total_bases: typeof station.capacity === "number" ? station.capacity : null,
          station_state: cleanText(realtime?.status) ?? null,
          bikes_available:
            typeof realtime?.num_bikes_available === "number" ? realtime.num_bikes_available : null,
          docks_available:
            typeof realtime?.num_docks_available === "number" ? realtime.num_docks_available : null,
          last_reported_at:
            typeof realtime?.last_reported === "number" && realtime.last_reported > 0
              ? new Date(realtime.last_reported * 1000).toISOString()
              : null,
          is_renting: realtime?.is_renting ?? null,
          is_returning: realtime?.is_returning ?? null,
        }),
        is_active: true,
      } satisfies TransportNodeRecord;
    })
    .filter((row): row is TransportNodeRecord => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}
