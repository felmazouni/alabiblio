import type { TransportMode } from "@alabiblio/contracts";
import { normalizeSearch, repairSourceText } from "./text";

export interface ParsedTransportReference {
  mode: TransportMode;
  stationName: string | null;
  stopName: string | null;
  lines: string[];
  raw: string;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function cleanStationName(value: string): string {
  return value
    .replace(/\(.*?\)/g, "")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLines(raw: string, pattern: RegExp): string[] {
  const repaired = repairSourceText(raw) ?? raw;
  const matches = [...repaired.matchAll(pattern)];

  return unique(
    matches.map((match) =>
      match[1]?.toUpperCase() ?? "",
    ),
  );
}

function parseMetroLines(raw: string): string[] {
  return parseLines(
    raw,
    /\b(?:l(?:í|i)?neas?\s*|L\s*)(\d{1,2}[A-Z]?)\b/gi,
  );
}

function parseCercaniasLines(raw: string): string[] {
  return parseLines(
    raw,
    /\b(C\d{1,2}[A-Z]?)\b/gi,
  );
}

function parseMetroLigeroLines(raw: string): string[] {
  return parseLines(
    raw,
    /\b(ML\d{1,2}[A-Z]?)\b/gi,
  );
}

function matchClause(pattern: string, source: string): string | null {
  const regex = new RegExp(`${pattern}\\s*:\\s*([^.;]+)`, "i");
  const match = source.match(regex);
  return repairSourceText(match?.[1]) ?? null;
}

function parseMetroClause(source: string): ParsedTransportReference[] {
  const clause = matchClause("Metro", source);

  if (!clause) {
    return [];
  }

  const grouped = [...clause.matchAll(/([^,]+?)\s*\(([^)]+)\)/g)].filter(
    (match) => parseMetroLines(match[2] ?? "").length > 0,
  );

  if (grouped.length > 0) {
    return grouped.map((match, index) => ({
      mode: "metro",
      stationName: cleanStationName(match[1] ?? "") || `Metro ${index + 1}`,
      stopName: null,
      lines: parseMetroLines(match[2] ?? "").map((line) => `L${line.replace(/^L/i, "")}`),
      raw: match[0],
    }));
  }

  return clause
    .split(/,| y /i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({
      mode: "metro",
      stationName: cleanStationName(part.replace(/\(.*$/, "").trim()) || `Metro ${index + 1}`,
      stopName: null,
      lines: parseMetroLines(part).map((line) => `L${line.replace(/^L/i, "")}`),
      raw: part,
    }));
}

function parseCercaniasClause(source: string): ParsedTransportReference[] {
  const clause =
    matchClause("Cercan[ií]as Renfe", source) ??
    matchClause("Cercan[ií]as", source);

  if (!clause) {
    return [];
  }

  const grouped = [...clause.matchAll(/([^,]+?)\s*\(([^)]+)\)/g)].filter(
    (match) => parseCercaniasLines(match[2] ?? "").length > 0,
  );

  if (grouped.length > 0) {
    return grouped.map((match, index) => ({
      mode: "cercanias",
      stationName: cleanStationName(match[1] ?? "") || `Cercanias ${index + 1}`,
      stopName: null,
      lines: parseCercaniasLines(match[2] ?? "").map((line) => line.startsWith("C") ? line : `C${line}`),
      raw: match[0],
    }));
  }

  return clause.split(/,| y /i).map((part, index) => ({
    mode: "cercanias",
    stationName: cleanStationName(part.replace(/\(.*$/, "").trim()) || `Cercanias ${index + 1}`,
    stopName: null,
    lines: parseCercaniasLines(part).map((line) => line.startsWith("C") ? line : `C${line}`),
    raw: part.trim(),
  }));
}

function parseMetroLigeroClause(source: string): ParsedTransportReference[] {
  const clause =
    matchClause("Metro Ligero", source) ??
    matchClause("ML", source);

  if (!clause) {
    return [];
  }

  return [
    {
      mode: "metro_ligero",
      stationName: cleanStationName(clause.replace(/\(.*$/, "").trim()),
      stopName: null,
      lines: parseMetroLigeroLines(clause).map((line) => line.startsWith("ML") ? line : `ML${line}`),
      raw: clause,
    },
  ];
}

function parseBusClause(source: string): ParsedTransportReference[] {
  const clause =
    matchClause("Autobuses EMT", source) ??
    matchClause("Autobuses", source) ??
    matchClause("Bus", source);

  if (!clause) {
    return [];
  }

  const lines = unique(
    [...clause.matchAll(/\b([A-Z]?\d{1,3}[A-Z]?)\b/g)]
      .map((match) => match[1]?.toUpperCase() ?? "")
      .filter((line) => !line.startsWith("C")),
  );

  return [
    {
      mode: "emt_bus",
      stationName: null,
      stopName: null,
      lines,
      raw: clause,
    },
  ];
}

export function parseOfficialTransportText(rawValue: string | null | undefined): ParsedTransportReference[] {
  const repaired = repairSourceText(rawValue);

  if (!repaired) {
    return [];
  }

  return [
    ...parseMetroClause(repaired),
    ...parseCercaniasClause(repaired),
    ...parseMetroLigeroClause(repaired),
    ...parseBusClause(repaired),
  ];
}

export function hasTransportMode(
  rawValue: string | null | undefined,
  mode: Extract<TransportMode, "metro" | "cercanias" | "metro_ligero" | "emt_bus">,
): boolean {
  const repaired = repairSourceText(rawValue);

  if (!repaired) {
    return false;
  }

  const search = normalizeSearch(repaired);

  if (mode === "metro") {
    return search.includes("metro:");
  }

  if (mode === "cercanias") {
    return search.includes("cercanias");
  }

  if (mode === "metro_ligero") {
    return search.includes("metro ligero") || search.includes("ml");
  }

  return search.includes("autobuses emt") || search.includes("autobuses") || search.includes("bus");
}
