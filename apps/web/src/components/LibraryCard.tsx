import type { DataOrigin, TransportOption } from "@alabiblio/contracts";
import {
  Bike,
  Bus,
  ExternalLink,
  MapPin,
  Navigation,
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

function modeColor(mode: TransportOption["mode"]): { chip: string; icon: string } {
  switch (mode) {
    case "metro":        return { chip: "bg-red-50 text-red-600 border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500/25",       icon: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" };
    case "cercanias":    return { chip: "bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-500/25",   icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" };
    case "metro_ligero": return { chip: "bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-500/25", icon: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" };
    case "emt_bus":      return { chip: "bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-500/25",   icon: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400" };
    case "interurban_bus": return { chip: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-500/25", icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" };
    case "bicimad":      return { chip: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/25", icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" };
    case "car":          return { chip: "bg-card text-muted-foreground border-border/55",                                                               icon: "bg-muted/45 text-muted-foreground" };
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
    case "realtime":          return "EN VIVO";
    case "official_structured": return "OFICIAL";
    case "official_text_parsed": return "TEXTO";
    case "heuristic":         return "ESTIMADO";
    case "not_available":     return "N/D";
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
        {Array.from({ length: 5 }).map((_, i) => (
          <Star className="size-3" key={`e${i}`} />
        ))}
      </span>
      <span className="absolute inset-0 overflow-hidden text-amber-500" style={{ width: percentage }}>
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star className="size-3 fill-current" key={`f${i}`} />
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
  { key: "silence",     label: "Silencio" },
  { key: "wifi",        label: "WiFi"     },
  { key: "cleanliness", label: "Limpieza" },
  { key: "plugs",       label: "Enchufes" },
  { key: "temperature", label: "Temp."    },
  { key: "lighting",    label: "Luz"      },
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
    if (!isTransportDialogOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsTransportDialogOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isTransportDialogOpen]);

  const visibleTransport = useMemo(
    () =>
      center.transportOptions
        .filter((o) => o.mode !== "car")
        .filter((o) => o.metrics.walkDistanceMeters === null || o.metrics.walkDistanceMeters <= 500)
        .slice(0, compact ? 3 : 5),
    [center.transportOptions, compact],
  );

  const hasRatings = center.ratingAverage !== null && center.ratingCount > 0;
  const hasNotice = Boolean(center.operationalNote && center.operationalNoteOrigin !== "not_available");
  const place = joinPlace(center);

  const loadBicimad = async (option: TransportOption) => {
    const stationId = extractStationId(option);
    if (!stationId) return;
    setBicimadState((s) => ({ ...s, [stationId]: { status: "loading" } }));
    try {
      const payload = await fetchBicimadAvailability(
        stationId,
        option.destinationNodeName ?? option.stationName ?? null,
      );
      if (payload.dataOrigin === "realtime") {
        setBicimadState((s) => ({ ...s, [stationId]: { status: "success", payload } }));
      } else {
        setBicimadState((s) => ({
          ...s,
          [stationId]: { status: "error", message: "Sin disponibilidad en este momento." },
        }));
      }
    } catch {
      setBicimadState((s) => ({
        ...s,
        [stationId]: { status: "error", message: "No se pudo consultar ahora mismo." },
      }));
    }
  };

  return (
    <article className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_4px_20px_rgba(15,23,42,0.065)]">
      {/* ── BODY ─────────────────────────────────── */}
      <div className={compact ? "px-3.5 pt-3.5 pb-3" : "px-4 pt-4 pb-3.5"}>
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[11px] bg-primary font-bold text-primary-foreground shadow-[0_4px_12px_rgba(15,91,167,0.20)]",
              compact ? "size-8 text-[0.88rem]" : "size-9 text-[1rem]",
            )}
          >
            {center.rankingPosition ?? "·"}
          </div>

          <div className="min-w-0 flex-1">
            {/* Badges + link */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
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
              <Link
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-transparent px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-muted/45"
                onClick={onNavigateToDetail}
                onMouseDown={onNavigateToDetail}
                onTouchStart={onNavigateToDetail}
                to={`/centros/${center.slug}`}
              >
                <ExternalLink className="size-3" />
                Ver detalle
              </Link>
            </div>

            {/* Name + schedule */}
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3
                className={cn(
                  "font-semibold leading-tight text-foreground",
                  compact ? "text-[0.93rem]" : "text-[0.975rem]",
                )}
              >
                {center.name}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                {center.scheduleLabel}
              </span>
            </div>

            {/* Rating inline */}
            <div className="mt-1 flex items-center gap-2">
              {hasRatings ? (
                <>
                  <RatingStars value={center.ratingAverage ?? 0} />
                  <span className="text-[12px] font-semibold text-foreground">
                    {center.ratingAverage?.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {center.ratingCount} {center.ratingCount === 1 ? "voto" : "votos"}
                  </span>
                </>
              ) : (
                <Link
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
                  onClick={onNavigateToDetail}
                  onMouseDown={onNavigateToDetail}
                  onTouchStart={onNavigateToDetail}
                  to={`/centros/${center.slug}?opinar=1`}
                >
                  <GoogleLogo className="size-3" />
                  Sin valoraciones · Sé el primero
                </Link>
              )}
            </div>

            {/* Address + distance */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {center.addressLine ?? "Dirección no disponible"}
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
                  <Navigation className="size-2.5" />
                  Ir
                </a>
              ) : null}
            </div>

            {/* Barrio + features inline */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {place ? (
                <span className="text-[10.5px] text-muted-foreground">{place}</span>
              ) : null}
              <div className="flex flex-wrap items-center gap-1">
                {center.wifi ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/80 bg-sky-50/70 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-600/30 dark:bg-sky-950/25 dark:text-sky-300">
                    <Wifi className="size-2.5" />
                    WiFi
                  </span>
                ) : null}
                {center.accessibility ? (
                  <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-600/30 dark:bg-emerald-950/25 dark:text-emerald-300">
                    Accesible
                  </span>
                ) : null}
                {center.capacityOrigin !== "not_available" && center.capacityValue !== null ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Users className="size-2.5" />
                    {center.capacityValue} plazas
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Subratings — compact 3-col, only when ratings exist */}
        {hasRatings ? (
          <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5 border-t border-border/35 pt-2.5">
            {ratingAttributeEntries.map((item) => {
              const value = center.ratingAttributes[item.key];
              const pct =
                typeof value === "number" ? Math.max(0, Math.min(100, (value / 5) * 100)) : 0;
              return (
                <div className="flex items-center gap-1.5" key={item.key}>
                  <span className="w-[50px] shrink-0 text-[9.5px] text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        typeof value === "number"
                          ? "bg-emerald-500"
                          : "bg-slate-300/60 dark:bg-slate-700/60",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[9.5px] font-medium text-foreground">
                    {typeof value === "number" ? value.toFixed(1) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Aviso — thin strip, only when present */}
        {hasNotice ? (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200/60 bg-amber-50/50 px-2.5 py-1.5 dark:border-amber-600/25 dark:bg-amber-950/15">
            <TriangleAlert className="mt-0.5 size-3 shrink-0 text-amber-500 dark:text-amber-400" />
            <p className="text-[10.5px] leading-4 text-amber-900 dark:text-amber-200">
              {center.operationalNote}
            </p>
          </div>
        ) : null}
      </div>

      {/* ── TRANSPORT FOOTER ──────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-t border-border/35 bg-muted/12 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {visibleTransport.length > 0 ? (
            visibleTransport.map((option) => {
              const Icon = modeIcon(option.mode);
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    modeColor(option.mode).chip,
                  )}
                  key={option.id}
                >
                  <Icon className="size-2.5" />
                  {option.title}
                </span>
              );
            })
          ) : (
            <span className="text-[10.5px] text-muted-foreground">Sin transporte cercano publicado</span>
          )}
        </div>
        {visibleTransport.length > 0 ? (
          <button
            className="shrink-0 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground transition hover:bg-muted/45 hover:text-foreground"
            onClick={() => setIsTransportDialogOpen(true)}
            type="button"
          >
            Ver todo
          </button>
        ) : null}
      </div>

      {/* Transport dialog */}
      {isTransportDialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <button
                aria-label="Cerrar dialogo de transporte"
                className="absolute inset-0 bg-slate-950/55"
                onClick={() => setIsTransportDialogOpen(false)}
                type="button"
              />
              <div className="relative z-[91] w-full max-w-[520px] rounded-[22px] border border-border bg-card shadow-[0_24px_60px_rgba(2,6,23,0.45)]">
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Train className="size-4 text-muted-foreground" />
                    <h4 className="text-[14px] font-semibold text-foreground">Cómo llegar</h4>
                    <span className="text-[11px] text-muted-foreground">
                      {visibleTransport.length} opciones · ≤500 m
                    </span>
                  </div>
                  <button
                    className="rounded-lg border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
                    onClick={() => setIsTransportDialogOpen(false)}
                    type="button"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="max-h-[60vh] divide-y divide-border/40 overflow-y-auto">
                  {visibleTransport.length > 0 ? (
                    visibleTransport.map((option) => {
                      const Icon = modeIcon(option.mode);
                      const stationId =
                        option.mode === "bicimad" ? extractStationId(option) : null;
                      const state = stationId
                        ? (bicimadState[stationId] ?? { status: "idle" })
                        : null;
                      return (
                        <div className="flex items-start gap-3 px-4 py-3" key={option.id}>
                        <div className={cn(
                            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                            modeColor(option.mode).icon,
                          )}>
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-foreground">
                                {option.title}
                              </p>
                              <span className="rounded-full border border-border/60 bg-muted/55 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                                {originLabel(option.dataOrigin)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {option.summary}
                            </p>
                            {option.lines.length > 0 ? (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {option.lines.map((line) => (
                                  <span
                                    className="inline-flex items-center rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground"
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
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-600/30 dark:bg-blue-950/25 dark:text-blue-300"
                                  disabled={state?.status === "loading"}
                                  onClick={() => loadBicimad(option)}
                                  type="button"
                                >
                                  {state?.status === "loading"
                                    ? "Consultando..."
                                    : "Ver disponibilidad"}
                                </button>
                                {state?.status === "success" ? (
                                  <span className="text-[11px] text-foreground">
                                    {state.payload.bikesAvailable ?? 0} bicis ·{" "}
                                    {state.payload.docksAvailable ?? 0} anclajes
                                  </span>
                                ) : null}
                                {state?.status === "error" ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    {state.message}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          {option.metrics.walkDistanceMeters !== null &&
                          option.metrics.walkDistanceMeters > 0 ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {Math.round(option.metrics.walkDistanceMeters)} m
                            </span>
                          ) : null}
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
    </article>
  );
}
