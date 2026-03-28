import type { CenterCoordStatus, CenterKind, CenterRecord } from "@alabiblio/contracts/centers";

export type SourceCode = "study_rooms" | "libraries";

export interface MadridCenterCsvRecord {
  PK: string;
  NOMBRE: string;
  "DESCRIPCION-ENTIDAD": string;
  HORARIO: string;
  EQUIPAMIENTO: string;
  TRANSPORTE: string;
  DESCRIPCION: string;
  ACCESIBILIDAD: string;
  "CONTENT-URL": string;
  "NOMBRE-VIA": string;
  "CLASE-VIAL": string;
  "TIPO-NUM": string;
  NUM: string;
  PLANTA: string;
  PUERTA: string;
  ESCALERAS: string;
  ORIENTACION: string;
  LOCALIDAD: string;
  PROVINCIA: string;
  "CODIGO-POSTAL": string;
  "COD-BARRIO": string;
  BARRIO: string;
  "COD-DISTRITO": string;
  DISTRITO: string;
  "COORDENADA-X": string;
  "COORDENADA-Y": string;
  LATITUD: string;
  LONGITUD: string;
  TELEFONO: string;
  FAX: string;
  EMAIL: string;
  TIPO: string;
}

export interface SourceDefinition {
  code: SourceCode;
  name: string;
  baseUrl: string;
  format: "csv";
  licenseUrl: string;
  refreshMode: "dataset_download";
}

export interface NormalizedCenterInput
  extends Omit<CenterRecord, "created_at" | "updated_at"> {}

export interface NormalizedCenterLink {
  center_id: string;
  source_id: string;
  external_id: string;
  is_primary: boolean;
  source_record_updated_at: string | null;
  raw_payload_r2_key: string | null;
}

export interface NormalizedCenterEnvelope {
  center: NormalizedCenterInput;
  link: NormalizedCenterLink;
  rawScheduleText: string | null;
}

export interface IngestionRunSummary {
  id: string;
  sourceCode: SourceCode;
  checksum: string;
  startedAt: string;
  finishedAt: string;
  rowCountRaw: number;
  rowCountValid: number;
  rowCountRejected: number;
  warningCount: number;
  errorCount: number;
  records: NormalizedCenterEnvelope[];
}

export interface CoordinateNormalization {
  rawLat: number | null;
  rawLon: number | null;
  lat: number | null;
  lon: number | null;
  status: CenterCoordStatus;
  method: string | null;
}

export interface CenterMappingContext {
  sourceCode: SourceCode;
  sourceId: string;
  kind: CenterKind;
  sourceRecordUpdatedAt: string | null;
}
