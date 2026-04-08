import type { CenterListBaseItemV1 } from "@alabiblio/contracts/centers";
import type {
  BikeModuleV1,
  BusModuleV1,
  CenterMobility,
  CenterTopMobilityCardV1,
  MetroModuleV1,
  MobilityHighlightV1,
  MobilityMode,
} from "@alabiblio/contracts/mobility";
import { repairMojibake } from "../../lib/displayText";

export type SecondaryCardHighlightRow = {
  label: string;
  body: string;
};

export type TransportBoardRow = {
  mode: "metro" | "bus" | "bike";
  label: string;
  headline: string;
  details: Array<{
    kind: "route" | "origin" | "destination" | "time" | "availability" | "note";
    text: string;
  }>;
  eta: string | null;
  recommended: boolean;
};

export type TransportFooterTile = {
  mode: "car" | "walk";
  label: string;
  body: string;
};

function joinParts(parts: Array<string | null | undefined>, separator = " · "): string {
  return parts
    .map((part) => cleanText(part))
    .filter((part): part is string => part.length > 0)
    .join(separator);
}

function buildBoardDetail(
  kind: "route" | "origin" | "destination" | "time" | "availability" | "note",
  text: string | null | undefined,
) {
  const clean = cleanText(text);
  return clean ? { kind, text: clean } : null;
}

function cleanText(value: string | null | undefined): string {
  return repairMojibake(value ?? "")
    .replace(/[·•]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function trimLabel(value: string | null | undefined, max = 34): string {
  const clean = cleanText(value);
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}...`;
}

function stationRef(
  number: string | null | undefined,
  fallback: string | null | undefined,
): string {
  if (number) return `estacion ${number}`;
  const label = trimLabel(fallback, 24);
  return label || "estacion cercana";
}

function buildSerCopy(enabled: boolean, zoneName: string | null): string | null {
  if (!enabled) return null;
  if (zoneName) return `SER ${zoneName}`;
  return "zona SER";
}

export function formatDistanceCompact(distanceM: number | null | undefined): string | null {
  if (distanceM === null || distanceM === undefined) return null;
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function formatWalkMinutesFromMeters(distanceM: number | null | undefined): string | null {
  if (distanceM === null || distanceM === undefined) return null;
  return `${Math.max(1, Math.round(distanceM / 83))} min`;
}

function formatEta(etaMin: number | null | undefined): string | null {
  if (etaMin === null || etaMin === undefined) return null;
  return `${etaMin} min`;
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
      return "trayecto";
  }
}

export function buildHumanReason(mobility: CenterMobility | null): string {
  if (!mobility) return "Actualizando la mejor llegada.";

  const meaningful = mobility.summary.rationale
    .map((entry) => cleanText(entry))
    .filter((entry): entry is string => entry.length > 0);
  const specific = meaningful.filter(
    (entry) =>
      entry !== "Centro abierto ahora" &&
      entry !== "Revisa horario" &&
      entry !== "Sin origen suficiente" &&
      entry !== "Fallback andando",
  );
  const lead = specific[0] ?? null;

  switch (mobility.summary.best_mode) {
    case "car":
      return lead === "Coche con contexto SER"
        ? "Coche es la llegada mas rapida con contexto SER."
        : "Coche es la llegada mas rapida.";
    case "bus":
      return lead === "EMT con llegada proxima"
        ? "EMT ofrece la mejor llegada util."
        : "EMT sigue siendo la mejor opcion disponible.";
    case "bike":
      return lead === "BiciMAD con stock y anclaje"
        ? "BiciMAD compensa por tiempo y disponibilidad."
        : "BiciMAD compensa mejor en este trayecto.";
    case "metro":
      return "Metro equilibra acceso y tiempo total.";
    case "walk":
      return "Ir andando es la opcion mas directa.";
    default:
      return "Mostramos la mejor opcion disponible.";
  }
}

export function buildCarCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando coche.";

  const car = mobility.modules.car;
  if (car.eta_min === null) return "Sin estimacion fiable en coche.";

  const parts = [`${car.eta_min} min`, formatDistanceCompact(car.distance_m)];
  const serCopy = buildSerCopy(car.ser_enabled, car.ser_zone_name);
  if (serCopy) parts.push(serCopy);
  return joinParts(parts);
}

function buildBusDegradation(bus: BusModuleV1): string {
  if (bus.selected_line && bus.origin_stop) {
    const parts = [`L${bus.selected_line}`, `Sube en ${trimLabel(bus.origin_stop.name, 22)}`];

    if (bus.destination_stop) {
      parts.push(`Baja en ${trimLabel(bus.destination_stop.name, 22)}`);
    }

    if (bus.estimated_total_min !== null) {
      parts.push(`Llegada estimada ${bus.estimated_total_min} min`);
    }

    if (bus.estimated_travel_min !== null) {
      parts.push(`Viaje ${bus.estimated_travel_min} min`);
    }

    return joinParts(parts);
  }

  if (bus.origin_stop && bus.realtime_status !== "available") {
    return joinParts([
      trimLabel(bus.origin_stop.name, 22),
      bus.estimated_total_min !== null ? `Llegada estimada ${bus.estimated_total_min} min` : "Llegada estimada",
    ]);
  }

  if (bus.origin_stop) {
    return joinParts([trimLabel(bus.origin_stop.name, 22), "Sin linea directa clara"]);
  }

  if (bus.destination_stop) {
    return "No vemos una parada clara de salida.";
  }

  return "No vemos una opcion EMT clara.";
}

export function buildBusCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando EMT.";

  const bus = mobility.modules.bus;
  if (bus.selected_line && bus.origin_stop) {
    const parts = [`L${bus.selected_line}`, `Sube en ${trimLabel(bus.origin_stop.name, 22)}`];

    if (bus.destination_stop) {
      parts.push(`Baja en ${trimLabel(bus.destination_stop.name, 22)}`);
    }

    if (bus.next_arrival_min !== null) {
      parts.push(`Espera ${bus.next_arrival_min} min`);
    } else if (bus.estimated_total_min !== null) {
      parts.push(`Llegada estimada ${bus.estimated_total_min} min`);
    } else {
      parts.push("Llegada estimada");
    }

    if (bus.estimated_travel_min !== null) {
      parts.push(`Viaje ${bus.estimated_travel_min} min`);
    }

    return joinParts(parts);
  }

  return buildBusDegradation(bus);
}

export function buildBikeCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando BiciMAD.";

  const bike = mobility.modules.bike;
  if (!bike.origin_station && !bike.destination_station) {
    return "No vemos una combinacion BiciMAD clara.";
  }

  const parts: string[] = [];
  if (bike.eta_min !== null) parts.push(`${bike.eta_min} min`);

  if (bike.origin_station) {
    const distance = formatDistanceCompact(bike.origin_station.distance_m) ?? "poca distancia";
    const bikes = bike.bikes_available !== null ? ` con ${bike.bikes_available} bicis` : "";
    parts.push(`Origen: ${stationRef(bike.origin_station.station_number, bike.origin_station.name)} a ${distance}${bikes}`);
  } else {
    parts.push("Origen sin estacion clara");
  }

  if (bike.destination_station) {
    const distance = formatDistanceCompact(bike.destination_station.distance_m) ?? "poca distancia";
    const docks = bike.docks_available !== null ? ` con ${bike.docks_available} anclajes` : "";
    parts.push(`Destino: ${stationRef(bike.destination_station.station_number, bike.destination_station.name)} a ${distance}${docks}`);
  } else {
    parts.push("Destino sin estacion clara");
  }

  return joinParts(parts);
}

export function buildMetroCopy(mobility: CenterMobility | null): string {
  if (!mobility) return "Calculando metro.";

  const metro = mobility.modules.metro;
  if (!metro.origin_station && !metro.destination_station) {
    return "No vemos una combinacion de metro clara.";
  }

  const parts: string[] = [];
  if (metro.origin_station) {
    const lines = metro.line_labels.slice(0, 3).join(", ") || metro.origin_station.lines.slice(0, 2).join(", ");
    const walk = formatWalkMinutesFromMeters(metro.origin_station.distance_m);
    parts.push(
      `${trimLabel(metro.origin_station.name, 20)}${lines ? ` · ${lines}` : ""}${walk ? ` · Origen a ${walk}` : ""}`,
    );
  } else {
    parts.push("Origen sin estacion clara");
  }

  if (metro.destination_station) {
    const walk = formatWalkMinutesFromMeters(metro.destination_station.distance_m);
    parts.push(
      `Destino: ${trimLabel(metro.destination_station.name, 20)}${walk ? ` · Destino a ${walk}` : ""}`,
    );
  } else {
    parts.push("Destino sin estacion clara");
  }

  return joinParts(parts);
}

export function buildModuleNote(
  mode: "car" | "bus" | "bike" | "metro",
  mobility: CenterMobility | null,
): string | null {
  if (!mobility) return "Actualizando datos.";

  const state = mobility.modules[mode].state;
  if (state === "degraded_upstream") {
    if (mode === "bus") return "EMT no respondio a tiempo; mostramos estimacion.";
    if (mode === "bike") return "BiciMAD no devuelve disponibilidad en tiempo real.";
    return "Mostramos una estimacion con datos parciales.";
  }

  if (state === "degraded_missing_anchor") {
    if (mode === "bus") return "Usamos la mejor parada cercana.";
    if (mode === "bike") return "Falta una estacion para cerrar el trayecto.";
    if (mode === "metro") return "Falta una estacion para completar el trayecto.";
    return "Faltan anchors para cerrar la estimacion.";
  }

  if (state === "partial") {
    if (mode === "bus") return "Mostramos la mejor alternativa EMT disponible.";
    if (mode === "bike") return "Mostramos estaciones utiles con disponibilidad parcial.";
    if (mode === "metro") return "Mostramos estaciones y lineas con tiempo aproximado.";
    return "Mostramos una estimacion parcial.";
  }

  if (state === "unavailable") {
    if (mode === "bus") return "No hay una alternativa EMT suficiente.";
    if (mode === "bike") return "No hay una combinacion BiciMAD suficiente.";
    if (mode === "metro") return "No hay una alternativa de metro suficiente.";
    return "No hay datos suficientes para este modo.";
  }

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
  const normalized = cleanText(label);

  return normalized
    .replace(/Bus\s+([A-Z0-9]+)\s*[-]\s*(\d+)\s*min/i, "Bus $1 · llega en $2 min")
    .replace(/Bus\s+([A-Z0-9]+)\s*[·-]\s*(\d+)\s*min/i, "Bus $1 · llega en $2 min")
    .replace(/Bus\s*[·-]\s*sin linea util/i, "Sin linea directa clara")
    .replace(/Bici\s+(\d+)\s*min\s*[·-]\s*x(\d+)/i, "Bici $1 min · $2 bicis cerca")
    .replace(/Metro\s+(\d+)\s*min$/i, "Metro $1 min · estacion cercana")
    .replace(/Coche\s+(\d+)\s*min\s*[·-]\s*SER\s*(.+)$/i, "Coche $1 min · SER $2")
    .trim();
}

function buildHighlightRowFromSummary(highlight: MobilityHighlightV1): SecondaryCardHighlightRow {
  const label = modeTag(highlight.mode);
  const body = humanizeHighlightLabel(highlight.label);
  return { label, body };
}

export function buildBaseExplorationHighlights(center: CenterListBaseItemV1): SecondaryCardHighlightRow[] {
  const rows: SecondaryCardHighlightRow[] = [];

  if (center.ser?.enabled) {
    rows.push({
      label: "SER",
      body: center.ser.zone_name ? `Zona ${center.ser.zone_name}` : "Zona SER activa",
    });
  }

  if (center.capacity_value !== null) {
    rows.push({
      label: "AFORO",
      body: `${center.capacity_value} plazas`,
    });
  }

  if (center.schedule_confidence_label === "low") {
    rows.push({
      label: "HORARIO",
      body: "Horario con confirmacion baja",
    });
  }

  return rows.slice(0, 2);
}

function buildBusBoardContent(bus: BusModuleV1): Pick<TransportBoardRow, "headline" | "details"> {
  if (bus.selected_line && bus.origin_stop) {
    return {
      headline: `L${bus.selected_line}`,
      details: [
        buildBoardDetail("origin", `Subida: ${trimLabel(bus.origin_stop.name, 20)}`),
        buildBoardDetail(
          "destination",
          bus.destination_stop
            ? `Bajada: ${trimLabel(bus.destination_stop.name, 20)}`
            : bus.selected_destination
              ? `Destino: ${trimLabel(bus.selected_destination, 20)}`
              : null,
        ),
        buildBoardDetail(
          "time",
          bus.next_arrival_min !== null
            ? `Espera ${bus.next_arrival_min} min`
            : bus.estimated_total_min !== null
              ? `Llegada estimada ${bus.estimated_total_min} min`
              : "Llegada estimada",
        ),
        buildBoardDetail("route", bus.estimated_travel_min !== null ? `Viaje ${bus.estimated_travel_min} min` : null),
      ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
    };
  }

  if (bus.origin_stop && bus.realtime_status !== "available") {
    return {
      headline: trimLabel(bus.origin_stop.name, 20),
      details: [
        buildBoardDetail("origin", `Parada a ${formatDistanceCompact(bus.origin_stop.distance_m) ?? "poca distancia"}`),
        buildBoardDetail("time", bus.estimated_total_min !== null ? `Llegada estimada ${bus.estimated_total_min} min` : "Llegada estimada"),
      ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
    };
  }

  if (bus.origin_stop) {
    return {
      headline: trimLabel(bus.origin_stop.name, 20),
      details: [
        buildBoardDetail("origin", `Parada a ${formatDistanceCompact(bus.origin_stop.distance_m) ?? "poca distancia"}`),
        buildBoardDetail("note", "Sin linea directa clara"),
      ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
    };
  }

  return {
    headline: "Sin linea clara",
    details: [buildBoardDetail("note", "No vemos una opcion EMT clara")].filter((value): value is NonNullable<typeof value> => Boolean(value)),
  };
}

function buildBikeBoardContent(bike: BikeModuleV1): Pick<TransportBoardRow, "headline" | "details"> {
  const origin = bike.origin_station
    ? `${stationRef(bike.origin_station.station_number, bike.origin_station.name)}${bike.bikes_available !== null ? ` - ${bike.bikes_available} bicis` : ""}`
    : "origen sin estacion";
  const destination = bike.destination_station
    ? `${stationRef(bike.destination_station.station_number, bike.destination_station.name)}${bike.docks_available !== null ? ` - ${bike.docks_available} anclajes` : ""}`
    : "destino sin estacion";
  return {
    headline: "Red BiciMAD",
    details: [
      buildBoardDetail("origin", `Origen: ${origin}`),
      buildBoardDetail("destination", `Destino: ${destination}`),
    ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
  };
}

function buildMetroBoardContent(metro: MetroModuleV1): Pick<TransportBoardRow, "headline" | "details"> {
  const origin = metro.origin_station
    ? trimLabel(metro.origin_station.name, 18)
    : "Origen sin estacion";
  const destination = metro.destination_station
    ? trimLabel(metro.destination_station.name, 18)
    : "Destino sin estacion";
  const lines = metro.line_labels.slice(0, 3).join(", ");
  return {
    headline: `${origin} -> ${destination}`,
    details: [
      buildBoardDetail("route", lines ? lines : null),
      buildBoardDetail(
        "origin",
        metro.origin_station?.distance_m !== undefined && metro.origin_station?.distance_m !== null
          ? `Origen a ${formatWalkMinutesFromMeters(metro.origin_station.distance_m)}`
          : null,
      ),
      buildBoardDetail(
        "destination",
        metro.destination_station?.distance_m !== undefined && metro.destination_station?.distance_m !== null
          ? `Destino a ${formatWalkMinutesFromMeters(metro.destination_station.distance_m)}`
          : null,
      ),
    ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
  };
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
      ...(metro ? buildMetroBoardContent(metro) : {
        headline: "Sin alternativa clara",
        details: [buildBoardDetail("note", "No vemos una combinacion de metro clara")].filter((value): value is NonNullable<typeof value> => Boolean(value)),
      }),
      eta: formatEta(metro?.eta_min ?? null),
      recommended: bestMode === "metro",
    },
    {
      mode: "bus",
      label: "BUS",
      ...(bus ? buildBusBoardContent(bus) : {
        headline: "Sin alternativa EMT",
        details: [buildBoardDetail("note", "No vemos una opcion EMT clara")].filter((value): value is NonNullable<typeof value> => Boolean(value)),
      }),
      eta: bus && bus.estimated_total_min !== null
        ? `${bus.estimated_total_min} min`
        : bus && bus.next_arrival_min !== null
          ? `${bus.next_arrival_min} min`
          : null,
      recommended: bestMode === "bus",
    },
    {
      mode: "bike",
      label: "BICIMAD",
      ...(bike ? buildBikeBoardContent(bike) : {
        headline: "Sin alternativa BiciMAD",
        details: [buildBoardDetail("note", "No vemos una combinacion BiciMAD clara")].filter((value): value is NonNullable<typeof value> => Boolean(value)),
      }),
      eta: formatEta(bike?.eta_min ?? null),
      recommended: bestMode === "bike",
    },
  ];
}

export function buildFeaturedFooterTiles(
  mobility: CenterMobility | null,
  center: Pick<CenterTopMobilityCardV1, "ser" | "decision"> | null,
): TransportFooterTile[] {
  const car = mobility?.modules.car ?? null;
  const walkingMinutes = mobility?.origin_dependent.walking_eta_min ?? null;
  const distance = center?.decision.distance_m ?? null;
  const serCopy = buildSerCopy(car?.ser_enabled ?? false, car?.ser_zone_name ?? null)
    ?? buildSerCopy(center?.ser?.enabled ?? false, center?.ser?.zone_name ?? null);

  return [
    {
      mode: "car",
      label: "COCHE",
      body:
        car && car.eta_min !== null
          ? joinParts([`${car.eta_min} min`, formatDistanceCompact(car.distance_m ?? distance), serCopy])
          : serCopy ?? "Sin estimacion fiable en coche",
    },
    {
      mode: "walk",
      label: walkingMinutes !== null ? "A PIE" : "DISTANCIA",
      body:
        walkingMinutes !== null
          ? joinParts([`${walkingMinutes} min`, formatDistanceCompact(distance)])
          : formatDistanceCompact(distance) ?? "Sin distancia estimada",
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
): SecondaryCardHighlightRow | null {
  if (!highlight) return null;
  return buildHighlightRowFromSummary(highlight);
}


