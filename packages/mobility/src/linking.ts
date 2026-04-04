import { haversineDistanceMeters } from "@alabiblio/geo/distance";
import type {
  CenterCoordinateRecord,
  CenterTransportLinkRecord,
  TransportNodeRecord,
} from "./types";

const MAX_DISTANCES_METERS = {
  emt_stop: 750,
  metro_station: 1200,
  bicimad_station: 1000,
  parking: 1500,
} as const;

const MAX_LINKS = {
  emt_stop: 5,
  metro_station: 3,
  bicimad_station: 3,
  parking: 3,
} as const;

export function buildCenterTransportLinks(
  centers: CenterCoordinateRecord[],
  nodes: TransportNodeRecord[],
): CenterTransportLinkRecord[] {
  const links: CenterTransportLinkRecord[] = [];

  for (const center of centers) {
    if (center.lat === null || center.lon === null) {
      continue;
    }

    for (const kind of ["emt_stop", "metro_station", "bicimad_station", "parking"] as const) {
      const closestByKind = nodes
        .filter((node) => node.kind === kind)
        .map((node) => ({
          transport_node_id: node.id,
          distance_m: haversineDistanceMeters(
            center.lat,
            center.lon,
            node.lat,
            node.lon,
          ),
        }))
        .filter((node) => node.distance_m <= MAX_DISTANCES_METERS[kind])
        .sort((left, right) => left.distance_m - right.distance_m)
        .slice(0, MAX_LINKS[kind]);

      closestByKind.forEach((node, index) => {
        links.push({
          center_id: center.id,
          transport_node_id: node.transport_node_id,
          distance_m: Number(node.distance_m.toFixed(1)),
          rank_order: index + 1,
        });
      });
    }
  }

  return links;
}
