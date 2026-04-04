import type { CenterDecisionCardItem } from "@alabiblio/contracts/centers";
import type {
  BikeModuleV1,
  BusModuleV1,
  CenterMobility,
  MetroModuleV1,
  MobilityHighlightV1,
  MobilityMode,
} from "@alabiblio/contracts/mobility";

export function formatDistanceCompact(distanceM: number | null | undefined): string {
  if (distanceM === null || distanceM === undefined) return "sin dato";
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatWalkMinutesFromMeters(distanceM: number | null | undefined): string {
  if (distanceM === null || distanceM === undefined) return "sin dato";
  return `${Math.max(1, Math.round(distanceM / 83))} min`;
}

function fixInline(text: string): string {
  return text
    .replace(/[Â·â€¢]/g, "·")
    .replace(/[Ã×]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

function trimLabel(value: string | null | undefined, max = 34): string {
  const clean = fixInline(value ?? "");
  if (!clean) return "sin dato";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}...`;
}

function stationRef(
  number: string | null | undefined,
  fallback: string | null | undefined,
): string {
  return number ? `estacion ${number}` : trimLabel(fallback ?? "sin dato", 24);
}

export function modeLabel(mode: CenterMobility["summary"]["best_mode"]): string {
  switch (mode) {
    case "car":
      return "coche";
    case "bus":
      return "bus";
    case "bike":
      return "BiciMAD";
    case "metro":
      return "metro";
    case "walk":
      return "a pie";
    default:
      return "sin modo";
  }
}

export function buildHumanReason(mobility: CenterMobility | null): string {
  if (!mobility) return "Estamos actualizando la mejor opcion de llegada.";
  const [context, reason] = mobility.summary.rationale;
  if (reason && context) return `${reason}. ${context}.`;
  return reason ?? context ?? "Sin recomendacion dominante.";
}

export function buildCarCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando trayecto en coche";
  const car = mobility.modules.car;
  if (car.eta_min === null) return "Sin origen suficiente para estimar el trayecto en coche";
  return `${car.eta_min} min · ${car.ser_enabled ? `SER ${car.ser_zone_name ?? "activa"}` : "SER sin dato"}`;
}

export function buildBusCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando opcion EMT";
  const bus = mobility.modules.bus;
  if (bus.selected_line && bus.origin_stop) {
    const pieces = [
      `Linea ${bus.selected_line}`,
      `parada ${trimLabel(bus.origin_stop.name, 22)} a ${formatDistanceCompact(bus.origin_stop.distance_m)}`,
      bus.next_arrival_min !== null ? `llega en ${bus.next_arrival_min} min` : "sin tiempo real",
    ];
    if (bus.destination_stop) {
      pieces.push(`bajada a ${formatDistanceCompact(bus.destination_stop.distance_m)}`);
    }
    return pieces.join(" · ");
  }
  if (bus.origin_stop) {
    return `Parada ${trimLabel(bus.origin_stop.name, 22)} a ${formatDistanceCompact(bus.origin_stop.distance_m)} · sin linea directa clara`;
  }
  return "Sin parada EMT util desde tu origen";
}

export function buildBikeCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando opcion BiciMAD";
  const bike = mobility.modules.bike;
  if (!bike.origin_station && !bike.destination_station) {
    return "Sin estacion BiciMAD util";
  }

  const parts: string[] = [];
  if (bike.eta_min !== null) {
    parts.push(`${bike.eta_min} min`);
  }
  if (bike.origin_station) {
    parts.push(
      `origen: ${stationRef(bike.origin_station.station_number, bike.origin_station.name)} a ${formatDistanceCompact(bike.origin_station.distance_m)}${bike.bikes_available !== null ? ` con ${bike.bikes_available} bicis` : ""}`,
    );
  } else {
    parts.push("origen sin estacion util");
  }
  if (bike.destination_station) {
    parts.push(
      `destino: ${stationRef(bike.destination_station.station_number, bike.destination_station.name)} a ${formatDistanceCompact(bike.destination_station.distance_m)}${bike.docks_available !== null ? ` con ${bike.docks_available} anclajes` : ""}`,
    );
  } else {
    parts.push("destino sin estacion util");
  }

  return parts.join(" · ");
}

export function buildMetroCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando opcion de metro";
  const metro = mobility.modules.metro;
  if (!metro.origin_station && !metro.destination_station) {
    return "Sin estacion de metro util";
  }

  const parts: string[] = [];
  if (metro.eta_min !== null) {
    parts.push(`${metro.eta_min} min`);
  }

  if (metro.origin_station) {
    const originLines = metro.origin_station.lines.slice(0, 2).join(", ");
    parts.push(
      `${trimLabel(metro.origin_station.name, 20)}${originLines ? ` (${originLines})` : ""} a ${formatWalkMinutesFromMeters(metro.origin_station.distance_m)} andando`,
    );
  } else {
    parts.push("origen sin estacion");
  }

  if (metro.destination_station) {
    const destinationLines = metro.destination_station.lines.slice(0, 2).join(", ");
    parts.push(
      `salida ${trimLabel(metro.destination_station.name, 20)}${destinationLines ? ` (${destinationLines})` : ""} a ${formatWalkMinutesFromMeters(metro.destination_station.distance_m)}`,
    );
  } else {
    parts.push("salida sin dato");
  }

  return parts.join(" · ");
}

export function buildModuleNote(
  mode: "car" | "bus" | "bike" | "metro",
  mobility: CenterMobility | null,
): string | null {
  if (!mobility) return "Actualizando datos";
  const state = mobility.modules[mode].state;
  if (state === "degraded_upstream") return "Los datos en tiempo real no estan respondiendo ahora.";
  if (state === "degraded_missing_anchor") {
    if (mode === "bus") return "Mostramos la mejor parada cercana aunque no haya linea directa clara.";
    if (mode === "bike") return "Falta una estacion util para cerrar el trayecto completo.";
    if (mode === "metro") return "Falta una estacion util para completar el recorrido.";
    return "Faltan datos para cerrar esta estimacion.";
  }
  if (state === "partial") {
    if (mode === "bus") return "Mostramos la mejor opcion EMT disponible con datos parciales.";
    if (mode === "bike") return "Mostramos estaciones utiles aunque falte parte del tiempo real.";
    if (mode === "metro") return "Mostramos estaciones y lineas aunque el tiempo sea aproximado.";
    return "Mostramos una estimacion util con datos parciales.";
  }
  if (state === "unavailable") return "Este modo no se puede estimar con el origen actual.";
  return null;
}

function modeTag(mode: MobilityMode | "walk"): string {
  switch (mode) {
    case "bus":
      return "BUS";
    case "metro":
      return "METRO";
    case "bike":
      return "BICIMAD";
    case "car":
      return "COCHE";
    case "walk":
      return "A PIE";
    default:
      return "LLEGADA";
  }
}

export function humanizeHighlightLabel(label: string): string {
  const normalized = fixInline(label);

  return normalized
    .replace(/Bus\s+([A-Z0-9]+)\s*[·-]\s*(\d+)\s*min/i, "Bus $1 · llega en $2 min")
    .replace(/Bus\s*[·-]\s*sin linea util/i, "Bus · sin linea directa util")
    .replace(/Bici\s+(\d+)\s*min\s*[·-]\s*x(\d+)/i, "Bici $1 min · $2 bicis cerca")
    .replace(/Metro\s+(\d+)\s*min$/i, "Metro $1 min · estacion cercana")
    .replace(/Coche\s+(\d+)\s*min\s*[·-]\s*SER\s*(.+)$/i, "Coche $1 min · SER $2")
    .trim();
}

export function buildSecondaryCardHighlights(center: CenterDecisionCardItem): string[] {
  const highlights = [
    center.mobility_highlights.primary,
    center.mobility_highlights.secondary,
  ].filter((value): value is NonNullable<typeof value> => value !== null);
  const result = highlights.map(
    (highlight) => `${modeTag(highlight.mode)} · ${humanizeHighlightLabel(highlight.label)}`,
  );

  if (
    result.length < 3 &&
    center.decision.best_mode !== "car" &&
    center.decision.best_time_minutes !== null &&
    center.ser?.enabled
  ) {
    result.push(`COCHE · ${center.decision.best_time_minutes} min · SER ${center.ser.zone_name ?? "activa"}`);
  }

  if (result.length < 3 && center.decision.distance_m !== null) {
    result.push(
      `A PIE · ${center.decision.distance_m < 1000 ? `${Math.round(center.decision.distance_m)} m` : `${(center.decision.distance_m / 1000).toFixed(1)} km`}`,
    );
  }

  return result.slice(0, 3);
}

export type TransportBoardRow = {
  mode: "metro" | "bus" | "bike";
  label: string;
  body: string;
  eta: string;
  recommended: boolean;
};

export type TransportFooterTile = {
  mode: "car" | "walk";
  label: string;
  body: string;
};

function buildBusBoardBody(bus: BusModuleV1): string {
  if (bus.selected_line && bus.origin_stop) {
    return [
      `Linea ${bus.selected_line}`,
      `parada ${trimLabel(bus.origin_stop.name, 18)} a ${formatDistanceCompact(bus.origin_stop.distance_m)}`,
      bus.next_arrival_min !== null ? `llega en ${bus.next_arrival_min} min` : "sin tiempo real",
      bus.destination_stop ? `bajada a ${formatDistanceCompact(bus.destination_stop.distance_m)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (bus.origin_stop) {
    return `Parada ${trimLabel(bus.origin_stop.name, 18)} a ${formatDistanceCompact(bus.origin_stop.distance_m)} · sin linea directa clara`;
  }

  return "Sin parada EMT util desde tu origen";
}

function buildBikeBoardBody(bike: BikeModuleV1): string {
  const origin = bike.origin_station
    ? `Origen: ${stationRef(bike.origin_station.station_number, bike.origin_station.name)}${bike.bikes_available !== null ? ` · ${bike.bikes_available} bicis` : ""}`
    : "Origen sin estacion";
  const destination = bike.destination_station
    ? `Destino: ${stationRef(bike.destination_station.station_number, bike.destination_station.name)}${bike.docks_available !== null ? ` · ${bike.docks_available} anclajes` : ""}`
    : "Destino sin estacion";
  return `${origin} · ${destination}`;
}

function buildMetroBoardBody(metro: MetroModuleV1): string {
  const origin = metro.origin_station
    ? `${trimLabel(metro.origin_station.name, 18)}${metro.origin_station.lines.length > 0 ? ` (${metro.origin_station.lines.slice(0, 2).join(", ")})` : ""}`
    : "Origen sin estacion";
  const destination = metro.destination_station
    ? `${trimLabel(metro.destination_station.name, 18)}${metro.destination_station.lines.length > 0 ? ` (${metro.destination_station.lines.slice(0, 2).join(", ")})` : ""}`
    : "Destino sin dato";
  return `${origin} → ${destination}`;
}

function etaLabel(etaMin: number | null, fallback = "sin dato"): string {
  return etaMin !== null ? `${etaMin} min` : fallback;
}

export function buildFeaturedTransportRows(
  mobility: CenterMobility | null,
): TransportBoardRow[] {
  const bestMode = mobility?.summary.best_mode ?? null;
  const bus = mobility?.modules.bus ?? null;
  const bike = mobility?.modules.bike ?? null;
  const metro = mobility?.modules.metro ?? null;

  return [
    {
      mode: "metro",
      label: "METRO",
      body: metro ? buildMetroBoardBody(metro) : "Sin datos de metro",
      eta: etaLabel(metro?.eta_min ?? null),
      recommended: bestMode === "metro",
    },
    {
      mode: "bus",
      label: "BUS",
      body: bus ? buildBusBoardBody(bus) : "Sin datos EMT",
      eta: bus && bus.next_arrival_min !== null ? `${bus.next_arrival_min} min` : etaLabel(null),
      recommended: bestMode === "bus",
    },
    {
      mode: "bike",
      label: "BICIMAD",
      body: bike ? buildBikeBoardBody(bike) : "Sin datos BiciMAD",
      eta: etaLabel(bike?.eta_min ?? null),
      recommended: bestMode === "bike",
    },
  ];
}

export function buildFeaturedFooterTiles(
  mobility: CenterMobility | null,
  center: Pick<CenterDecisionCardItem, "ser" | "decision"> | null,
): TransportFooterTile[] {
  const car = mobility?.modules.car ?? null;
  const walkingMinutes = mobility?.origin_dependent.walking_eta_min ?? null;
  const distance = center?.decision.distance_m ?? null;

  return [
    {
      mode: "car",
      label: "COCHE",
      body:
        car && car.eta_min !== null
          ? `${car.eta_min} min · ${car.ser_enabled ? `SER ${car.ser_zone_name ?? "activa"}` : "SER sin dato"}`
          : "Sin origen para calcular coche",
    },
    {
      mode: "walk",
      label: walkingMinutes !== null ? "A PIE" : "DISTANCIA",
      body:
        walkingMinutes !== null
          ? `${walkingMinutes} min · ${distance !== null ? formatDistanceCompact(distance) : "sin dato"}`
          : distance !== null
            ? formatDistanceCompact(distance)
            : "Sin distancia estimada",
    },
  ];
}

export function buildDetailModeSummary(
  mode: "car" | "bus" | "bike" | "metro",
  mobility: CenterMobility | null,
): string {
  switch (mode) {
    case "car":
      return buildCarCopy(mobility);
    case "bus":
      return buildBusCopy(mobility);
    case "bike":
      return buildBikeCopy(mobility);
    case "metro":
      return buildMetroCopy(mobility);
  }
}

export function buildHighlightRow(
  highlight: MobilityHighlightV1 | null,
): { label: string; body: string } | null {
  if (!highlight) return null;
  return {
    label: modeTag(highlight.mode),
    body: humanizeHighlightLabel(highlight.label),
  };
}
