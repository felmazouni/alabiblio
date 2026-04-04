import { utm30ToWgs84 } from "@alabiblio/geo/utm";
import type { MobilitySourceDefinition, TransportNodeRecord } from "../types";

interface ArcGisMetroFeature {
  attributes?: {
    IDESTACION?: string | null;
    CODIGOESTACION?: string | null;
    DENOMINACION?: string | null;
    DENOMINACIONABREVIADA?: string | null;
    SITUACIONCALLE?: string | null;
    LINEAS?: string | null;
    X?: number | null;
    Y?: number | null;
  };
}

interface ArcGisMetroResponse {
  exceededTransferLimit?: boolean;
  features?: ArcGisMetroFeature[];
}

export const metroStationsSource: MobilitySourceDefinition = {
  code: "metro_crtm_stations",
  name: "Estaciones Metro CRTM",
  baseUrl:
    "https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0",
  format: "api",
  licenseUrl: "https://datos-movilidad.crtm.es/",
  refreshMode: "api_runtime",
};

function cleanText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned === "" ? null : cleaned;
}

function normalizeMetroLines(rawValue: string | null | undefined): string[] {
  const raw = cleanText(rawValue);

  if (!raw) {
    return [];
  }

  return [...new Set(
    raw
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .map((item) => {
        if (item.startsWith("L")) {
          return item;
        }

        if (item === "R") {
          return "LR";
        }

        return `L${item}`;
      }),
  )].sort((left, right) => left.localeCompare(right, "es"));
}

async function fetchMetroPage(
  offset: number,
  fetchImpl: typeof fetch,
): Promise<ArcGisMetroResponse> {
  const url = new URL(`${metroStationsSource.baseUrl}/query`);
  url.searchParams.set("where", "MODO = 4");
  url.searchParams.set(
    "outFields",
    [
      "IDESTACION",
      "CODIGOESTACION",
      "DENOMINACION",
      "DENOMINACIONABREVIADA",
      "SITUACIONCALLE",
      "LINEAS",
      "X",
      "Y",
    ].join(","),
  );
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");
  url.searchParams.set("resultOffset", String(offset));
  url.searchParams.set("resultRecordCount", "1000");

  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`metro_crtm_stations request failed with ${response.status}`);
  }

  return (await response.json()) as ArcGisMetroResponse;
}

export async function loadMetroStationNodes(
  fetchImpl: typeof fetch = fetch,
): Promise<TransportNodeRecord[]> {
  const records = new Map<string, TransportNodeRecord>();
  let offset = 0;

  while (true) {
    const page = await fetchMetroPage(offset, fetchImpl);
    const features = page.features ?? [];

    for (const feature of features) {
      const attributes = feature.attributes;

      if (!attributes) {
        continue;
      }

      const stationId = cleanText(attributes.IDESTACION);
      const x = attributes.X;
      const y = attributes.Y;

      if (!stationId || typeof x !== "number" || typeof y !== "number") {
        continue;
      }

      const coordinates = utm30ToWgs84(x, y);
      const name =
        cleanText(attributes.DENOMINACIONABREVIADA) ??
        cleanText(attributes.DENOMINACION) ??
        stationId;
      const lines = normalizeMetroLines(attributes.LINEAS);
      const existing = records.get(stationId);

      if (existing) {
        const currentMetadata = existing.metadata_json
          ? (JSON.parse(existing.metadata_json) as { lines?: string[] })
          : {};
        const mergedLines = [...new Set([...(currentMetadata.lines ?? []), ...lines])].sort(
          (left, right) => left.localeCompare(right, "es"),
        );
        existing.metadata_json = JSON.stringify({
          ...currentMetadata,
          lines: mergedLines,
        });
        continue;
      }

      records.set(stationId, {
        id: `transport_node_metro_station_${stationId}`,
        kind: "metro_station",
        source_id: metroStationsSource.code,
        external_id: stationId,
        name,
        address_line: cleanText(attributes.SITUACIONCALLE),
        lat: coordinates.lat,
        lon: coordinates.lon,
        metadata_json: JSON.stringify({
          station_code: cleanText(attributes.CODIGOESTACION),
          lines,
        }),
        is_active: true,
      });
    }

    if (!page.exceededTransferLimit || features.length === 0) {
      break;
    }

    offset += features.length;
  }

  return [...records.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
}
