import { parse } from "csv-parse/sync";
import type {
  MobilitySourceDefinition,
  TransportNodeRecord,
} from "../types";

interface ParkingCsvRow {
  id: string;
  name: string;
  address: string;
  long: string;
  lat: string;
  isEmtParking: string;
  Plazas_standard: string;
  Plazas_PMR: string;
}

export const emtParkingsSource: MobilitySourceDefinition = {
  code: "emt_parkings",
  name: "Aparcamientos EMT Madrid",
  baseUrl:
    "https://datos.emtmadrid.es/dataset/0f3310f5-c4b5-4727-8183-6de7b8e44c91/resource/97bcf990-3bb2-4a58-aa50-fcc2992182c8/download/parkings.csv",
  format: "csv",
  licenseUrl: "https://datos.emtmadrid.es/avisolegal",
  refreshMode: "dataset_download",
};

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseDecimal(value: string): number | null {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string): number | null {
  const normalized = value.trim();

  if (normalized === "") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadParkingNodes(
  fetchImpl: typeof fetch = fetch,
): Promise<TransportNodeRecord[]> {
  const response = await fetchImpl(emtParkingsSource.baseUrl);

  if (!response.ok) {
    throw new Error(`emt_parkings download failed with ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const csv = new TextDecoder("windows-1252").decode(buffer);
  const rows = parse(csv, {
    columns: true,
    delimiter: ",",
    bom: true,
    skip_empty_lines: true,
  }) as ParkingCsvRow[];

  return rows
    .map((row) => {
      const parkingId = cleanText(row.id);
      const lat = parseDecimal(row.lat);
      const lon = parseDecimal(row.long);

      if (parkingId === "" || lat === null || lon === null) {
        return null;
      }

      return {
        id: `transport_node_parking_${parkingId}`,
        kind: "parking",
        source_id: emtParkingsSource.code,
        external_id: parkingId,
        name: cleanText(row.name),
        address_line: cleanText(row.address) || null,
        lat,
        lon,
        metadata_json: JSON.stringify({
          capacity_total: parseInteger(row.Plazas_standard),
          capacity_pmr: parseInteger(row.Plazas_PMR),
          is_emt_parking: cleanText(row.isEmtParking).toUpperCase() === "Y",
        }),
        is_active: true,
      } satisfies TransportNodeRecord;
    })
    .filter((row): row is TransportNodeRecord => row !== null);
}
