const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "y", "e", "el"]);

const KNOWN_ZONE_LABELS: Record<string, string> = {
  sanjuanbautista: "San Juan Bautista",
  ciudadlineal: "Ciudad Lineal",
  puentedevallecas: "Puente de Vallecas",
  fuencarralelpardo: "Fuencarral-El Pardo",
  sanblascanillejas: "San Blas-Canillejas",
  villadevallecas: "Villa de Vallecas",
  moncloaaravaca: "Moncloa-Aravaca",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function zoneKey(value: string): string {
  return stripAccents(value)
    .toLocaleLowerCase("es-ES")
    .replace(/[^a-z0-9]/g, "");
}

function titleCaseToken(value: string, isFirst: boolean): string {
  const lower = value.toLocaleLowerCase("es-ES");
  if (!isFirst && SMALL_WORDS.has(lower)) {
    return lower;
  }

  return lower.charAt(0).toLocaleUpperCase("es-ES") + lower.slice(1);
}

function normalizeGenericLabel(value: string): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.map((word, index) => titleCaseToken(word, index === 0)).join(" ");
}

export function normalizeZoneLabel(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  const prepared = input
    .trim()
    .replace(/[_/]+/g, " ")
    .replace(/([\p{Ll}])([\p{Lu}])/gu, "$1 $2")
    .replace(/\s*[\-–—]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  if (!prepared) {
    return "";
  }

  const directMatch = KNOWN_ZONE_LABELS[zoneKey(prepared)];
  if (directMatch) {
    return directMatch;
  }

  const segments = prepared
    .split(" - ")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const mapped = KNOWN_ZONE_LABELS[zoneKey(segment)];
      if (mapped) {
        return mapped;
      }
      return normalizeGenericLabel(segment);
    });

  return segments.join("-");
}

export function formatNeighborhoodDistrict(
  neighborhood: string | null | undefined,
  district: string | null | undefined,
): string {
  const parts = [normalizeZoneLabel(neighborhood), normalizeZoneLabel(district)].filter(Boolean);
  return parts.join(" · ");
}
