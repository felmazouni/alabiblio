import type { CenterMobility, CenterTopMobilityCardV1 } from "@alabiblio/contracts/mobility";
import { modeLabel } from "./transportCopy";

export function formatFetchError(scope: "top" | "catalog", error: Error): string {
  if (error.message === "Failed to fetch" || error.message === "request_timeout") {
    return scope === "catalog"
      ? "No se pudo cargar el listado. La conexion no respondio a tiempo."
      : "No se pudo cargar el Top 3. La conexion no respondio a tiempo.";
  }

  if (error.message.startsWith("centers_list_500")) {
    return "No se pudo cargar el listado base. El endpoint devolvio un error interno.";
  }

  if (error.message.startsWith("top_mobility_500")) {
    return "No se pudieron resolver las mejores opciones. El endpoint devolvio un error interno.";
  }

  return scope === "catalog"
    ? `No se pudo cargar el listado (${error.message}).`
    : `No se pudieron cargar las mejores opciones (${error.message}).`;
}

export function buildFeaturedCardFrame(
  center: Pick<CenterTopMobilityCardV1, "is_open_now" | "opens_today" | "decision"> | null,
  recommendedMode: CenterMobility["summary"]["best_mode"],
  serverOpenCount: number,
): {
  eyebrow: string;
  sectionTitle: string;
  sectionSummary: string;
} {
  const timingSummary =
    center && center.decision.best_time_minutes !== null && recommendedMode
      ? `${center.decision.best_time_minutes} min en ${modeLabel(recommendedMode)}`
      : "Sin origen suficiente";
  const isStrongRecommendation = center
    ? center.decision.confidence_source === "realtime" || center.decision.confidence_source === "estimated"
    : false;

  if (!center) {
    return {
      eyebrow: "Opcion destacada",
      sectionTitle: "Planifica el trayecto",
      sectionSummary: timingSummary,
    };
  }

  if (center.is_open_now) {
    return {
      eyebrow: isStrongRecommendation ? "Mejor opcion ahora" : "Referencia de llegada",
      sectionTitle: isStrongRecommendation ? "Llegar ahora" : "Llegada orientativa",
      sectionSummary: timingSummary,
    };
  }

  if (center.opens_today) {
    return {
      eyebrow: serverOpenCount === 0 ? "Mejor opcion proxima" : "Opcion destacada",
      sectionTitle: "Preparala para cuando abra",
      sectionSummary:
        timingSummary === "Sin origen suficiente"
          ? `Abre a las ${center.opens_today}`
          : `Abre a las ${center.opens_today} - ${timingSummary}`,
    };
  }

  return {
    eyebrow: isStrongRecommendation ? "Mejor opcion cercana" : "Referencia cercana",
    sectionTitle: isStrongRecommendation ? "Planifica el trayecto" : "Plan orientativo",
    sectionSummary: timingSummary,
  };
}
