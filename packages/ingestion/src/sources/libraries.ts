import { parse } from "csv-parse/sync";
import type { MadridCenterCsvRecord, SourceDefinition } from "../types";

export const librariesSource: SourceDefinition = {
  code: "libraries",
  name: "Bibliotecas públicas y bibliobuses de Madrid",
  baseUrl: "https://datos.madrid.es/egob/catalogo/201747-0-bibliobuses-bibliotecas.csv",
  format: "csv",
  licenseUrl: "https://datos.madrid.es/egob/catalogo/aviso-legal",
  refreshMode: "dataset_download",
};

export async function loadLibraryRows(
  fetchImpl: typeof fetch = fetch,
): Promise<{ csv: string; rows: MadridCenterCsvRecord[] }> {
  const response = await fetchImpl(librariesSource.baseUrl);

  if (!response.ok) {
    throw new Error(`libraries download failed with ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const csv = new TextDecoder("windows-1252").decode(buffer);
  const rows = parse(csv, {
    columns: true,
    delimiter: ";",
    bom: true,
    skip_empty_lines: true,
  }) as MadridCenterCsvRecord[];

  return { csv, rows };
}
