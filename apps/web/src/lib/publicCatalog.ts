import type { CenterCatalogItem, PublicCatalogResponse } from "@alabiblio/contracts";
import { useEffect, useMemo, useState } from "react";

export interface RatingPresentation {
  ratingAverage: number | null;
  ratingCount: number;
  aspects: Array<{
    key: "silencio" | "enchufes" | "wifi" | "temperatura" | "limpieza" | "iluminacion";
    label: string;
    value: number | null;
  }>;
}

export interface TransportPresentation {
  id: string;
  mode: "metro" | "bus" | "train" | "walk" | "car";
  title: string;
  detail: string;
  reliabilityLabel: "Texto oficial" | "Heuristica";
  chips: string[];
}

export interface CenterPresentation extends CenterCatalogItem {
  headlineStatus: string;
  scheduleLabel: string;
  occupancyLabel: string;
  occupancyValue: string;
  occupancyProgress: number | null;
  rankingScore: number;
  rankingPosition: number;
  distanceLabel: string | null;
  mapsUrl: string | null;
  rating: RatingPresentation;
  transportOptions: TransportPresentation[];
}

function decodeLatin1Mojibake(value: string): string {
  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function repairText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let current = value.replace(/\u00a0/g, " ").trim();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!/[Ãâ]/.test(current)) {
      break;
    }

    const repaired = decodeLatin1Mojibake(current);

    if (repaired === current) {
      break;
    }

    current = repaired;
  }

  return current.replace(/\s+/g, " ").trim();
}

function toSentenceCase(value: string | null | undefined): string | null {
  const repaired = repairText(value);

  if (!repaired) {
    return null;
  }

  return repaired
    .split(" ")
    .map((token) =>
      token.length <= 3 && token === token.toUpperCase()
        ? token
        : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
    )
    .join(" ");
}

function formatTimeFromIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildScheduleLabel(item: CenterCatalogItem): string {
  const nextChange = formatTimeFromIso(item.schedule.nextChangeAt);

  if (item.schedule.isOpenNow === true) {
    return nextChange ? `Abierta hasta ${nextChange}` : "Abierta ahora";
  }

  if (item.schedule.isOpenNow === false) {
    return nextChange ? `Abre a las ${nextChange}` : "Cerrada ahora";
  }

  return item.schedule.displayText ?? "Horario pendiente de revision";
}

function buildHeadlineStatus(item: CenterCatalogItem): string {
  if (item.schedule.isOpenNow === true) {
    return "Abierta";
  }

  if (item.schedule.isOpenNow === false) {
    return "Cerrada";
  }

  return "Revision manual";
}

function buildOccupancyPresentation(item: CenterCatalogItem): {
  label: string;
  value: string;
  progress: number | null;
} {
  if (item.capacityValue) {
    return {
      label: "Aforo oficial",
      value: `${item.capacityValue} plazas`,
      progress: 0.55,
    };
  }

  return {
    label: "Aforo",
    value: "Sin dato",
    progress: null,
  };
}

function buildMapsUrl(item: CenterCatalogItem): string | null {
  if (item.latitude === null || item.longitude === null) {
    return null;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
}

function parseModeBlock(
  source: string,
  label: string,
  mode: TransportPresentation["mode"],
  reliabilityLabel: TransportPresentation["reliabilityLabel"],
): TransportPresentation | null {
  const regex = new RegExp(`${label}\\s*:\\s*([^.;]+)`, "i");
  const match = source.match(regex);

  if (!match?.[1]) {
    return null;
  }

  const detail = repairText(match[1]) ?? match[1].trim();
  const chips = Array.from(detail.matchAll(/(l[ií]nea\s*\d+|L\d+|C\d+|\d{1,3})/gi))
    .map(([value]) => repairText(value) ?? value)
    .slice(0, 4);

  return {
    id: `${mode}-${label}`,
    mode,
    title:
      mode === "metro"
        ? "Metro"
        : mode === "bus"
          ? "Bus"
          : mode === "train"
            ? "Cercanías"
            : mode === "car"
              ? "En coche"
              : "Ruta",
    detail,
    reliabilityLabel,
    chips,
  };
}

function buildTransportOptions(item: CenterCatalogItem): TransportPresentation[] {
  const source = repairText(item.transportText) ?? "";
  const options = [
    parseModeBlock(source, "Metro", "metro", "Texto oficial"),
    parseModeBlock(source, "Autobuses EMT", "bus", "Texto oficial"),
    parseModeBlock(source, "Autobuses", "bus", "Texto oficial"),
    parseModeBlock(source, "Bus", "bus", "Texto oficial"),
    parseModeBlock(source, "Cercanías Renfe", "train", "Texto oficial"),
    parseModeBlock(source, "Cercanías", "train", "Texto oficial"),
  ].filter((option): option is TransportPresentation => option !== null);

  if (item.latitude !== null && item.longitude !== null) {
    options.push({
      id: "car-route",
      mode: "car",
      title: "Ruta directa",
      detail: "Abrir navegación en mapas hacia este centro.",
      reliabilityLabel: "Heuristica",
      chips: ["Maps"],
    });
  }

  if (options.length > 0) {
    return options.slice(0, 4);
  }

  return [
    {
      id: "walk-generic",
      mode: "walk",
      title: "Cómo llegar",
      detail: source || "Pendiente de estructurar desde la fuente oficial.",
      reliabilityLabel: source ? "Texto oficial" : "Heuristica",
      chips: source ? [] : ["Pendiente"],
    },
  ];
}

function buildRating(item: CenterCatalogItem): RatingPresentation {
  return {
    ratingAverage: item.ratingAverage,
    ratingCount: item.ratingCount,
    aspects: [
      { key: "silencio", label: "Silencio", value: null },
      { key: "enchufes", label: "Enchufes", value: null },
      { key: "wifi", label: "WiFi", value: item.wifi ? 4 : null },
      { key: "temperatura", label: "Temperatura", value: null },
      { key: "limpieza", label: "Limpieza", value: null },
      { key: "iluminacion", label: "Iluminacion", value: null },
    ],
  };
}

function computeRankingScore(item: CenterCatalogItem): number {
  let score = 0;

  if (item.schedule.isOpenNow === true) {
    score += 120;
  } else if (item.schedule.isOpenNow === null) {
    score += 10;
  }

  if (item.accessibility) {
    score += 12;
  }

  if (item.wifi) {
    score += 10;
  }

  if (item.capacityValue) {
    score += Math.min(item.capacityValue / 3, 35);
  }

  if (item.schedule.confidence === "high") {
    score += 20;
  } else if (item.schedule.confidence === "medium") {
    score += 12;
  } else if (item.schedule.confidence === "low") {
    score += 5;
  }

  if (item.transportText) {
    score += 8;
  }

  return score;
}

function enrichItem(item: CenterCatalogItem): CenterPresentation {
  const occupancy = buildOccupancyPresentation(item);

  return {
    ...item,
    name: repairText(item.name) ?? item.name,
    kindLabel: repairText(item.kindLabel) ?? item.kindLabel,
    addressLine: toSentenceCase(item.addressLine),
    district: toSentenceCase(item.district),
    neighborhood: toSentenceCase(item.neighborhood),
    servicesText: repairText(item.servicesText),
    transportText: repairText(item.transportText),
    websiteUrl: repairText(item.websiteUrl),
    headlineStatus: buildHeadlineStatus(item),
    scheduleLabel: buildScheduleLabel(item),
    occupancyLabel: occupancy.label,
    occupancyValue: occupancy.value,
    occupancyProgress: occupancy.progress,
    rankingScore: computeRankingScore(item),
    rankingPosition: 0,
    distanceLabel: null,
    mapsUrl: buildMapsUrl(item),
    rating: buildRating(item),
    transportOptions: buildTransportOptions(item),
  };
}

function buildPresentations(data: PublicCatalogResponse | null): CenterPresentation[] {
  if (!data) {
    return [];
  }

  return data.items
    .map(enrichItem)
    .sort((left, right) => right.rankingScore - left.rankingScore || left.name.localeCompare(right.name, "es"))
    .map((item, index) => ({
      ...item,
      rankingPosition: index + 1,
    }));
}

export function usePublicCatalog() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: PublicCatalogResponse | null;
  }>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/public/catalog");
        const payload = (await response.json()) as PublicCatalogResponse | { message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in payload ? payload.message ?? "Catalog request failed." : "Catalog request failed.",
          );
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            data: payload as PublicCatalogResponse,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Unexpected catalog failure.",
            data: null,
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => buildPresentations(state.data), [state.data]);
  const openNowCount = useMemo(
    () => items.filter((item) => item.schedule.isOpenNow === true).length,
    [items],
  );
  const capacityKnown = useMemo(
    () => items.reduce((total, item) => total + (item.capacityValue ?? 0), 0),
    [items],
  );

  return {
    ...state,
    items,
    topItems: items.slice(0, 3),
    openNowCount,
    capacityKnown,
  };
}
