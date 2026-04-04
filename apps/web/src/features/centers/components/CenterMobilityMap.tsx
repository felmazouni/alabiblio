import type { CenterDetailItem, CenterSerInfo } from "@alabiblio/contracts/centers";
import type { CenterMobility } from "@alabiblio/contracts/mobility";
import type { UserOrigin } from "@alabiblio/contracts/origin";
import maplibregl, {
  Map,
  NavigationControl,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef } from "react";

type CenterMobilityMapProps = {
  center: Pick<CenterDetailItem, "name" | "lat" | "lon">;
  mobility: CenterMobility;
  ser: CenterSerInfo;
  origin: UserOrigin | null;
};

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

type FeaturePoint = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    kind: string;
    label: string;
  };
};

type FeatureLine = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties: {
    kind: string;
    label: string;
  };
};

type RouteLegendItem = {
  kind: string;
  label: string;
};

function pushLine(
  lines: FeatureLine[],
  coordinates: [number, number][],
  kind: string,
  label: string,
) {
  if (coordinates.length < 2) return;
  lines.push({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates,
    },
    properties: { kind, label },
  });
}

function buildMapData(
  center: Pick<CenterDetailItem, "name" | "lat" | "lon">,
  mobility: CenterMobility,
  origin: UserOrigin | null,
) {
  const points: FeaturePoint[] = [];
  const lines: FeatureLine[] = [];
  const legend: RouteLegendItem[] = [];

  if (center.lat === null || center.lon === null) {
    return {
      points: { type: "FeatureCollection" as const, features: points },
      lines: { type: "FeatureCollection" as const, features: lines },
      legend,
    };
  }

  points.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: [center.lon, center.lat] },
    properties: { kind: "center", label: center.name },
  });

  if (origin) {
    points.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [origin.lon, origin.lat] },
      properties: { kind: "origin", label: origin.label },
    });
  }
  const bestMode = mobility.summary.best_mode ?? "walk";

  const appendAnchorPoint = (
    kind: string,
    label: string,
    lat: number | null | undefined,
    lon: number | null | undefined,
  ) => {
    if (lat === null || lat === undefined || lon === null || lon === undefined) return;
    points.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { kind, label },
    });
  };

  const centerCoords: [number, number] = [center.lon, center.lat];
  const originCoords: [number, number] | null =
    origin ? [origin.lon, origin.lat] : null;

  if (bestMode === "bus") {
    const bus = mobility.modules.bus;
    appendAnchorPoint("bus-origin", bus.origin_stop?.name ?? "Parada origen", bus.origin_stop?.lat, bus.origin_stop?.lon);
    appendAnchorPoint("bus-destination", bus.destination_stop?.name ?? "Parada destino", bus.destination_stop?.lat, bus.destination_stop?.lon);
    if (originCoords && bus.origin_stop?.lat !== null && bus.origin_stop?.lat !== undefined && bus.origin_stop.lon !== null && bus.origin_stop.lon !== undefined) {
      pushLine(lines, [originCoords, [bus.origin_stop.lon, bus.origin_stop.lat]], "walk", "Acceso a parada");
      legend.push({ kind: "walk", label: "Acceso andando" });
    }
    if (
      bus.origin_stop?.lat !== null && bus.origin_stop?.lat !== undefined &&
      bus.origin_stop.lon !== null && bus.origin_stop.lon !== undefined &&
      bus.destination_stop?.lat !== null && bus.destination_stop?.lat !== undefined &&
      bus.destination_stop.lon !== null && bus.destination_stop.lon !== undefined
    ) {
      pushLine(lines, [[bus.origin_stop.lon, bus.origin_stop.lat], [bus.destination_stop.lon, bus.destination_stop.lat]], "bus", "Trayecto EMT estimado");
      legend.push({ kind: "bus", label: "Trayecto EMT" });
    }
    if (bus.destination_stop?.lat !== null && bus.destination_stop?.lat !== undefined && bus.destination_stop.lon !== null && bus.destination_stop.lon !== undefined) {
      pushLine(lines, [[bus.destination_stop.lon, bus.destination_stop.lat], centerCoords], "walk", "Llegada final andando");
      legend.push({ kind: "walk", label: "Llegada final" });
    }
  } else if (bestMode === "metro") {
    const metro = mobility.modules.metro;
    appendAnchorPoint("metro-origin", metro.origin_station?.name ?? "Estacion origen", metro.origin_station?.lat, metro.origin_station?.lon);
    appendAnchorPoint("metro-destination", metro.destination_station?.name ?? "Estacion destino", metro.destination_station?.lat, metro.destination_station?.lon);
    if (originCoords && metro.origin_station?.lat !== null && metro.origin_station?.lat !== undefined && metro.origin_station.lon !== null && metro.origin_station.lon !== undefined) {
      pushLine(lines, [originCoords, [metro.origin_station.lon, metro.origin_station.lat]], "walk", "Acceso a estacion");
      legend.push({ kind: "walk", label: "Acceso andando" });
    }
    if (
      metro.origin_station?.lat !== null && metro.origin_station?.lat !== undefined &&
      metro.origin_station.lon !== null && metro.origin_station.lon !== undefined &&
      metro.destination_station?.lat !== null && metro.destination_station?.lat !== undefined &&
      metro.destination_station.lon !== null && metro.destination_station.lon !== undefined
    ) {
      pushLine(lines, [[metro.origin_station.lon, metro.origin_station.lat], [metro.destination_station.lon, metro.destination_station.lat]], "metro", "Trayecto metro estimado");
      legend.push({ kind: "metro", label: "Trayecto metro" });
    }
    if (metro.destination_station?.lat !== null && metro.destination_station?.lat !== undefined && metro.destination_station.lon !== null && metro.destination_station.lon !== undefined) {
      pushLine(lines, [[metro.destination_station.lon, metro.destination_station.lat], centerCoords], "walk", "Llegada final andando");
      legend.push({ kind: "walk", label: "Llegada final" });
    }
  } else if (bestMode === "bike") {
    const bike = mobility.modules.bike;
    appendAnchorPoint("bike-origin", bike.origin_station?.name ?? "Estacion origen", bike.origin_station?.lat, bike.origin_station?.lon);
    appendAnchorPoint("bike-destination", bike.destination_station?.name ?? "Estacion destino", bike.destination_station?.lat, bike.destination_station?.lon);
    if (originCoords && bike.origin_station?.lat !== null && bike.origin_station?.lat !== undefined && bike.origin_station.lon !== null && bike.origin_station.lon !== undefined) {
      pushLine(lines, [originCoords, [bike.origin_station.lon, bike.origin_station.lat]], "walk", "Acceso a estacion BiciMAD");
      legend.push({ kind: "walk", label: "Acceso andando" });
    }
    if (
      bike.origin_station?.lat !== null && bike.origin_station?.lat !== undefined &&
      bike.origin_station.lon !== null && bike.origin_station.lon !== undefined &&
      bike.destination_station?.lat !== null && bike.destination_station?.lat !== undefined &&
      bike.destination_station.lon !== null && bike.destination_station.lon !== undefined
    ) {
      pushLine(lines, [[bike.origin_station.lon, bike.origin_station.lat], [bike.destination_station.lon, bike.destination_station.lat]], "bike", "Trayecto BiciMAD estimado");
      legend.push({ kind: "bike", label: "Trayecto BiciMAD" });
    }
    if (bike.destination_station?.lat !== null && bike.destination_station?.lat !== undefined && bike.destination_station.lon !== null && bike.destination_station.lon !== undefined) {
      pushLine(lines, [[bike.destination_station.lon, bike.destination_station.lat], centerCoords], "walk", "Llegada final andando");
      legend.push({ kind: "walk", label: "Llegada final" });
    }
  } else if (bestMode === "car") {
    if (originCoords) {
      pushLine(lines, [originCoords, centerCoords], "car", "Trayecto coche estimado");
      legend.push({ kind: "car", label: "Trayecto coche" });
    }
  } else if (originCoords) {
    pushLine(lines, [originCoords, centerCoords], "walk", "Trayecto andando estimado");
    legend.push({ kind: "walk", label: "Trayecto andando" });
  }

  return {
    points: { type: "FeatureCollection" as const, features: points },
    lines: { type: "FeatureCollection" as const, features: lines },
    legend: legend.filter((item, index, all) => all.findIndex((entry) => entry.kind === item.kind && entry.label === item.label) === index),
  };
}

function getSerLabel(ser: CenterSerInfo): string {
  if (!ser.enabled) {
    return "Sin SER relevante";
  }

  return ser.zone_name ? `SER ${ser.zone_name}` : "SER activo";
}

export function CenterMobilityMap({ center, mobility, ser, origin }: CenterMobilityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const mapData = useMemo(() => buildMapData(center, mobility, origin), [center, mobility, origin]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || center.lat === null || center.lon === null) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [center.lon, center.lat],
      zoom: 13,
      cooperativeGestures: true,
    });

    map.addControl(new NavigationControl({ visualizePitch: false }), "top-right");
    map.on("load", () => {
      map.addSource("route-lines", {
        type: "geojson",
        data: mapData.lines,
      });
      map.addLayer({
        id: "route-lines",
        type: "line",
        source: "route-lines",
        paint: {
          "line-color": [
            "match",
            ["get", "kind"],
            "bus",
            "#72c6ff",
            "bike",
            "#59d487",
            "metro",
            "#f4ca71",
            "walk",
            "#c7d2fe",
            "car",
            "#ffb45d",
            "#98a5c3",
          ],
          "line-width": 3,
          "line-opacity": 0.68,
        },
      });

      map.addSource("route-points", {
        type: "geojson",
        data: mapData.points,
      });
      map.addLayer({
        id: "route-points",
        type: "circle",
        source: "route-points",
        paint: {
          "circle-radius": [
            "match",
            ["get", "kind"],
            "center",
            8,
            "origin",
            7,
            6,
          ],
          "circle-color": [
            "match",
            ["get", "kind"],
            "center",
            "#ffb45d",
            "origin",
            "#eef2ff",
            "bus-origin",
            "#72c6ff",
            "bus-destination",
            "#72c6ff",
            "bike-origin",
            "#59d487",
            "bike-destination",
            "#59d487",
            "metro-origin",
            "#f4ca71",
            "metro-destination",
            "#f4ca71",
            "#98a5c3",
          ],
          "circle-stroke-color": "#08101b",
          "circle-stroke-width": 2,
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, mapData]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const pointsSource = map.getSource("route-points");
    const linesSource = map.getSource("route-lines");

    if (pointsSource) {
      (pointsSource as GeoJSONSource).setData(mapData.points);
    }

    if (linesSource) {
      (linesSource as GeoJSONSource).setData(mapData.lines);
    }

    const bounds = new maplibregl.LngLatBounds();

    for (const feature of mapData.points.features) {
      bounds.extend(feature.geometry.coordinates);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 44,
        maxZoom: mapData.points.features.length > 2 ? 14.5 : 15.5,
        duration: 0,
      });
    }
  }, [mapData]);

  if (center.lat === null || center.lon === null) {
    return <p className="detail-screen__fallback">Sin coordenadas validas para mostrar el mapa.</p>;
  }

  return (
    <section className="detail-screen__map-section">
      <div className="detail-screen__section-copy">
        <span className="detail-screen__section-label">Mapa util</span>
        <h3>Ruta estimada segun la mejor opcion</h3>
        <p>{origin ? `${origin.label} visible / ${getSerLabel(ser)}` : getSerLabel(ser)}</p>
      </div>
      <div ref={containerRef} className="detail-screen__map" />
      {mapData.legend.length > 0 ? (
        <div className="detail-screen__map-legend">
          {mapData.legend.map((item) => (
            <span key={`${item.kind}-${item.label}`} className={`detail-screen__map-legend-item detail-screen__map-legend-item--${item.kind}`}>
              <span className="detail-screen__map-legend-dot" />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
