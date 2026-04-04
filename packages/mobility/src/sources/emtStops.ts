import { parse } from "csv-parse/sync";
import { utm30ToWgs84 } from "@alabiblio/geo/utm";
import type {
  MobilitySourceDefinition,
  TransportNodeRecord,
} from "../types";

interface EmtStopCsvRow {
  line: string;
  parada: string;
  descparada: string;
  descpostal: string;
  posX: string;
  posY: string;
}

type AggregatedStop = {
  externalId: string;
  name: string;
  addressLine: string | null;
  easting: number;
  northing: number;
  lines: Set<string>;
};

export const emtStopsSource: MobilitySourceDefinition = {
  code: "emt_stops",
  name: "Paradas EMT Madrid",
  baseUrl:
    "https://datos.emtmadrid.es/dataset/7b4a2c0a-eece-4a5a-9094-bf9444824d86/resource/4f0736a9-865c-428f-8719-128c805baa2e/download/stopsemt.csv",
  format: "csv",
  licenseUrl: "https://datos.emtmadrid.es/avisolegal",
  refreshMode: "dataset_download",
};

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function loadEmtStopNodes(
  fetchImpl: typeof fetch = fetch,
): Promise<TransportNodeRecord[]> {
  const response = await fetchImpl(emtStopsSource.baseUrl);

  if (!response.ok) {
    throw new Error(`emt_stops download failed with ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const csv = new TextDecoder("windows-1252")
    .decode(buffer)
    .replace(/^\s*[\r\n]+/, "");
  const rows = parse(csv, {
    columns: true,
    delimiter: ",",
    bom: true,
    skip_empty_lines: true,
  }) as EmtStopCsvRow[];
  const aggregatedStops = new Map<string, AggregatedStop>();

  for (const row of rows) {
    const externalId = cleanText(row.parada);

    if (externalId === "") {
      continue;
    }

    const easting = parseNumber(row.posX);
    const northing = parseNumber(row.posY);

    if (easting === null || northing === null) {
      continue;
    }

    const existing = aggregatedStops.get(externalId);

    if (existing) {
      const line = cleanText(row.line);

      if (line !== "") {
        existing.lines.add(line);
      }
      continue;
    }

    const line = cleanText(row.line);
    aggregatedStops.set(externalId, {
      externalId,
      name: cleanText(row.descparada),
      addressLine: cleanText(row.descpostal) || null,
      easting,
      northing,
      lines: line === "" ? new Set<string>() : new Set<string>([line]),
    });
  }

  return [...aggregatedStops.values()].map((stop) => {
    const coordinates = utm30ToWgs84(stop.easting, stop.northing);

    return {
      id: `transport_node_emt_stop_${stop.externalId}`,
      kind: "emt_stop",
      source_id: emtStopsSource.code,
      external_id: stop.externalId,
      name: stop.name,
      address_line: stop.addressLine,
      lat: coordinates.lat,
      lon: coordinates.lon,
      metadata_json: JSON.stringify({
        lines: [...stop.lines].sort((left, right) => left.localeCompare(right)),
      }),
      is_active: true,
    } satisfies TransportNodeRecord;
  });
}
