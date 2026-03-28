import { decode } from "he";
import { slugifyCenterName } from "../../../domain/src/centers";
import type {
  CenterMappingContext,
  CoordinateNormalization,
  MadridCenterCsvRecord,
  NormalizedCenterEnvelope,
} from "../types";

function toNullableString(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : decode(trimmed);
}

function toNullableNumber(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, "");
  let normalized = compact;

  if (compact.includes(",")) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (compact.match(/\./g) ?? []).length;

    if (dotCount > 1) {
      const sign = compact.startsWith("-") ? "-" : "";
      const unsigned = sign === "-" ? compact.slice(1) : compact;
      const [integerPart, ...fractionParts] = unsigned.split(".");

      normalized = `${sign}${integerPart}.${fractionParts.join("")}`;
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCoordinates(record: MadridCenterCsvRecord): CoordinateNormalization {
  const rawLat = toNullableNumber(record.LATITUD);
  const rawLon = toNullableNumber(record.LONGITUD);

  if (rawLat === null || rawLon === null) {
    return {
      rawLat,
      rawLon,
      lat: null,
      lon: null,
      status: "missing",
      method: null,
    };
  }

  const isValidMadridPoint =
    rawLat >= 40 && rawLat <= 41 && rawLon >= -4.5 && rawLon <= -3;

  if (!isValidMadridPoint) {
    return {
      rawLat,
      rawLon,
      lat: null,
      lon: null,
      status: "invalid",
      method: "source",
    };
  }

  return {
    rawLat,
    rawLon,
    lat: rawLat,
    lon: rawLon,
    status: "provided",
    method: "source",
  };
}

function buildAddressLine(record: MadridCenterCsvRecord): string | null {
  const parts = [
    toNullableString(record["CLASE-VIAL"]),
    toNullableString(record["NOMBRE-VIA"]),
    toNullableString(record.NUM),
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? null : parts.join(" ");
}

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string): string {
  return normalizeInlineText(value)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

function extractCapacity(equipment: string | undefined): {
  value: number | null;
  text: string | null;
} {
  const text = toNullableString(equipment);

  if (!text) {
    return { value: null, text: null };
  }

  const normalized = normalizeInlineText(text);
  const searchText = normalizeSearchText(text);
  const patterns = [
    /aforo(?: maximo| aproximado)?\s*:?\s*[\d.]+(?:\s*(?:plazas?|puestos?|personas?))?/i,
    /puestos? de lectura(?:\s*\(aforo maximo\))?\s*:?\s*[\d.]+(?:\s*(?:plazas?|puestos?|personas?))?/i,
    /numero de plazas\s*:?\s*[\d.]+(?:\s*(?:plazas?|puestos?|personas?))?/i,
  ];

  const matchedText = patterns
    .map((pattern) => searchText.match(pattern)?.[0] ?? null)
    .find((value): value is string => value !== null);

  if (!matchedText) {
    return { value: null, text: null };
  }

  const valueMatch = matchedText.match(/[\d.]+/);
  const value = valueMatch ? Number(valueMatch[0].replace(/\./g, "")) : null;
  const labelPattern =
    /\b(aforo(?:\s+maximo|\s+aproximado)?|puestos?\s+de\s+lectura(?:\s*\(aforo\s+maximo\))?|numero\s+de\s+plazas)\b/i;
  const labelMatch = labelPattern.exec(searchText);
  let extractedText: string | null = null;

  if (labelMatch) {
    extractedText = normalized.slice(labelMatch.index, labelMatch.index + matchedText.length);
  }

  return {
    value: Number.isFinite(value) ? value : null,
    text: extractedText ?? matchedText,
  };
}

function hasWifi(record: MadridCenterCsvRecord): boolean {
  const haystack = `${record.EQUIPAMIENTO} ${record.DESCRIPCION}`.toLowerCase();

  if (haystack.includes("no dispone de wifi") || haystack.includes("sin wifi")) {
    return false;
  }

  return (
    haystack.includes("wifi") ||
    haystack.includes("wi-fi") ||
    haystack.includes("zona wifi")
  );
}

function hasSockets(record: MadridCenterCsvRecord): boolean {
  const haystack = `${record.EQUIPAMIENTO} ${record.DESCRIPCION}`.toLowerCase();

  if (
    haystack.includes("no dispone de enchufes") ||
    haystack.includes("sin enchufes")
  ) {
    return false;
  }

  return haystack.includes("enchufe") || haystack.includes("enchufes");
}

function isOpenAir(record: MadridCenterCsvRecord): boolean {
  const haystack = `${record.HORARIO} ${record.NOMBRE} ${record.EQUIPAMIENTO}`.toLowerCase();
  return haystack.includes("al aire libre");
}

function buildId(context: CenterMappingContext, externalId: string): string {
  return `center_${context.sourceCode}_${externalId}`;
}

function buildSlug(name: string, context: CenterMappingContext, externalId: string): string {
  return slugifyCenterName(`${name}-${context.sourceCode}-${externalId}`);
}

export function normalizeMadridCenterRecord(
  record: MadridCenterCsvRecord,
  context: CenterMappingContext,
): NormalizedCenterEnvelope | null {
  const externalId = toNullableString(record.PK);
  const name = toNullableString(record.NOMBRE);

  if (!externalId || !name) {
    return null;
  }

  const coordinates = normalizeCoordinates(record);
  const capacity = extractCapacity(record.EQUIPAMIENTO);

  return {
    center: {
      id: buildId(context, externalId),
      slug: buildSlug(name, context, externalId),
      kind: context.kind,
      name,
      district: toNullableString(record.DISTRITO),
      neighborhood: toNullableString(record.BARRIO),
      address_line: buildAddressLine(record),
      postal_code: toNullableString(record["CODIGO-POSTAL"]),
      municipality: toNullableString(record.LOCALIDAD) ?? "Madrid",
      phone: toNullableString(record.TELEFONO),
      email: toNullableString(record.EMAIL),
      website_url: toNullableString(record["CONTENT-URL"]),
      raw_lat: coordinates.rawLat,
      raw_lon: coordinates.rawLon,
      lat: coordinates.lat,
      lon: coordinates.lon,
      coord_status: coordinates.status,
      coord_resolution_method: coordinates.method,
      capacity_value: capacity.value,
      capacity_text: capacity.text,
      wifi_flag: hasWifi(record),
      sockets_flag: hasSockets(record),
      accessibility_flag: toNullableString(record.ACCESIBILIDAD) === "1",
      open_air_flag: isOpenAir(record),
      notes_raw: toNullableString(record.DESCRIPCION),
      is_active: true,
    },
    link: {
      center_id: buildId(context, externalId),
      source_id: context.sourceId,
      external_id: externalId,
      is_primary: true,
      source_record_updated_at: context.sourceRecordUpdatedAt,
      raw_payload_r2_key: null,
    },
    rawScheduleText: toNullableString(record.HORARIO),
  };
}
