import type { ListCentersResponse } from "@alabiblio/contracts/centers";
import type {
  GetCenterMobilityResponse,
  GetTopMobilityCentersResponse,
} from "@alabiblio/contracts/mobility";

export function getBaseCatalogScopeSignal(
  scope: ListCentersResponse["meta"]["scope"] | null,
): string {
  return scope === "base_exploration" ? "BASE" : "PEND";
}

export function getBaseCatalogScopeDescription(
  scope: ListCentersResponse["meta"]["scope"] | null,
): string {
  return scope === "base_exploration" || scope === null
    ? "Sin llegada contextual en el grid. Solo datos base, filtros y acceso al detalle."
    : "Scope no valido para este listado.";
}

export function getBaseExplorationLabel(
  scope: ListCentersResponse["meta"]["scope"],
): string {
  return scope === "base_exploration" ? "Exploracion base" : "Scope no soportado";
}

export function getBaseExplorationFallbackCopy(
  scope: ListCentersResponse["meta"]["scope"],
  isOpenNow: boolean | null,
): string {
  if (scope !== "base_exploration") {
    return "Scope no soportado";
  }

  return isOpenNow ? "Exploracion base disponible" : "Consulta horario antes de ir";
}

export function getTopMobilityScopeSignal(
  scope: GetTopMobilityCentersResponse["meta"]["scope"] | null,
): string {
  return scope === "origin_enriched" ? "ORIGEN" : "PEND";
}

export function getDetailMobilityScopeLabel(
  scope: GetCenterMobilityResponse["meta"]["scope"] | null,
): string {
  return scope === "origin_enriched" ? "Como llegar desde tu origen" : "Movilidad contextual";
}
