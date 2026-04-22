import type { DataOrigin, TransportOption } from "@alabiblio/contracts";
import {
  Bike,
  Bus,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Train,
  TriangleAlert,
  Users,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import { formatNeighborhoodDistrict } from "../lib/presentationText";
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
      return Navigation;
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

function joinPlace(center: PublicCenterPresentation) {
  return formatNeighborhoodDistrict(center.neighborhood, center.district);
}

function RatingStars({ value, className }: { value: number; className?: string }) {
  const percentage = `${Math.max(0, Math.min(100, (value / 5) * 100))}%`;

  return (
    <span className={cn("relative inline-flex", className)}>
      <span className="flex text-slate-300 dark:text-slate-700">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star className="size-3.5" key={`empty-${index}`} />
        ))}
      </span>
      <span className="absolute inset-0 overflow-hidden text-amber-500" style={{ width: percentage }}>
        <span className="flex">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star className="size-3.5 fill-current" key={`filled-${index}`} />
          ))}
        </span>
      </span>
    </span>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.05 5.05 0 0 1-2.2 3.31v2.74h3.57c2.08-1.92 3.27-4.74 3.27-8.06Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.99 7.28-2.69l-3.57-2.74c-.99.66-2.26 1.06-3.71 1.06-2.85 0-5.27-1.93-6.14-4.52H2.18v2.82A11 11 0 0 0 12 23Z" fill="#34A853" />
      <path d="M5.86 14.11a6.61 6.61 0 0 1 0-4.22V7.07H2.18a11 11 0 0 0 0 9.86l3.68-2.82Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.68 2.82c.87-2.59 3.29-4.51 6.14-4.51Z" fill="#EA4335" />
    </svg>
  );
}

function extractStationId(option: TransportOption): string | null {
  if (option.destinationNodeId && /^\d+$/.test(option.destinationNodeId)) {
    return option.destinationNodeId;
  }

  const fallback = option.id.match(/bicimad[:_-](\d+)$/i);
  return fallback?.[1] ?? null;
}

type BicimadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; payload: BicimadAvailabilityResponse }
  | { status: "error"; message: string };

const ratingAttributeEntries: Array<{
  key: keyof PublicCenterPresentation["ratingAttributes"];
  label: string;
}> = [
  { key: "silence", label: "Ruido" },
  { key: "wifi", label: "WiFi" },
  { key: "cleanliness", label: "Limpieza" },
  { key: "plugs", label: "Enchufes" },
  { key: "temperature", label: "Temperatura" },
  { key: "lighting", label: "Iluminacion" },
];

export function LibraryCard({
  center,
  density = "default",
  onNavigateToDetail,
}: {
  center: PublicCenterPresentation;
  viewMode?: "card" | "list";
  density?: "default" | "compact";
  onNavigateToDetail?: () => void;
}) {
  const compact = density === "compact";
  const [isTransportDialogOpen, setIsTransportDialogOpen] = useState(false);
  const [bicimadState, setBicimadState] = useState<Record<string, BicimadState>>({});

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

  const visibleTransport = useMemo(
    () =>
      center.transportOptions
        .filter((option) => option.mode !== "car")
        .filter((option) => option.metrics.walkDistanceMeters === null || option.metrics.walkDistanceMeters <= 500)
        .slice(0, compact ? 3 : 4),
    [center.transportOptions, compact],
  );

  const hasRatings = center.ratingAverage !== null && center.ratingCount > 0;
  const hasNotice = Boolean(center.operationalNote && center.operationalNoteOrigin !== "not_available");

  const loadBicimad = async (option: TransportOption) => {
    const stationId = extractStationId(option);
    if (!stationId) {
      return;
    }

    setBicimadState((current) => ({ ...current, [stationId]: { status: "loading" } }));

    try {
      const payload = await fetchBicimadAvailability(stationId, option.destinationNodeName ?? option.stationName ?? null);
      if (payload.dataOrigin === "realtime") {
        setBicimadState((current) => ({ ...current, [stationId]: { status: "success", payload } }));
      } else {
        setBicimadState((current) => ({
          ...current,
          [stationId]: { status: "error", message: "Sin disponibilidad en este momento." },
        }));
      }
    } catch {
      setBicimadState((current) => ({
        ...current,
        [stationId]: { status: "error", message: "No se pudo consultar ahora mismo." },
      }));
    }
  };

  const capacityLabel =
    center.capacityOrigin !== "not_available" && center.capacityValue !== null
      ? `${center.capacityValue} plazas`
      : "No disponible";

  return (
    <article className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_14px_36px_rgba(15,23,42,0.09)]">
      <div className={cn(compact ? "p-3.5" : "p-4") }>
        <div className={cn("flex items-start", compact ? "gap-3" : "gap-3.5")}>
          <div className={cn("flex shrink-0 items-center justify-center rounded-[14px] bg-primary font-bold text-primary-foreground shadow-[0_12px_24px_rgba(15,91,167,0.28)]", compact ? "size-9 text-[1.05rem]" : "size-10 text-[1.18rem]")}>
            {center.rankingPosition ?? "1"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
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

              <Link
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted/40"
                onClick={onNavigateToDetail}
                onMouseDown={onNavigateToDetail}
                onTouchStart={onNavigateToDetail}
                to={`/centros/${center.slug}`}
              >
                <ExternalLink className="mr-1 size-3.5" />
                Detalles
              </Link>
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className={cn("font-semibold leading-tight text-foreground", compact ? "text-[0.96rem] md:text-[1rem]" : "text-[1rem] md:text-[1.08rem]")}>
                    {center.name}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                    {center.scheduleLabel}
                  </span>
                </div>

                <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground", compact ? "mt-1 text-[11px]" : "mt-1.5 text-[12px]")}>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {center.addressLine ?? "Direccion no disponible"}
                  </span>
                  {center.distanceLabel && center.distanceOrigin !== "not_available" ? (
                    <span className="font-medium text-primary">{center.distanceLabel}</span>
                  ) : null}
                  {center.mapsUrl ? (
                    <a
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground transition hover:opacity-90"
                      href={center.mapsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Navigation className="size-3" />
                      Ir
                    </a>
                  ) : null}
                </div>

                {joinPlace(center) ? (
                  <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]")}>{joinPlace(center)}</p>
                ) : (
                  <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]")}>Barrio/distrito no disponible</p>
                )}
              </div>

              <div className={cn("shrink-0 rounded-[14px] border border-border bg-muted/28", compact ? "w-[145px] px-2.5 py-2" : "w-[196px] px-3 py-2.5")}>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    Aforo
                  </span>
                  <span className="font-medium text-foreground">{capacityLabel}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      center.capacityValue ? "bg-emerald-500" : "w-full bg-slate-300/80 dark:bg-slate-700",
                    )}
                    style={center.capacityValue ? { width: "44%" } : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("rounded-xl border border-border bg-muted/22", compact ? "mx-3 mb-2.5 px-3 py-2.5" : "mx-4 mb-3 px-3.5 py-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Rating global</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <RatingStars value={center.ratingAverage ?? 0} />
            <span className="text-[13px] font-semibold text-foreground">
              {hasRatings ? center.ratingAverage?.toFixed(1) : "Sin valoraciones"}
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            {hasRatings ? `${center.ratingCount} votos` : "Se el primero en opinar"}
          </span>
        </div>
        {!hasRatings ? (
          <Link
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-muted/35"
            onClick={onNavigateToDetail}
            onMouseDown={onNavigateToDetail}
            onTouchStart={onNavigateToDetail}
            to={`/centros/${center.slug}?opinar=1`}
          >
            <GoogleLogo className="size-3.5" />
            Sin valoraciones · Se el primero en opinar
          </Link>
        ) : null}
      </div>

      <div className={cn("rounded-xl border border-border bg-card", compact ? "mx-3 mb-2.5 px-3 py-2.5" : "mx-4 mb-3 px-3.5 py-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Subratings</p>
        <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
          {ratingAttributeEntries.map((item) => {
            const value = center.ratingAttributes[item.key];
            const progress = typeof value === "number" ? Math.max(0, Math.min(100, (value / 5) * 100)) : 0;
            return (
              <div className="flex items-center gap-2" key={item.key}>
                <span className="min-w-0 flex-1 text-[12px] text-foreground">{item.label}</span>
                <div className="flex w-[95px] items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80">
                    <div
                      className={cn("h-full rounded-full", typeof value === "number" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[11px] font-medium text-foreground">
                    {typeof value === "number" ? value.toFixed(1) : "N/D"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn(compact ? "px-3 pb-2.5" : "px-4 pb-3")}>
        <div
          className={cn(
            "rounded-[16px] border px-3 py-2.5",
            hasNotice
              ? "border-amber-300 bg-amber-50 dark:border-amber-600/40 dark:bg-amber-950/30"
              : "border-border bg-muted/28",
          )}
        >
          <div className="flex items-start gap-2.5">
            <TriangleAlert
              className={cn(
                "mt-0.5 size-4 shrink-0",
                hasNotice ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground",
              )}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.12em]",
                  hasNotice ? "text-amber-700 dark:text-amber-200" : "text-muted-foreground",
                )}
              >
                Aviso
              </p>
              <p
                className={cn(
                  compact ? "text-[10px] leading-4" : "text-[11px] leading-5",
                  hasNotice ? "text-amber-900 dark:text-amber-100" : "text-muted-foreground",
                )}
              >
                {hasNotice ? center.operationalNote : "Sin avisos"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(compact ? "px-3 pb-2" : "px-4 pb-3")}>
        <button
          className={cn("flex w-full items-center justify-between rounded-[14px] border border-border bg-muted/35", compact ? "px-2.5 py-2" : "px-3 py-2.5")}
          onClick={() => setIsTransportDialogOpen(true)}
          type="button"
        >
          <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
            <Train className="size-3.5 text-muted-foreground" />
            <span className={cn("font-medium text-foreground", compact ? "text-[11px]" : "text-[12px]")}>Transporte</span>
            <span className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
              ({visibleTransport.length} opciones)
            </span>
          </div>
          <span className={cn("rounded-md border border-border bg-card font-medium text-foreground", compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]")}>
            Abrir
          </span>
        </button>

        <div className="mt-2 rounded-xl border border-border bg-card px-3 py-2">
          {visibleTransport.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleTransport.map((option) => {
                const Icon = modeIcon(option.mode);
                return (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/35 px-2 py-0.5 text-[10px] font-medium text-foreground"
                    key={option.id}
                  >
                    <Icon className="size-3" />
                    {option.title}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">Sin datos de transporte cercanos publicados.</p>
          )}
        </div>
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
              <div className="relative z-[91] w-full max-w-[540px] rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Train className="size-4 text-muted-foreground" />
                    <h4 className="text-[14px] font-semibold text-foreground">Transporte</h4>
                    <span className="text-[11px] text-muted-foreground">{visibleTransport.length} opciones · =500 m</span>
                  </div>
                  <button
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setIsTransportDialogOpen(false)}
                    type="button"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                  {visibleTransport.length > 0 ? (
                    visibleTransport.map((option) => {
                      const Icon = modeIcon(option.mode);
                      const stationId = option.mode === "bicimad" ? extractStationId(option) : null;
                      const state = stationId ? bicimadState[stationId] ?? { status: "idle" } : null;

                      return (
                        <div className="px-4 py-3" key={option.id}>
                          <div className="flex items-start gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/25 text-muted-foreground">
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-foreground">{option.title}</p>
                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                  {originLabel(option.dataOrigin)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[12px] text-muted-foreground">{option.summary}</p>

                              {option.lines.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {option.lines.map((line) => (
                                    <span
                                      className="inline-flex items-center rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                                      key={line}
                                    >
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              {stationId ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                                    disabled={state?.status === "loading"}
                                    onClick={() => loadBicimad(option)}
                                    type="button"
                                  >
                                    {state?.status === "loading" ? "Consultando..." : "Ver disponibilidad"}
                                  </button>
                                  {state?.status === "success" ? (
                                    <span className="text-[11px] text-foreground">
                                      {state.payload.bikesAvailable ?? 0} bicis · {state.payload.docksAvailable ?? 0} anclajes
                                    </span>
                                  ) : null}
                                  {state?.status === "error" ? (
                                    <span className="text-[11px] text-muted-foreground">{state.message}</span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {option.metrics.walkDistanceMeters !== null
                                ? `${Math.round(option.metrics.walkDistanceMeters)} m`
                                : "N/D"}
                            </span>
                          </div>
                        </div>
                      );
                    })
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

      <div className={cn("rounded-xl border border-border bg-muted/22", compact ? "mx-3 mb-3 px-3 py-2.5" : "mx-4 mb-4 px-3.5 py-3")}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Features</p>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              center.wifi
                ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-600/40 dark:bg-sky-950/35 dark:text-sky-200"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <Wifi className="size-3" />
            {center.wifi ? "WiFi" : "WiFi no disponible"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              center.accessibility
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-950/35 dark:text-emerald-200"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <ShieldCheck className="size-3" />
            {center.accessibility ? "Accesible" : "Accesibilidad no informada"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Clock className="size-3" />
            {center.phone ? `Tel. ${center.phone}` : "Telefono no disponible"}
          </span>
        </div>
      </div>
    </article>
  );
}
