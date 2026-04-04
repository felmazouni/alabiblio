import type { CenterMobility } from "@alabiblio/contracts/mobility";

export function formatDistanceCompact(distanceM: number | null | undefined): string {
  if (distanceM === null || distanceM === undefined) return "sin dato";
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatWalkMinutesFromMeters(distanceM: number | null | undefined): string {
  if (distanceM === null || distanceM === undefined) return "sin dato";
  return `${Math.max(1, Math.round(distanceM / 83))} min`;
}

export function modeLabel(mode: CenterMobility["summary"]["best_mode"]): string {
  switch (mode) {
    case "car":
      return "coche";
    case "bus":
      return "EMT";
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
  if (!mobility) return "Actualizando recomendacion";
  const [context, reason] = mobility.summary.rationale;
  if (context && reason) return `${reason}. ${context}.`;
  return reason ?? context ?? "Sin recomendacion dominante.";
}

export function buildCarCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando coche";
  const car = mobility.modules.car;
  if (car.eta_min === null) return "Sin origen suficiente para estimar coche";
  return `${car.eta_min} min - ${car.ser_enabled ? `SER ${car.ser_zone_name ?? "activa"}` : "SER sin dato"}`;
}

export function buildBusCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando EMT";
  const bus = mobility.modules.bus;
  if (bus.selected_line && bus.origin_stop) {
    const arrival =
      bus.next_arrival_min !== null ? `llega en ${bus.next_arrival_min} min` : "sin tiempo real";
    const destination = bus.destination_stop
      ? `bajada a ${formatDistanceCompact(bus.destination_stop.distance_m)}`
      : "bajada sin dato";
    return `Linea ${bus.selected_line} - parada ${bus.origin_stop.name} a ${formatDistanceCompact(bus.origin_stop.distance_m)} - ${arrival} - ${destination}`;
  }
  if (bus.origin_stop) {
    return `Sin linea directa util desde tu origen - parada ${bus.origin_stop.name} a ${formatDistanceCompact(bus.origin_stop.distance_m)}`;
  }
  return "Sin parada EMT util desde tu origen";
}

export function buildBikeCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando BiciMAD";
  const bike = mobility.modules.bike;
  if (!bike.origin_station && !bike.destination_station) {
    return "Sin estacion BiciMAD util";
  }

  const total = bike.eta_min !== null ? `${bike.eta_min} min` : "Tiempo sin estimar";
  const origin = bike.origin_station
    ? `origen: estacion ${bike.origin_station.station_number ?? bike.origin_station.name} a ${formatDistanceCompact(bike.origin_station.distance_m)}${bike.bikes_available !== null ? ` con ${bike.bikes_available} bicis` : ""}`
    : "origen sin estacion util";
  const destination = bike.destination_station
    ? `destino: estacion ${bike.destination_station.station_number ?? bike.destination_station.name} a ${formatDistanceCompact(bike.destination_station.distance_m)}${bike.docks_available !== null ? ` con ${bike.docks_available} anclajes` : ""}`
    : "destino sin estacion util";

  return `${total} - ${origin} - ${destination}`;
}

export function buildMetroCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando metro";
  const metro = mobility.modules.metro;
  if (!metro.origin_station && !metro.destination_station) {
    return "Sin estacion de metro util";
  }

  const total = metro.eta_min !== null ? `${metro.eta_min} min` : "Tiempo sin estimar";
  const originLines = (metro.origin_station?.lines ?? []).slice(0, 2).join(", ");
  const destinationLines = (metro.destination_station?.lines ?? []).slice(0, 2).join(", ");
  const origin = metro.origin_station
    ? `${metro.origin_station.name}${originLines ? ` (${originLines})` : ""} a ${formatWalkMinutesFromMeters(metro.origin_station.distance_m)} andando`
    : "origen sin estacion";
  const destination = metro.destination_station
    ? `salida ${metro.destination_station.name}${destinationLines ? ` (${destinationLines})` : ""} a ${formatWalkMinutesFromMeters(metro.destination_station.distance_m)}`
    : "salida sin dato";

  return `${total} - ${origin} - ${destination}`;
}

export function buildModuleNote(
  mode: "car" | "bus" | "bike" | "metro",
  mobility: CenterMobility | null,
): string | null {
  if (!mobility) return "Actualizando datos";
  const state = mobility.modules[mode].state;
  if (state === "degraded_upstream") return "Datos en tiempo real temporalmente no disponibles";
  if (state === "degraded_missing_anchor") {
    if (mode === "bus") return "Mostramos la mejor parada cercana, aunque no haya linea directa clara.";
    if (mode === "bike") return "Falta una de las estaciones utiles para cerrar el trayecto.";
    if (mode === "metro") return "Falta una estacion util para completar el recorrido.";
    return "Faltan datos para cerrar la estimacion.";
  }
  if (state === "partial") {
    if (mode === "bus") return "Mostramos la mejor opcion EMT disponible con informacion parcial.";
    if (mode === "bike") return "Mostramos estaciones utiles aunque falte parte del tiempo real.";
    if (mode === "metro") return "Mostramos estaciones y lineas aunque el tiempo sea aproximado.";
    return "Mostramos una estimacion util con datos parciales.";
  }
  if (state === "unavailable") return "Este modo no se puede estimar con el origen actual.";
  return null;
}

export function humanizeHighlightLabel(label: string): string {
  const normalized = label
    .replace(/[·•]/g, "-")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .replace(/Bus\s+([A-Z0-9]+)\s*-\s*(\d+)\s*min/i, "Bus $1 - llega en $2 min")
    .replace(/Bus\s*-\s*sin linea util/i, "Bus - sin linea directa util")
    .replace(/Bici\s+(\d+)\s*min\s*-\s*[x×](\d+)/i, "Bici $1 min - $2 bicis cerca")
    .replace(/Metro\s+(\d+)\s*min$/i, "Metro $1 min - estacion cercana")
    .trim();
}
