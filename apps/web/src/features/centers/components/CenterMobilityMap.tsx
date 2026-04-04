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
  };
};

function buildMapData(
  center: Pick<CenterDetailItem, "name" | "lat" | "lon">,
  mobility: CenterMobility,
  origin: UserOrigin | null,
) {
  const points: FeaturePoint[] = [];
  const lines: FeatureLine[] = [];

  if (center.lat === null || center.lon === null) {
    return {
      points: { type: "FeatureCollection" as const, features: points },
      lines: { type: "FeatureCollection" as const, features: lines },
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
    lines.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [origin.lon, origin.lat],
          [center.lon, center.lat],
        ],
      },
      properties: { kind: "origin" },
    });
  }

  const modules = [
    {
      kind: "bus",
      origin: mobility.modules.bus.origin_stop,
      destination: mobility.modules.bus.destination_stop,
    },
    {
      kind: "bike",
      origin: mobility.modules.bike.origin_station,
      destination: mobility.modules.bike.destination_station,
    },
    {
      kind: "metro",
      origin: mobility.modules.metro.origin_station,
      destination: mobility.modules.metro.destination_station,
    },
  ];

  for (const option of modules) {
    if (option.origin?.lat !== null && option.origin?.lat !== undefined && option.origin.lon !== null && option.origin.lon !== undefined) {
      points.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [option.origin.lon, option.origin.lat] },
        properties: { kind: `${option.kind}-origin`, label: option.origin.name },
      });
    }

    if (option.destination?.lat !== null && option.destination?.lat !== undefined && option.destination.lon !== null && option.destination.lon !== undefined) {
      points.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [option.destination.lon, option.destination.lat],
        },
        properties: { kind: `${option.kind}-destination`, label: option.destination.name },
      });
    }

    if (
      option.origin?.lat !== null &&
      option.origin?.lat !== undefined &&
      option.origin.lon !== null &&
      option.origin.lon !== undefined &&
      option.destination?.lat !== null &&
      option.destination?.lat !== undefined &&
      option.destination.lon !== null &&
      option.destination.lon !== undefined
    ) {
      lines.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [option.origin.lon, option.origin.lat],
            [option.destination.lon, option.destination.lat],
          ],
        },
        properties: { kind: option.kind },
      });
    }
  }

  return {
    points: { type: "FeatureCollection" as const, features: points },
    lines: { type: "FeatureCollection" as const, features: lines },
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
            "origin",
            "#c7d2fe",
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
        <h3>Centro, origen y anchors principales</h3>
        <p>{origin ? `${origin.label} visible / ${getSerLabel(ser)}` : getSerLabel(ser)}</p>
      </div>
      <div ref={containerRef} className="detail-screen__map" />
    </section>
  );
}
