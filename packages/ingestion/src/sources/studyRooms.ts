import { parse } from "csv-parse/sync";
import type { MadridCenterCsvRecord, SourceDefinition } from "../types";

export const studyRoomsSource: SourceDefinition = {
  code: "study_rooms",
  name: "Salas de estudio de Madrid",
  baseUrl:
    "https://datos.madrid.es/dataset/217921-0-salas-estudio/resource/217921-1-salas-estudio-csv/download/217921-1-salas-estudio-csv.csv",
  format: "csv",
  licenseUrl: "https://datos.madrid.es/egob/catalogo/aviso-legal",
  refreshMode: "dataset_download",
};

export async function loadStudyRoomRows(
  fetchImpl: typeof fetch = fetch,
): Promise<{ csv: string; rows: MadridCenterCsvRecord[] }> {
  const response = await fetchImpl(studyRoomsSource.baseUrl);

  if (!response.ok) {
    throw new Error(`study_rooms download failed with ${response.status}`);
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
