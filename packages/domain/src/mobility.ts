import type {
  BikeModuleV1,
  BusModuleV1,
  CarModuleV1,
  CenterMobility,
  CenterMobilitySummaryV1,
  EmtRealtimeArrival,
  MetroModuleV1,
  MobilityConfidence,
  MobilityHighlightV1,
  MobilityModuleState,
  MobilityOption,
  MobilityRealtimeStatus,
  OriginDependentLayerV1,
  OriginResolvedV1,
  RealtimeLayerV1,
  StaticBicimadAnchorV1,
  StaticParkingAnchorV1,
  StaticTransportAnchorsV1,
  StaticTransportStationAnchorV1,
  StaticTransportStopAnchorV1,
} from "@alabiblio/contracts/mobility";
import type {
  CenterDecisionSummary,
  CenterScheduleSummary,
  CenterSerInfo,
  UserLocationInput,
} from "@alabiblio/contracts/centers";
import { haversineDistanceMeters } from "@alabiblio/geo/distance";

const WALKING_METERS_PER_MINUTE = 83;
const EMT_METERS_PER_MINUTE = 290;
const BICI_METERS_PER_MINUTE = 220;
const CAR_METERS_PER_MINUTE = 420;
const MAX_ORIGIN_STOP_DISTANCE_M = 700;
const MAX_DESTINATION_STOP_DISTANCE_M = 500;
const MAX_BIKE_ACCESS_DISTANCE_M = 500;

export interface DecisionEmtStop {
  id: string;
  name: string;
  distance_m: number;
  lat: number;
  lon: number;
  lines: string[];
}

export interface DecisionBicimadStation {
  id: string;
  name: string;
  distance_m: number;
  lat: number;
  lon: number;
  station_number: string;
  total_bases: number | null;
  station_state: string | null;
  bikes_available?: number | null;
  docks_available?: number | null;
}

export interface DecisionMetroStation {
  id: string;
  name: string;
  distance_m: number;
  lat: number;
  lon: number;
  lines: string[];
}

export interface DecisionParking {
  id: string;
  name: string;
  distance_m: number;
  lat: number;
  lon: number;
}

export interface TripCentricMobilityInput {
  center: { lat: number | null; lon: number | null };
  schedule: Pick<CenterScheduleSummary, "is_open_now" | "schedule_confidence_label">;
  userLocation: UserLocationInput | null;
  origin?: {
    kind: "geolocation" | "manual_address" | "preset_area" | null;
    label: string | null;
  } | null;
  ser?: Pick<CenterSerInfo, "enabled" | "zone_name"> | null;
  originEmtStops: DecisionEmtStop[];
  destinationEmtStops: DecisionEmtStop[];
  originBicimadStations: DecisionBicimadStation[];
  destinationBicimadStations: DecisionBicimadStation[];
  originMetroStations?: DecisionMetroStation[];
  destinationMetroStations?: DecisionMetroStation[];
  destinationParkings?: DecisionParking[];
  realtimeByStopId: Map<string, EmtRealtimeArrival[]>;
  emtRealtimeStatus?: MobilityRealtimeStatus;
  emtRealtimeFetchedAt?: string | null;
  fetchedAt?: string;
}

function roundMinutes(value: number): number {
  return Math.max(1, Math.round(value));
}

function roundDistance(value: number): number {
  return Number(value.toFixed(1));
}

function confidenceRank(confidence: MobilityConfidence): number {
  return confidence === "high" ? 0 : confidence === "medium" ? 1 : 2;
}

function moduleStateRank(state: MobilityModuleState): number {
  switch (state) {
    case "ok": return 0;
    case "partial": return 1;
    case "degraded_upstream": return 2;
    case "degraded_missing_anchor": return 3;
    default: return 4;
  }
}

function buildAnchor(input: {
  id: string | null;
  name: string;
  distance_m: number;
  lat: number | null;
  lon: number | null;
}) {
  return {
    id: input.id,
    name: input.name,
    distance_m: roundDistance(input.distance_m),
    lat: input.lat,
    lon: input.lon,
  };
}

function toStopAnchor(stop: DecisionEmtStop | null): StaticTransportStopAnchorV1 | null {
  if (!stop) return null;
  return {
    id: stop.id,
    name: stop.name,
    distance_m: roundDistance(stop.distance_m),
    lines: stop.lines.slice(0, 4),
    lat: stop.lat,
    lon: stop.lon,
  };
}

function toStationAnchor(station: DecisionMetroStation | null): StaticTransportStationAnchorV1 | null {
  if (!station) return null;
  return {
    id: station.id,
    name: station.name,
    distance_m: roundDistance(station.distance_m),
    lines: station.lines.slice(0, 2),
    lat: station.lat,
    lon: station.lon,
  };
}

function toBicimadAnchor(station: DecisionBicimadStation | null): StaticBicimadAnchorV1 | null {
  if (!station) return null;
  return {
    id: station.id,
    name: station.name,
    distance_m: roundDistance(station.distance_m),
    station_number: station.station_number,
    lat: station.lat,
    lon: station.lon,
  };
}

function toParkingAnchor(parking: DecisionParking | null): StaticParkingAnchorV1 | null {
  if (!parking) return null;
  return {
    id: parking.id,
    name: parking.name,
    distance_m: roundDistance(parking.distance_m),
    lat: parking.lat,
    lon: parking.lon,
  };
}

export function buildStaticTransportAnchors(input: {
  destinationEmtStops: DecisionEmtStop[];
  destinationMetroStations: DecisionMetroStation[];
  destinationBicimadStations: DecisionBicimadStation[];
  destinationParkings?: DecisionParking[];
}): StaticTransportAnchorsV1 {
  return {
    emt_destination_stops: input.destinationEmtStops.slice(0, 4).map((v) => toStopAnchor(v)).filter((v): v is StaticTransportStopAnchorV1 => Boolean(v)),
    metro_destination_stations: input.destinationMetroStations.slice(0, 4).map((v) => toStationAnchor(v)).filter((v): v is StaticTransportStationAnchorV1 => Boolean(v)),
    bicimad_destination_station: toBicimadAnchor(input.destinationBicimadStations[0] ?? null),
    parking_candidates: (input.destinationParkings ?? []).slice(0, 3).map((v) => toParkingAnchor(v)).filter((v): v is StaticParkingAnchorV1 => Boolean(v)),
  };
}

function buildWalkingMinutes(input: TripCentricMobilityInput): number | null {
  if (!input.userLocation || input.center.lat === null || input.center.lon === null) return null;
  return roundMinutes(haversineDistanceMeters(input.userLocation.lat, input.userLocation.lon, input.center.lat, input.center.lon) / WALKING_METERS_PER_MINUTE);
}

function buildCarEtaMinutes(input: TripCentricMobilityInput): number | null {
  if (!input.userLocation || input.center.lat === null || input.center.lon === null) return null;
  return roundMinutes(haversineDistanceMeters(input.userLocation.lat, input.userLocation.lon, input.center.lat, input.center.lon) / CAR_METERS_PER_MINUTE);
}

function buildDirectDistanceMeters(input: TripCentricMobilityInput): number | null {
  if (!input.userLocation || input.center.lat === null || input.center.lon === null) return null;
  return roundDistance(haversineDistanceMeters(input.userLocation.lat, input.userLocation.lon, input.center.lat, input.center.lon));
}

function scoreOption(totalMinutes: number, confidence: MobilityConfidence, accessPenalty: number, realtimeBonus: number): number {
  return Number((1000 - totalMinutes * 12 - accessPenalty * 0.25 - confidenceRank(confidence) * 90 + realtimeBonus).toFixed(2));
}

function getTopRealtimeArrival(stopId: string, line: string, realtimeByStopId: Map<string, EmtRealtimeArrival[]>): EmtRealtimeArrival | null {
  return (realtimeByStopId.get(stopId) ?? []).filter((v) => v.line === line).sort((a, b) => a.minutes - b.minutes)[0] ?? null;
}

function getBestRealtimeArrivalByStop(stopId: string, realtimeByStopId: Map<string, EmtRealtimeArrival[]>): EmtRealtimeArrival | null {
  return (realtimeByStopId.get(stopId) ?? []).slice().sort((a, b) => a.minutes - b.minutes)[0] ?? null;
}

function buildBusOptions(input: TripCentricMobilityInput): MobilityOption[] {
  if (!input.userLocation || input.center.lat === null || input.center.lon === null) return [];
  const directDistance = haversineDistanceMeters(input.userLocation.lat, input.userLocation.lon, input.center.lat, input.center.lon);
  const candidates: MobilityOption[] = [];
  for (const originStop of input.originEmtStops.slice(0, 6)) {
    if (originStop.distance_m > MAX_ORIGIN_STOP_DISTANCE_M) continue;
    for (const destinationStop of input.destinationEmtStops.slice(0, 4)) {
      if (destinationStop.distance_m > MAX_DESTINATION_STOP_DISTANCE_M) continue;
      const sharedLines = originStop.lines.filter((line) => destinationStop.lines.includes(line));
      for (const line of sharedLines.slice(0, 2)) {
        const topArrival = getTopRealtimeArrival(originStop.id, line, input.realtimeByStopId);
        const accessOrigin = roundMinutes(originStop.distance_m / WALKING_METERS_PER_MINUTE);
        const accessDestination = roundMinutes(destinationStop.distance_m / WALKING_METERS_PER_MINUTE);
        const waitMinutes = topArrival?.minutes ?? 8;
        const inVehicleMinutes = roundMinutes(directDistance / EMT_METERS_PER_MINUTE) + 4;
        const totalMinutes = accessOrigin + waitMinutes + inVehicleMinutes + accessDestination;
        const confidence: MobilityConfidence = topArrival ? (originStop.distance_m <= 350 && destinationStop.distance_m <= 350 ? "high" : "medium") : "low";
        candidates.push({
          type: "bus",
          score: scoreOption(totalMinutes, confidence, originStop.distance_m + destinationStop.distance_m, topArrival ? 80 : 0),
          confidence,
          origin: buildAnchor(originStop),
          destination: buildAnchor(destinationStop),
          realtime: {
            status: topArrival ? "available" : input.emtRealtimeStatus ?? "unavailable",
            arrivals: topArrival ? [{ line: topArrival.line, destination: topArrival.destination, minutes: topArrival.minutes }] : [],
            source_timestamp: input.emtRealtimeFetchedAt ?? null,
          },
          route_label: line,
          estimated_access_minutes: accessOrigin + accessDestination,
          estimated_in_vehicle_minutes: inVehicleMinutes,
          estimated_total_minutes: totalMinutes,
        });
      }
    }
  }
  return [...candidates]
    .sort((a, b) => a.estimated_total_minutes - b.estimated_total_minutes || b.score - a.score)
    .filter((option, index, all) => all.findIndex((candidate) => candidate.route_label === option.route_label && candidate.origin.id === option.origin.id && candidate.destination.id === option.destination.id) === index)
    .slice(0, 2);
}

function buildBikeOptions(input: TripCentricMobilityInput): MobilityOption[] {
  if (!input.userLocation || input.center.lat === null || input.center.lon === null) return [];
  const directDistance = haversineDistanceMeters(input.userLocation.lat, input.userLocation.lon, input.center.lat, input.center.lon);
  if (directDistance < 1200 || directDistance > 8000) return [];
  const candidates: MobilityOption[] = [];
  for (const originStation of input.originBicimadStations.slice(0, 4)) {
    if (originStation.distance_m > MAX_BIKE_ACCESS_DISTANCE_M) continue;
    for (const destinationStation of input.destinationBicimadStations.slice(0, 4)) {
      if (destinationStation.distance_m > MAX_BIKE_ACCESS_DISTANCE_M) continue;
      const accessOrigin = roundMinutes(originStation.distance_m / WALKING_METERS_PER_MINUTE);
      const accessDestination = roundMinutes(destinationStation.distance_m / WALKING_METERS_PER_MINUTE);
      const inVehicleMinutes = roundMinutes(directDistance / BICI_METERS_PER_MINUTE);
      const totalMinutes = accessOrigin + accessDestination + inVehicleMinutes;
      const hasRealtime = originStation.bikes_available !== undefined && originStation.bikes_available !== null && destinationStation.docks_available !== undefined && destinationStation.docks_available !== null;
      const viableRealtime = (originStation.bikes_available ?? 0) > 0 && (destinationStation.docks_available ?? 0) > 0;
      const confidence: MobilityConfidence = hasRealtime ? (viableRealtime ? "medium" : "low") : "low";
      candidates.push({
        type: "bike",
        score: scoreOption(totalMinutes, confidence, originStation.distance_m + destinationStation.distance_m, viableRealtime ? 40 : -120),
        confidence,
        origin: buildAnchor(originStation),
        destination: buildAnchor(destinationStation),
        realtime: hasRealtime ? { status: "available", bikes_available: originStation.bikes_available ?? undefined, docks_available: destinationStation.docks_available ?? undefined } : { status: "unavailable" },
        route_label: "Bicimad",
        estimated_access_minutes: accessOrigin + accessDestination,
        estimated_in_vehicle_minutes: inVehicleMinutes,
        estimated_total_minutes: totalMinutes,
      });
    }
  }
  return [...candidates].sort((a, b) => confidenceRank(a.confidence) - confidenceRank(b.confidence) || a.estimated_total_minutes - b.estimated_total_minutes).slice(0, 2);
}

function buildMetroOptions(input: TripCentricMobilityInput): MobilityOption[] {
  if (!input.originMetroStations || !input.destinationMetroStations) return [];
  const candidates: MobilityOption[] = [];
  for (const originStation of input.originMetroStations.slice(0, 2)) {
    for (const destinationStation of input.destinationMetroStations.slice(0, 2)) {
      const accessOrigin = roundMinutes(originStation.distance_m / WALKING_METERS_PER_MINUTE);
      const accessDestination = roundMinutes(destinationStation.distance_m / WALKING_METERS_PER_MINUTE);
      const totalMinutes = accessOrigin + accessDestination + 12;
      const sharedLines = originStation.lines.filter((line) => destinationStation.lines.includes(line));
      const confidence: MobilityConfidence = sharedLines.length > 0 ? "medium" : "low";
      candidates.push({
        type: "metro",
        score: scoreOption(totalMinutes, confidence, originStation.distance_m + destinationStation.distance_m, sharedLines.length > 0 ? 20 : 0),
        confidence,
        origin: buildAnchor(originStation),
        destination: buildAnchor(destinationStation),
        route_label: sharedLines[0] ?? destinationStation.lines[0] ?? "Metro",
        estimated_access_minutes: accessOrigin + accessDestination,
        estimated_in_vehicle_minutes: 12,
        estimated_total_minutes: totalMinutes,
      });
    }
  }
  return [...candidates]
    .sort((a, b) => confidenceRank(a.confidence) - confidenceRank(b.confidence) || a.estimated_total_minutes - b.estimated_total_minutes || b.score - a.score)
    .filter((option, index, all) => all.findIndex((candidate) => candidate.origin.id === option.origin.id && candidate.destination.id === option.destination.id && candidate.route_label === option.route_label) === index)
    .slice(0, 2);
}

function buildOrigin(input: TripCentricMobilityInput): OriginResolvedV1 {
  return {
    available: input.userLocation !== null,
    kind: input.origin?.kind ?? null,
    label: input.origin?.label ?? (input.userLocation ? "Origen activo" : null),
    lat: input.userLocation?.lat ?? null,
    lon: input.userLocation?.lon ?? null,
  };
}

function buildOriginLayer(input: TripCentricMobilityInput): OriginDependentLayerV1 {
  return {
    origin_coordinates: input.userLocation ? { lat: input.userLocation.lat, lon: input.userLocation.lon } : null,
    origin_emt_stops: input.originEmtStops.slice(0, 6).map((v) => toStopAnchor(v)).filter((v): v is StaticTransportStopAnchorV1 => Boolean(v)),
    origin_metro_station: toStationAnchor(input.originMetroStations?.[0] ?? null),
    origin_bicimad_station: toBicimadAnchor(input.originBicimadStations[0] ?? null),
    estimated_car_eta_min: buildCarEtaMinutes(input),
    walking_eta_min: buildWalkingMinutes(input),
  };
}

function buildRealtimeLayer(input: TripCentricMobilityInput, busOption: MobilityOption | null, bikeOption: MobilityOption | null): RealtimeLayerV1 {
  return {
    emt_next_arrivals: busOption?.realtime?.arrivals ?? [],
    emt_realtime_status: input.emtRealtimeStatus ?? "unconfigured",
    emt_realtime_fetched_at: input.emtRealtimeFetchedAt ?? null,
    bicimad_bikes_available: bikeOption?.realtime?.bikes_available ?? null,
    bicimad_docks_available: bikeOption?.realtime?.docks_available ?? null,
    bicimad_realtime_status: bikeOption?.realtime?.status ?? ((input.originBicimadStations.length > 0 || input.destinationBicimadStations.length > 0) ? "unavailable" : "empty"),
    bicimad_realtime_fetched_at: null,
    metro_realtime_status: "unconfigured",
  };
}

function buildCarModule(originLayer: OriginDependentLayerV1, ser: Pick<CenterSerInfo, "enabled" | "zone_name"> | null | undefined): CarModuleV1 {
  if (originLayer.estimated_car_eta_min === null) {
    return { state: "unavailable", eta_min: null, ser_enabled: ser?.enabled ?? false, ser_zone_name: ser?.zone_name ?? null, distance_m: null };
  }
  return {
    state: ser ? "ok" : "partial",
    eta_min: originLayer.estimated_car_eta_min,
    ser_enabled: ser?.enabled ?? false,
    ser_zone_name: ser?.zone_name ?? null,
    distance_m: null,
  };
}

function buildBusModule(input: TripCentricMobilityInput, bestBus: MobilityOption | null): BusModuleV1 {
  const originStop = toStopAnchor(bestBus ? { id: bestBus.origin.id ?? "origin-stop", name: bestBus.origin.name, distance_m: bestBus.origin.distance_m, lat: bestBus.origin.lat ?? 0, lon: bestBus.origin.lon ?? 0, lines: bestBus.route_label ? [bestBus.route_label] : [] } : input.originEmtStops[0] ?? null);
  const destinationStop = toStopAnchor(bestBus ? { id: bestBus.destination.id ?? "destination-stop", name: bestBus.destination.name, distance_m: bestBus.destination.distance_m, lat: bestBus.destination.lat ?? 0, lon: bestBus.destination.lon ?? 0, lines: bestBus.route_label ? [bestBus.route_label] : [] } : input.destinationEmtStops[0] ?? null);
  if (!originStop && !destinationStop) {
    return { state: "unavailable", selected_line: null, selected_destination: null, origin_stop: null, destination_stop: null, next_arrival_min: null, estimated_travel_min: null, estimated_total_min: null, realtime_status: input.emtRealtimeStatus ?? "unconfigured", fetched_at: input.emtRealtimeFetchedAt ?? null };
  }
  if (!bestBus) {
    const fallbackOriginRaw = input.originEmtStops.find((stop) => getBestRealtimeArrivalByStop(stop.id, input.realtimeByStopId)) ?? input.originEmtStops[0] ?? null;
    const fallbackOriginStop = toStopAnchor(fallbackOriginRaw);
    const fallbackArrival = fallbackOriginStop ? getBestRealtimeArrivalByStop(fallbackOriginStop.id, input.realtimeByStopId) : null;
    return {
      state: fallbackOriginStop && fallbackArrival ? "degraded_missing_anchor" : destinationStop ? "degraded_missing_anchor" : "partial",
      selected_line: fallbackArrival?.line ?? null,
      selected_destination: fallbackArrival?.destination ?? null,
      origin_stop: fallbackOriginStop ?? originStop,
      destination_stop: null,
      next_arrival_min: fallbackArrival?.minutes ?? null,
      estimated_travel_min: null,
      estimated_total_min: null,
      realtime_status: fallbackArrival ? "available" : input.emtRealtimeStatus ?? "unconfigured",
      fetched_at: input.emtRealtimeFetchedAt ?? null,
    };
  }
  const arrival = bestBus.realtime?.arrivals?.[0];
  return {
    state: arrival ? "ok" : input.emtRealtimeStatus === "error" ? "degraded_upstream" : "partial",
    selected_line: bestBus.route_label,
    selected_destination: arrival?.destination ?? null,
    origin_stop: originStop,
    destination_stop: destinationStop,
    next_arrival_min: arrival?.minutes ?? null,
    estimated_travel_min: bestBus.estimated_in_vehicle_minutes,
    estimated_total_min: bestBus.estimated_total_minutes,
    realtime_status: bestBus.realtime?.status ?? input.emtRealtimeStatus ?? "unconfigured",
    fetched_at: input.emtRealtimeFetchedAt ?? null,
  };
}

function buildBikeModule(input: TripCentricMobilityInput, bestBike: MobilityOption | null): BikeModuleV1 {
  const origin = bestBike ? input.originBicimadStations.find((v) => v.id === bestBike.origin.id) ?? null : input.originBicimadStations[0] ?? null;
  const destination = bestBike ? input.destinationBicimadStations.find((v) => v.id === bestBike.destination.id) ?? null : input.destinationBicimadStations[0] ?? null;
  if (!origin && !destination) {
    return { state: "unavailable", eta_min: null, origin_station: null, destination_station: null, bikes_available: null, docks_available: null, realtime_status: "empty", fetched_at: null };
  }
  const hasRealtime = origin !== null && destination !== null && origin.bikes_available !== undefined && origin.bikes_available !== null && destination.docks_available !== undefined && destination.docks_available !== null;
  return {
    state: bestBike ? (hasRealtime ? "ok" : "partial") : "degraded_missing_anchor",
    eta_min: bestBike?.estimated_total_minutes ?? null,
    origin_station: toBicimadAnchor(origin),
    destination_station: toBicimadAnchor(destination),
    bikes_available: origin?.bikes_available ?? null,
    docks_available: destination?.docks_available ?? null,
    realtime_status: hasRealtime ? "available" : origin || destination ? "unavailable" : "empty",
    fetched_at: null,
  };
}

function buildMetroModule(input: TripCentricMobilityInput, bestMetro: MobilityOption | null): MetroModuleV1 {
  const originStation = bestMetro ? input.originMetroStations?.find((v) => v.id === bestMetro.origin.id) ?? null : input.originMetroStations?.[0] ?? null;
  const destinationStation = bestMetro ? input.destinationMetroStations?.find((v) => v.id === bestMetro.destination.id) ?? null : input.destinationMetroStations?.[0] ?? null;
  const lineLabels = Array.from(
    new Set(
      [
        ...(originStation?.lines ?? []),
        ...(destinationStation?.lines ?? []),
      ].filter(Boolean),
    ),
  ).slice(0, 3);
  if (!originStation && !destinationStation) {
    return { state: "unavailable", eta_min: null, origin_station: null, destination_station: null, line_labels: [], realtime_status: "unconfigured" };
  }
  return {
    state: bestMetro ? "ok" : "partial",
    eta_min: bestMetro?.estimated_total_minutes ?? null,
    origin_station: toStationAnchor(originStation),
    destination_station: toStationAnchor(destinationStation),
    line_labels: lineLabels,
    realtime_status: "unconfigured",
  };
}

function buildHighlight(mode: MobilityHighlightV1["mode"], label: string, confidence: MobilityConfidence): MobilityHighlightV1 {
  return { mode, label, confidence };
}

function buildMobilityHighlightsLegacy(input: { car: CarModuleV1; bus: BusModuleV1; bike: BikeModuleV1; metro: MetroModuleV1 }) {
  const candidates: Array<{ rank: number; item: MobilityHighlightV1 }> = [];
  if (input.car.eta_min !== null) candidates.push({ rank: moduleStateRank(input.car.state) * 100 + input.car.eta_min, item: buildHighlight("car", `Coche ${input.car.eta_min} min · ${input.car.ser_enabled ? `SER ${input.car.ser_zone_name ?? "activa"}` : "SER sin dato"}`, input.car.state === "ok" ? "medium" : "low") });
  if (input.bus.selected_line || input.bus.origin_stop) candidates.push({ rank: moduleStateRank(input.bus.state) * 100 + (input.bus.next_arrival_min ?? 99), item: buildHighlight("bus", input.bus.selected_line ? `Bus ${input.bus.selected_line} · ${input.bus.next_arrival_min !== null ? `${input.bus.next_arrival_min} min` : "sin realtime"}` : "Bus · sin linea util", input.bus.state === "ok" ? "high" : input.bus.state === "partial" ? "medium" : "low") });
  if (input.bike.origin_station || input.bike.destination_station) candidates.push({ rank: moduleStateRank(input.bike.state) * 100 + (input.bike.eta_min ?? 99), item: buildHighlight("bike", input.bike.eta_min !== null ? `Bici ${input.bike.eta_min} min · ×${input.bike.bikes_available ?? "-"}` : `Bici · ×${input.bike.bikes_available ?? "-"}`, input.bike.state === "ok" ? "medium" : "low") });
  if (input.metro.origin_station || input.metro.destination_station) candidates.push({ rank: moduleStateRank(input.metro.state) * 100 + (input.metro.eta_min ?? 99), item: buildHighlight("metro", input.metro.eta_min !== null ? `Metro ${input.metro.eta_min} min` : `Metro · ${input.metro.origin_station?.name ?? "sin dato"} -> ${input.metro.destination_station?.name ?? "sin dato"}`, input.metro.state === "ok" ? "medium" : "low") });
  const sorted = candidates.sort((a, b) => a.rank - b.rank).map((v) => v.item);
  return { primary: sorted[0] ?? null, secondary: sorted[1] ?? null };
}

void buildMobilityHighlightsLegacy;

function buildMobilityHighlights(input: { car: CarModuleV1; bus: BusModuleV1; bike: BikeModuleV1; metro: MetroModuleV1 }) {
  const candidates: Array<{ rank: number; item: MobilityHighlightV1 }> = [];

  if (input.car.eta_min !== null) {
    const carLabel = [
      `Coche ${input.car.eta_min} min`,
      input.car.distance_m !== null
        ? input.car.distance_m < 1000
          ? `${Math.round(input.car.distance_m)} m`
          : `${(input.car.distance_m / 1000).toFixed(1)} km`
        : null,
      input.car.ser_enabled ? `SER ${input.car.ser_zone_name ?? "activa"}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" - ");
    candidates.push({
      rank: moduleStateRank(input.car.state) * 100 + input.car.eta_min,
      item: buildHighlight("car", carLabel, input.car.state === "ok" ? "medium" : "low"),
    });
  }

  if (input.bus.selected_line || input.bus.origin_stop) {
    const busLabel = input.bus.selected_line
      ? `Bus ${input.bus.selected_line} - ${
          input.bus.next_arrival_min !== null
            ? `espera ${input.bus.next_arrival_min} min`
            : input.bus.estimated_total_min !== null
              ? "llegada estimada"
              : "parada cercana"
        }`
      : "Bus - parada cercana";
    candidates.push({
      rank: moduleStateRank(input.bus.state) * 100 + (input.bus.estimated_total_min ?? input.bus.next_arrival_min ?? 99),
      item: buildHighlight("bus", busLabel, input.bus.state === "ok" ? "high" : input.bus.state === "partial" ? "medium" : "low"),
    });
  }

  if (input.bike.origin_station || input.bike.destination_station) {
    const bikeLabel = input.bike.eta_min !== null
      ? `Bici ${input.bike.eta_min} min - ${input.bike.bikes_available ?? "-"} bicis cerca`
      : `Bici - ${input.bike.bikes_available ?? "-"} bicis cerca`;
    candidates.push({
      rank: moduleStateRank(input.bike.state) * 100 + (input.bike.eta_min ?? 99),
      item: buildHighlight("bike", bikeLabel, input.bike.state === "ok" ? "medium" : "low"),
    });
  }

  if (input.metro.origin_station || input.metro.destination_station) {
    const metroLabel = input.metro.eta_min !== null
      ? `Metro ${input.metro.eta_min} min - estacion cercana`
      : `Metro - ${input.metro.origin_station?.name ?? "sin estacion clara"}`;
    candidates.push({
      rank: moduleStateRank(input.metro.state) * 100 + (input.metro.eta_min ?? 99),
      item: buildHighlight("metro", metroLabel, input.metro.state === "ok" ? "medium" : "low"),
    });
  }

  const sorted = candidates.sort((a, b) => a.rank - b.rank).map((v) => v.item);
  return { primary: sorted[0] ?? null, secondary: sorted[1] ?? null };
}

function buildSummary(input: { schedule: Pick<CenterScheduleSummary, "is_open_now">; walkingMinutes: number | null; car: CarModuleV1; bus: BusModuleV1; bike: BikeModuleV1; metro: MetroModuleV1 }): CenterMobilitySummaryV1 {
  const candidates: Array<{ mode: CenterMobilitySummaryV1["best_mode"]; eta: number; confidence: MobilityConfidence; state: MobilityModuleState; rationale: string }> = [];
  if (input.car.eta_min !== null) candidates.push({ mode: "car", eta: input.car.eta_min, confidence: input.car.state === "ok" ? "medium" : "low", state: input.car.state, rationale: input.car.ser_enabled ? "Coche con contexto SER" : "Coche estimado por distancia" });
  if ((input.bus.state === "ok" || input.bus.state === "partial") && input.bus.origin_stop) candidates.push({
    mode: "bus",
    eta: input.bus.estimated_total_min ?? input.bus.next_arrival_min ?? 99,
    confidence: input.bus.state === "ok" ? "high" : "medium",
    state: input.bus.state,
    rationale:
      input.bus.next_arrival_min !== null
        ? "EMT con llegada proxima"
        : input.bus.estimated_total_min !== null
          ? "EMT con llegada estimada"
          : "EMT con parada util",
  });
  if (input.bike.origin_station) candidates.push({ mode: "bike", eta: input.bike.eta_min ?? 99, confidence: input.bike.state === "ok" ? "medium" : "low", state: input.bike.state, rationale: input.bike.bikes_available !== null && input.bike.docks_available !== null ? "BiciMAD con stock y anclaje" : "BiciMAD con anchors utiles" });
  if (input.metro.origin_station) candidates.push({ mode: "metro", eta: input.metro.eta_min ?? 99, confidence: input.metro.state === "ok" ? "medium" : "low", state: input.metro.state, rationale: "Metro aproximado por anchors" });
  const best = candidates.sort((a, b) => moduleStateRank(a.state) - moduleStateRank(b.state) || a.eta - b.eta)[0];
  if (!best) {
    if (input.walkingMinutes !== null) return { best_mode: "walk", best_time_minutes: input.walkingMinutes, confidence: "high", rationale: [input.schedule.is_open_now ? "Centro abierto ahora" : "Revisa horario", "Fallback andando"] };
    return { best_mode: null, best_time_minutes: null, confidence: "low", rationale: [input.schedule.is_open_now ? "Centro abierto ahora" : "Sin origen suficiente"] };
  }
  return { best_mode: best.mode, best_time_minutes: best.eta, confidence: best.confidence, rationale: [input.schedule.is_open_now ? "Centro abierto ahora" : "Revisa horario", best.rationale] };
}

function buildDegradedModes(input: { car: CarModuleV1; bus: BusModuleV1; bike: BikeModuleV1; metro: MetroModuleV1 }): Array<"car" | "bus" | "bike" | "metro"> {
  const degraded: Array<"car" | "bus" | "bike" | "metro"> = [];
  if (input.car.state !== "ok") degraded.push("car");
  if (input.bus.state !== "ok") degraded.push("bus");
  if (input.bike.state !== "ok") degraded.push("bike");
  if (input.metro.state !== "ok") degraded.push("metro");
  return degraded;
}

export function buildCenterMobility(input: TripCentricMobilityInput): CenterMobility {
  const origin = buildOrigin(input);
  const origin_dependent = buildOriginLayer(input);
  const busOptions = buildBusOptions(input);
  const bikeOptions = buildBikeOptions(input);
  const metroOptions = buildMetroOptions(input);
  const car = buildCarModule(origin_dependent, input.ser);
  car.distance_m = buildDirectDistanceMeters(input);
  const bus = buildBusModule(input, busOptions[0] ?? null);
  const bike = buildBikeModule(input, bikeOptions[0] ?? null);
  const metro = buildMetroModule(input, metroOptions[0] ?? null);
  const realtime = buildRealtimeLayer(input, busOptions[0] ?? null, bikeOptions[0] ?? null);
  const summary = buildSummary({ schedule: input.schedule, walkingMinutes: origin_dependent.walking_eta_min, car, bus, bike, metro });
  return {
    origin,
    origin_dependent,
    realtime,
    summary,
    highlights: buildMobilityHighlights({ car, bus, bike, metro }),
    modules: { car, bus, bike, metro },
    degraded_modes: buildDegradedModes({ car, bus, bike, metro }),
    fetched_at: input.fetchedAt ?? new Date().toISOString(),
  };
}

function toSummaryLabel(mode: "walk" | "car" | "bus" | "bike" | "metro", minutes: number): string {
  if (mode === "walk") return `${minutes} min andando`;
  if (mode === "car") return `Coche ${minutes} min`;
  if (mode === "bus") return `Bus ${minutes} min`;
  if (mode === "bike") return `Bici ${minutes} min`;
  return `Metro ${minutes} min`;
}

export function buildDecisionSummary(input: { center: { lat: number | null; lon: number | null }; schedule: Pick<CenterScheduleSummary, "is_open_now" | "schedule_confidence_label">; userLocation: UserLocationInput | null; mobility: CenterMobility }): CenterDecisionSummary {
  if (!input.userLocation || input.center.lat === null || input.center.lon === null) {
    return { best_mode: null, best_time_minutes: null, distance_m: null, confidence: "low", rationale: input.schedule.is_open_now ? ["Centro abierto ahora"] : [], summary_label: null };
  }
  const distanceM = haversineDistanceMeters(input.userLocation.lat, input.userLocation.lon, input.center.lat, input.center.lon);
  const walkingMinutes = input.mobility.origin_dependent.walking_eta_min ?? roundMinutes(distanceM / WALKING_METERS_PER_MINUTE);
  const bestMode = input.mobility.summary.best_mode ?? "walk";
  const bestTimeMinutes = input.mobility.summary.best_time_minutes ?? walkingMinutes;
  return {
    best_mode: bestMode,
    best_time_minutes: bestTimeMinutes,
    distance_m: roundDistance(distanceM),
    confidence: input.mobility.summary.confidence,
    rationale: input.mobility.summary.rationale,
    summary_label: toSummaryLabel(bestMode, bestTimeMinutes),
  };
}

export function sortCenterListItems<T extends { decision: CenterDecisionSummary; is_open_now: boolean | null; schedule_confidence_label: "high" | "medium" | "low"; name: string; id: string }>(items: T[], sortBy: "recommended" | "distance" | "arrival" | "open_now"): T[] {
  return [...items].sort((left, right) => {
    if (sortBy === "distance") {
      const leftDistance = left.decision.distance_m ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.decision.distance_m ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    }
    if (sortBy === "arrival" || sortBy === "recommended" || sortBy === "open_now") {
      const leftArrival = left.decision.best_time_minutes ?? Number.POSITIVE_INFINITY;
      const rightArrival = right.decision.best_time_minutes ?? Number.POSITIVE_INFINITY;
      if (leftArrival !== rightArrival) return leftArrival - rightArrival;
    }
    if (sortBy === "open_now" || sortBy === "recommended") {
      const leftOpen = left.is_open_now ? 0 : 1;
      const rightOpen = right.is_open_now ? 0 : 1;
      if (leftOpen !== rightOpen) return leftOpen - rightOpen;
    }
    if (sortBy === "recommended" && confidenceRank(left.decision.confidence) !== confidenceRank(right.decision.confidence)) {
      return confidenceRank(left.decision.confidence) - confidenceRank(right.decision.confidence);
    }
    const leftDistance = left.decision.distance_m ?? Number.POSITIVE_INFINITY;
    const rightDistance = right.decision.distance_m ?? Number.POSITIVE_INFINITY;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return left.name.localeCompare(right.name, "es") || left.id.localeCompare(right.id);
  });
}
