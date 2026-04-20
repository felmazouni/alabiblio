import type { DataOrigin, TransportOption } from "@alabiblio/contracts";
import {
  Building2,
  Bike,
  Bus,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  PersonStanding,
  ShieldCheck,
  Train,
  TriangleAlert,
  Users,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import {
  fetchBicimadAvailability,
  type BicimadAvailabilityResponse,
  type PublicCenterPresentation,
} from "../lib/publicCatalog";


function modeIcon(mode: TransportOption["mode"]) {
  switch (mode) {
    case "metro":
    case "cercanias":
    case "metro_ligero":
      return Train;
    case "emt_bus":
    case "interurban_bus":
      return Bus;
    case "bicimad":
      return Bike;
    case "car":
      return Car;
  }
}

function modeClasses(mode: TransportOption["mode"]) {
  switch (mode) {
    case "metro":
    case "cercanias":
    case "metro_ligero":
      return {
        card:
          "border-[var(--transport-metro-border)] bg-[var(--transport-metro-bg)]",
        text: "text-[var(--transport-metro-text)]",
      };
    case "emt_bus":
    case "interurban_bus":
      return {
        card:
          "border-[var(--transport-bus-border)] bg-[var(--transport-bus-bg)]",
        text: "text-[var(--transport-bus-text)]",
      };
    case "bicimad":
      return {
        card:
          "border-[var(--transport-bike-border)] bg-[var(--transport-bike-bg)]",
        text: "text-[var(--transport-bike-text)]",
      };
    case "car":
      return {
        card:
          "border-[var(--transport-car-border)] bg-[var(--transport-car-bg)]",
        text: "text-[var(--transport-car-text)]",
      };
  }
}

function statusBadge(status: PublicCenterPresentation["headlineStatus"]) {
  if (status === "Abierta") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-950/45 dark:text-emerald-200";
  }

  if (status === "Cerrada") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/40 dark:bg-rose-950/45 dark:text-rose-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/45 dark:text-amber-200";
}

function originLabel(origin: DataOrigin) {
  switch (origin) {
    case "realtime":
      return "EN VIVO";
    case "official_structured":
      return "OFICIAL";
    case "official_text_parsed":
      return "TEXTO OFICIAL";
    case "heuristic":
      return "ESTIMADO";
    case "not_available":
      return "N/D";
  }
}

function originTone(origin: DataOrigin) {
  switch (origin) {
    case "realtime":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200";
    case "official_structured":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200";
    case "official_text_parsed":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case "heuristic":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/45 dark:text-amber-200";
    case "not_available":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300";
  }
}

function joinPlace(center: PublicCenterPresentation) {
  return [center.neighborhood, center.district].filter(Boolean).join(" - ");
}


function TransportMetric({
  option,
  styles,
}: {
  option: TransportOption;
  styles: { card: string; text: string };
}) {
  if (option.metrics.totalMinutes !== null) {
    return (
      <div className="shrink-0 text-right">
        <p className={cn("text-[1rem] font-bold leading-none", styles.text)}>
          {option.metrics.totalMinutes} min
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">trayecto</p>
        {option.metrics.waitMinutes !== null && option.dataOrigin === "realtime" ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {option.metrics.waitMinutes} min espera
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}

function DetailBox({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string | null;
}) {
  return (
    <div className="rounded-[13px] border border-white/55 bg-white/72 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[12px] font-medium text-foreground">{value}</p>
      {meta ? <p className="mt-1 text-[10px] text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

function TransportOptionCard({ option }: { option: TransportOption }) {
  const Icon = modeIcon(option.mode);
  const styles = modeClasses(option.mode);
  const hasRouteBullets =
    option.mode === "emt_bus" ||
    option.mode === "metro" ||
    option.mode === "cercanias" ||
    option.mode === "metro_ligero";

  return (
    <div className={cn("rounded-[15px] border px-3 py-2.5", styles.card)}>
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[11px] border border-white/55 bg-white/75 dark:border-white/10 dark:bg-white/5">
          <Icon className={cn("size-4", styles.text)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("text-[14px] font-semibold", styles.text)}>
                  {option.title}
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium",
                    originTone(option.dataOrigin),
                  )}
                >
                  {originLabel(option.dataOrigin)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-foreground/90">{option.summary}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                {option.sourceLabel}
              </p>
            </div>

            <TransportMetric option={option} styles={styles} />
          </div>

          {option.lines.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {option.lines.map((line) => (
                <span
                  key={line}
                  className="inline-flex h-5 items-center rounded-md border border-border bg-card px-2 text-[10px] font-medium text-foreground"
                >
                  {line}
                </span>
              ))}
            </div>
          ) : null}

          {hasRouteBullets && (option.originLabel || option.destinationLabel) ? (
            <div className="mt-2.5 space-y-1.5 text-[11px] text-foreground">
              {option.originLabel ? (
                <p className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Subida:</span>
                  <span className="font-medium">{option.originLabel}</span>
                </p>
              ) : null}
              {option.destinationLabel ? (
                <p className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">Bajada:</span>
                  <span className="font-medium">{option.destinationLabel}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {!hasRouteBullets && (option.originLabel || option.destinationLabel) ? (
            <div
              className={cn(
                "mt-3 grid gap-2",
                option.originLabel && option.destinationLabel ? "md:grid-cols-2" : "md:grid-cols-1",
              )}
            >
              {option.originLabel ? (
                <DetailBox
                  label="Origen"
                  meta={
                    option.metrics.walkDistanceMeters !== null
                      ? `${Math.round(option.metrics.walkDistanceMeters)} m`
                      : null
                  }
                  value={option.originLabel}
                />
              ) : null}
              {option.destinationLabel ? (
                <DetailBox
                  label="Destino"
                  meta={
                    option.availabilityText ??
                    (option.metrics.walkMinutes !== null
                      ? `${option.metrics.walkMinutes} min a pie`
                      : null)
                  }
                  value={option.destinationLabel}
                />
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            {option.metrics.walkDistanceMeters !== null ? (
              <span>{Math.round(option.metrics.walkDistanceMeters)} m andando</span>
            ) : null}
            {option.metrics.walkMinutes !== null ? (
              <span>{option.metrics.walkMinutes} min a pie</span>
            ) : null}
            {option.availabilityText && !option.destinationLabel ? (
              <span>{option.availabilityText}</span>
            ) : null}
            {option.serZoneLabel ? <span>Zona SER {option.serZoneLabel}</span> : null}
          </div>

          {option.note ? (
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
              {option.note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}


function listTransportSummary(options: TransportOption[]) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const Icon = modeIcon(option.mode);
        const styles = modeClasses(option.mode);
        const chipText =
          option.lines[0] ?? option.stationName ?? option.stopName ?? option.title;

        return (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium",
              styles.card,
              styles.text,
            )}
            key={option.id}
          >
            <Icon className="size-3" />
            {chipText}
          </div>
        );
      })}
    </div>
  );
}

const transportDialogModeOrder: Array<TransportOption["mode"]> = [
  "bicimad",
  "metro",
  "cercanias",
  "emt_bus",
  "interurban_bus",
];

function modeDialogLabel(mode: TransportOption["mode"]) {
  switch (mode) {
    case "bicimad":
      return "Bici";
    case "metro":
    case "metro_ligero":
      return "Metro";
    case "cercanias":
      return "Cercanias";
    case "emt_bus":
      return "Autobus EMT";
    case "interurban_bus":
      return "Autobus interurbano";
    case "car":
      return "Coche";
  }
}

function sortTransportOptions(left: TransportOption, right: TransportOption) {
  const leftStructured = left.dataOrigin === "official_structured" ? 1 : 0;
  const rightStructured = right.dataOrigin === "official_structured" ? 1 : 0;

  if (leftStructured !== rightStructured) {
    return rightStructured - leftStructured;
  }

  if (left.displayPriority !== right.displayPriority) {
    return left.displayPriority - right.displayPriority;
  }

  return right.relevanceScore - left.relevanceScore;
}

function walkToCenterText(option: TransportOption): string {
  const walkMeters = option.metrics.walkDistanceMeters;
  const walkMinutes = option.metrics.walkMinutes;

  if (walkMeters !== null && walkMeters > 0) {
    return `A ${Math.round(walkMeters)} m andando del centro`;
  }

  if (walkMinutes !== null && walkMinutes > 0) {
    return `A ${walkMinutes} min andando del centro`;
  }

  return "Distancia andando no disponible";
}

function destinationNodeLabel(option: TransportOption): string {
  return (
    option.destinationNodeName ??
    option.stationName ??
    option.stopName ??
    option.destinationLabel ??
    option.title
  );
}

function uniqueLineCodes(options: TransportOption[]): string[] {
  const values = new Set<string>();
  for (const option of options) {
    for (const line of option.lines) {
      const normalized = line.trim();
      if (normalized) {
        values.add(normalized);
      }
    }
  }

  return [...values.values()];
}

function walkMetricValue(option: TransportOption): string {
  const walkMeters = option.metrics.walkDistanceMeters;
  const walkMinutes = option.metrics.walkMinutes;

  const metersStr = walkMeters !== null && walkMeters > 0 ? `${Math.round(walkMeters)} m` : null;
  const minutesStr = walkMinutes !== null && walkMinutes > 0 ? `${walkMinutes}'` : null;

  if (metersStr && minutesStr) {
    return `${metersStr} - ${minutesStr}`;
  }
  if (metersStr) {
    return metersStr;
  }
  if (minutesStr) {
    return minutesStr;
  }

  return "N/D";
}

function lineChipTone(mode: TransportOption["mode"]) {
  switch (mode) {
    case "metro":
    case "metro_ligero":
      return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600/40 dark:bg-rose-950/35 dark:text-rose-200";
    case "cercanias":
      return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600/40 dark:bg-blue-950/35 dark:text-blue-200";
    case "emt_bus":
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-950/35 dark:text-emerald-200";
    case "interurban_bus":
      return "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600/40 dark:bg-orange-950/35 dark:text-orange-200";
    default:
      return "border-border bg-muted/45 text-foreground";
  }
}

function availabilityCountTone(value: number | null): string {
  if (value === null) {
    return "text-muted-foreground";
  }

  if (value === 0) {
    return "text-rose-600 dark:text-rose-300";
  }

  if (value < 5) {
    return "text-amber-600 dark:text-amber-300";
  }

  return "text-emerald-600 dark:text-emerald-300";
}

function extractBicimadStationId(option: TransportOption): string | null {
  if (option.destinationNodeId && /^\d+$/.test(option.destinationNodeId)) {
    return option.destinationNodeId;
  }

  const candidate = option.destinationNodeId ?? option.id;
  const matched = candidate.match(/bicimad[:_-](\d+)$/i);
  if (matched?.[1]) {
    return matched[1];
  }

  return null;
}

type BicimadAvailabilityUiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; payload: BicimadAvailabilityResponse }
  | { status: "error"; message: string };

function bicimadStatusMessage(note: string | null): string {
  switch (note) {
    case "bicimad_realtime_not_configured":
      return "Sin disponibilidad en este momento.";
    case "bicimad_station_not_found":
      return "No se encontro disponibilidad para esta estacion.";
    case "bicimad_realtime_unavailable":
      return "Sin disponibilidad en este momento para esta estacion.";
    case "bicimad_realtime_error":
      return "No se pudo consultar ahora mismo.";
    case "station_id_required":
      return "Estacion no disponible.";
    default:
      return "Sin disponibilidad en este momento.";
  }
}

function MetaLine({
  center,
  compact = false,
}: {
  center: PublicCenterPresentation;
  compact?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground",
          compact ? "mt-1 text-[11px]" : "mt-1.5 text-[12px]",
        )}
      >
        {center.addressLine ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {center.addressLine}
          </span>
        ) : null}
        {center.distanceLabel && center.distanceOrigin !== "not_available" ? (
          <span className="font-medium text-primary">{center.distanceLabel}</span>
        ) : null}
      </div>
      {joinPlace(center) ? (
        <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]")}>{joinPlace(center)}</p>
      ) : null}
    </>
  );
}

export function LibraryCard({
  center,
  viewMode = "card",
  density = "default",
}: {
  center: PublicCenterPresentation;
  viewMode?: "card" | "list";
  density?: "default" | "compact";
}) {
  const [isTransportExpanded, setIsTransportExpanded] = useState(
    viewMode === "card",
  );
  const [isTransportDialogOpen, setIsTransportDialogOpen] = useState(false);
  const [bicimadAvailability, setBicimadAvailability] = useState<
    Record<string, BicimadAvailabilityUiState>
  >({});
  const compact = density === "compact";

  useEffect(() => {
    if (!isTransportDialogOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTransportDialogOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isTransportDialogOpen]);

  const filteredTransportOptions = center.transportOptions
    .filter((option) => option.mode !== "car")
    .filter(
      (option) =>
        option.metrics.walkDistanceMeters === null || option.metrics.walkDistanceMeters <= 500,
    )
    .sort(sortTransportOptions);

  const groupedTransportModes = transportDialogModeOrder
    .map((mode) => {
      const options = filteredTransportOptions.filter((option) =>
        mode === "metro"
          ? option.mode === "metro" || option.mode === "metro_ligero"
          : option.mode === mode,
      );

      if (options.length === 0) {
        return null;
      }

      return {
        mode,
        options,
      };
    })
    .filter((entry): entry is { mode: TransportOption["mode"]; options: TransportOption[] } => entry !== null);
  const visibleTransportCount = groupedTransportModes.length;

  const loadBicimadOnDemand = async (stationId: string) => {
    setBicimadAvailability((current) => ({
      ...current,
      [stationId]: { status: "loading" },
    }));

    try {
      const currentStationName = groupedTransportModes
        .flatMap((group) => group.options)
        .find((option) => extractBicimadStationId(option) === stationId)?.destinationNodeName ?? null;
      const payload = await fetchBicimadAvailability(stationId, currentStationName);

      if (
        payload.dataOrigin === "realtime" &&
        (payload.bikesAvailable !== null || payload.docksAvailable !== null)
      ) {
        setBicimadAvailability((current) => ({
          ...current,
          [stationId]: { status: "success", payload },
        }));
        return;
      }

      setBicimadAvailability((current) => ({
        ...current,
        [stationId]: {
          status: "error",
          message: bicimadStatusMessage(payload.note),
        },
      }));
    } catch (error) {
      setBicimadAvailability((current) => ({
        ...current,
        [stationId]: {
          status: "error",
          message: error instanceof Error ? error.message : "bicimad_unavailable",
        },
      }));
    }
  };

  if (viewMode === "list") {
    return (
      <article className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
        <div className="flex">
          <div className="flex w-[56px] shrink-0 items-center justify-center bg-primary text-[1.55rem] font-bold text-primary-foreground">
            {center.rankingPosition ?? "1"}
          </div>

          <div className="min-w-0 flex-1 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {center.kindLabel}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      statusBadge(center.headlineStatus),
                    )}
                  >
                    {center.headlineStatus}
                  </span>
                </div>

                <h3 className="mt-2 text-[1.05rem] font-semibold leading-tight text-foreground">
                  {center.name}
                </h3>
                <MetaLine center={center} />

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {center.scheduleLabel}
                  </span>
                  <span>
                    {center.capacityOrigin !== "not_available" && center.capacityValue !== null
                      ? `${center.capacityValue} plazas`
                      : "Aforo no disponible"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground"
                  to={`/centros/${center.slug}`}
                >
                  <ExternalLink className="size-4" />
                </Link>
                <a
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90",
                    !center.mapsUrl && "pointer-events-none opacity-40",
                  )}
                  href={center.mapsUrl ?? "#"}
                  rel="noreferrer"
                  target={center.mapsUrl ? "_blank" : undefined}
                >
                  <Navigation className="size-4" />
                </a>
              </div>
            </div>

            <div className="mt-3 rounded-[15px] border border-border bg-muted/35 px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Transporte
                </span>
                <button
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary"
                  onClick={() => setIsTransportExpanded((current) => !current)}
                  type="button"
                >
                  {isTransportExpanded ? "Ver menos" : "Ver detalles"}
                  {isTransportExpanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </button>
              </div>

              {isTransportExpanded ? (
                <div className="space-y-2">
                  {center.transportOptions.map((option) => (
                    <TransportOptionCard key={option.id} option={option} />
                  ))}
                </div>
              ) : (
                listTransportSummary(center.transportOptions)
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
      <div className={cn(compact ? "p-3 pb-2" : "p-4 pb-3")}>
        <div className={cn("flex items-start", compact ? "gap-2.5" : "gap-3")}>
          <div className={cn("flex shrink-0 items-center justify-center rounded-[14px] bg-primary font-bold text-primary-foreground shadow-[0_12px_20px_rgba(15,91,167,0.18)]", compact ? "size-9 text-[1.1rem]" : "size-10 text-[1.2rem]")}>
            {center.rankingPosition ?? "1"}
          </div>

          <div className="min-w-0 flex-1">
            <div className={cn("flex flex-wrap items-center", compact ? "gap-1" : "gap-1.5")}>
              <span className={cn("rounded-full border border-border font-medium text-muted-foreground", compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]")}>
                {center.kindLabel}
              </span>
              <span
                className={cn(
                  compact ? "rounded-full border px-1.5 py-0.5 text-[9px] font-medium" : "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  statusBadge(center.headlineStatus),
                )}
              >
                {center.headlineStatus}
              </span>
            </div>

            <h3 className={cn("font-semibold leading-tight text-foreground", compact ? "mt-1.5 text-[0.96rem] md:text-[1rem]" : "mt-2 text-[1rem] md:text-[1.08rem]")}>
              {center.name}
            </h3>
            <MetaLine center={center} compact={compact} />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-0.5 text-muted-foreground", compact ? "px-3 pb-2.5 text-[11px]" : "px-4 pb-3 text-[12px]")}>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span className="font-medium text-foreground">{center.scheduleLabel}</span>
        </span>
        {center.capacityOrigin !== "not_available" && center.capacityValue !== null ? (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            <span className="font-medium text-foreground">{center.capacityValue} plazas</span>
          </span>
        ) : null}
      </div>

      {center.operationalNote && center.operationalNoteOrigin !== "not_available" ? (
        <div className={cn(compact ? "px-3 pb-2" : "px-4 pb-3")}>
          <div className={cn("rounded-[16px] border border-amber-300 bg-amber-50 dark:border-amber-600/40 dark:bg-amber-950/30", compact ? "px-2.5 py-2" : "px-3 py-3")}>
            <div className={cn("flex items-start", compact ? "gap-2.5" : "gap-3")}>
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <div className="min-w-0">
                <p className={cn("text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200", compact ? "mb-1" : "mb-1.5")}>
                  Aviso
                </p>
                <p className={cn("text-amber-900 dark:text-amber-100", compact ? "text-[9px] leading-[0.95rem]" : "text-[11px] leading-5")}>
                  {center.operationalNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn(compact ? "px-3 pb-2" : "px-4 pb-3")}>
        <button
          className={cn("flex w-full items-center justify-between rounded-[14px] border border-border bg-muted/35", compact ? "px-2.5 py-1.5" : "px-3 py-2.5")}
          onClick={() => setIsTransportDialogOpen(true)}
          type="button"
        >
          <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
            <Train className="size-3.5 text-muted-foreground" />
            <span className={cn("font-medium text-foreground", compact ? "text-[11px]" : "text-[12px]")}>Transporte</span>
            <span className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
              ({visibleTransportCount} opciones)
            </span>
          </div>
          <span className={cn("rounded-md border border-border bg-card font-medium text-foreground", compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]")}>
            Abrir
          </span>
        </button>
      </div>

      {isTransportDialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <button
                aria-label="Cerrar dialogo de transporte"
                className="absolute inset-0 bg-slate-950/55"
                onClick={() => setIsTransportDialogOpen(false)}
                type="button"
              />
              <div className="relative z-[91] w-full max-w-[500px] rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Train className="size-4 text-muted-foreground" />
                    <h4 className="text-[14px] font-semibold text-foreground">Transporte</h4>
                    <span className="text-[11px] text-muted-foreground">
                      {visibleTransportCount} opciones · ≤500 m
                    </span>
                  </div>
                  <button
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setIsTransportDialogOpen(false)}
                    type="button"
                  >
                    Cerrar
                  </button>
                </div>

                <p className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">
                  Paradas y estaciones cercanas al centro
                </p>

                <div className="max-h-[60vh] overflow-y-auto">
                  {groupedTransportModes.length > 0 ? (
                    <div className="divide-y divide-border">
                      {groupedTransportModes.map((group) => {
                        const Icon = modeIcon(group.mode);
                        const styles = modeClasses(group.mode);
                        const primaryOption = group.options[0];
                        const lineCodes = uniqueLineCodes(group.options);
                        const stationOrStop = primaryOption
                          ? destinationNodeLabel(primaryOption)
                          : "Parada o estacion";
                        const walkLabel = primaryOption
                          ? walkMetricValue(primaryOption)
                          : "N/D";
                        const originBadge =
                          group.options[0]?.dataOrigin === "official_structured" ? "OFICIAL" : "TEXTO";

                        const bicimadOption =
                          group.mode === "bicimad"
                            ? group.options.find((option) => extractBicimadStationId(option) !== null) ??
                              group.options[0] ??
                              null
                            : null;
                        const bicimadStationId =
                          bicimadOption !== null ? extractBicimadStationId(bicimadOption) : null;
                        const bicimadState =
                          bicimadStationId !== null
                            ? bicimadAvailability[bicimadStationId] ?? { status: "idle" }
                            : null;
                        const bicimadStationName =
                          bicimadOption?.destinationNodeName ??
                          bicimadOption?.stationName ??
                          bicimadOption?.destinationLabel ??
                          null;
                        const bicimadWalkLabel = bicimadOption
                          ? walkMetricValue(bicimadOption)
                          : "N/D";

                        return (
                          <div
                            className="flex items-start gap-3 px-4 py-3"
                            key={group.mode}
                          >
                            <div className="flex w-[84px] shrink-0 flex-col items-start gap-1">
                              <div className={cn("flex size-7 items-center justify-center rounded-lg border", styles.card)}>
                                <Icon className={cn("size-3.5", styles.text)} />
                              </div>
                              <span className={cn("text-[11px] font-medium leading-tight", styles.text)}>
                                {modeDialogLabel(group.mode)}
                              </span>
                              <span className="rounded-full border border-border bg-muted px-1.5 py-px text-[9px] font-medium text-muted-foreground">
                                {originBadge}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                              {group.mode === "bicimad" ? (
                                <div className="space-y-1.5">
                                  <p className="text-[12px] font-medium text-foreground">
                                    {bicimadStationName ?? stationOrStop}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      className={cn(
                                        "inline-flex items-center rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-600/40 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/40",
                                        bicimadState?.status === "loading" && "cursor-not-allowed opacity-60",
                                      )}
                                      disabled={bicimadState?.status === "loading"}
                                      onClick={() =>
                                        bicimadStationId ? loadBicimadOnDemand(bicimadStationId) : undefined
                                      }
                                      type="button"
                                    >
                                      <Bike className="mr-1.5 size-3 text-muted-foreground" />
                                      {bicimadState?.status === "loading"
                                        ? "Consultando..."
                                        : "Ver disponibilidad"}
                                    </button>
                                    {bicimadState?.status === "success" ? (
                                      <span className="text-[11px] text-foreground">
                                        <span className={cn("font-semibold", availabilityCountTone(bicimadState.payload.bikesAvailable))}>
                                          {bicimadState.payload.bikesAvailable ?? 0}
                                        </span>
                                        <span className="text-muted-foreground"> bicis disponibles · </span>
                                        <span className={cn("font-semibold", availabilityCountTone(bicimadState.payload.docksAvailable))}>
                                          {bicimadState.payload.docksAvailable ?? 0}
                                        </span>
                                        <span className="text-muted-foreground"> anclajes disponibles</span>
                                      </span>
                                    ) : null}
                                    {bicimadState?.status === "error" ? (
                                      <span className="text-[11px] text-muted-foreground">{bicimadState.message}</span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-[12px] font-medium text-foreground">
                                    {stationOrStop}
                                  </p>
                                  {lineCodes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {lineCodes.map((line) => (
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                            lineChipTone(group.mode),
                                          )}
                                          key={`${group.mode}:${line}`}
                                        >
                                          {group.mode === "metro" ||
                                          group.mode === "cercanias" ||
                                          group.mode === "metro_ligero" ? (
                                            <Train className="size-3" />
                                          ) : (
                                            <Bus className="size-3" />
                                          )}
                                          {line}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>

                            <div className="w-[138px] shrink-0 self-center text-right">
                              <div className="inline-flex items-center gap-1 text-muted-foreground">
                                <PersonStanding className="size-3.5" />
                                <Building2 className="size-3.5" />
                              </div>
                              <p className="mt-1 text-[11px] font-semibold leading-snug text-foreground">
                                {group.mode === "bicimad" ? bicimadWalkLabel : walkLabel}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-4 py-4 text-[12px] text-muted-foreground">
                      No hay opciones de transporte publicadas dentro de 500 m para este centro.
                    </p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className={cn("flex gap-2", compact ? "px-3 pb-2.5" : "px-4 pb-4")}>
        <Link
          className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card font-medium text-foreground transition hover:bg-muted/40", compact ? "h-9 text-[11px]" : "h-10 text-[13px]")}
          to={`/centros/${center.slug}`}
        >
          <ExternalLink className="size-4" />
          Ver detalles
        </Link>
        <a
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-medium text-primary-foreground transition hover:opacity-90",
            compact ? "h-9 text-[11px]" : "h-10 text-[13px]",
            !center.mapsUrl && "pointer-events-none opacity-40",
          )}
          href={center.mapsUrl ?? "#"}
          rel="noreferrer"
          target={center.mapsUrl ? "_blank" : undefined}
        >
          <Navigation className="size-4" />
          Ir ahora
        </a>
      </div>

      <div className={cn("flex flex-wrap gap-1.5", compact ? "px-3 pb-2.5" : "px-4 pb-4")}>
        {center.wifi ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full bg-sky-50 font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-200", compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]")}>
            <Wifi className="size-3" />
            WiFi
          </span>
        ) : null}
        {center.accessibility ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200", compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]")}>
            <ShieldCheck className="size-3" />
            Accesible
          </span>
        ) : null}
        {center.phone ? (
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
            Tel. {center.phone}
          </span>
        ) : null}
      </div>
    </article>
  );
}
