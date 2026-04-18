import type { CenterKind } from "@alabiblio/contracts";
import { includesAny, repairSourceText, slugify } from "./text";

const OPEN_AIR_TERMS = [
  "al aire libre",
  "biblioteca al aire libre",
  "sala al aire libre",
  "parque",
  "espacio abierto",
  "bibliopiscina",
  "bibliobus",
  "bibliobus",
];

export function isInteriorStudySpaceCandidate(input: {
  kind: CenterKind;
  title: string | null;
  services: string | null;
  schedule: string | null;
}): boolean {
  const haystack = [
    input.kind,
    repairSourceText(input.title) ?? "",
    repairSourceText(input.services) ?? "",
    repairSourceText(input.schedule) ?? "",
  ].join(" ");

  return !includesAny(haystack, OPEN_AIR_TERMS);
}

export function buildCenterSlug(parts: string[]): string {
  return slugify(parts.filter(Boolean).join("-"));
}

export function kindLabel(kind: CenterKind): string {
  return kind === "library" ? "Biblioteca" : "Sala de estudio";
}
