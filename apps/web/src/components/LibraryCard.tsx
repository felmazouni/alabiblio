import type { CenterPresentation, TransportPresentation } from "../lib/publicCatalog";
import { useState } from "react";
import { ArrowRight, BookOpen, Bus, Car, ChevronDown, ChevronUp, Clock, ExternalLink, Lightbulb, MapPin, Navigation, Plug, Route, ShieldCheck, Sparkles, Star, Thermometer, Train, TriangleAlert, Volume2, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

function iconForMode(mode: TransportPresentation["mode"]) {
  switch (mode) {
    case "metro":
    case "train":
      return Train;
    case "bus":
      return Bus;
    case "car":
      return Car;
    case "walk":
      return Route;
  }
}

function colorsForMode(mode: TransportPresentation["mode"]) {
  switch (mode) {
    case "metro":
    case "train":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      };
    case "bus":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: "text-blue-600",
      };
    case "car":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: "text-amber-600",
      };
    case "walk":
      return {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        icon: "text-slate-600",
      };
  }
}

function statusBadge(status: CenterPresentation["headlineStatus"]) {
  if (status === "Abierta") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "Cerrada") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function StarRating({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "md" }) {
  const normalized = rating ?? 0;
  const fullStars = Math.floor(normalized);
  const hasHalf = normalized % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => {
        if (index < fullStars) {
          return <Star className={cn("fill-amber-400 text-amber-400", size === "sm" ? "size-3.5" : "size-4")} key={index} />;
        }

        if (index === fullStars && hasHalf) {
          return (
            <div className="relative" key={index}>
              <Star className={cn("text-slate-200", size === "sm" ? "size-3.5" : "size-4")} />
              <div className="absolute inset-0 w-1/2 overflow-hidden">
                <Star className={cn("fill-amber-400 text-amber-400", size === "sm" ? "size-3.5" : "size-4")} />
              </div>
            </div>
          );
        }

        return <Star className={cn("text-slate-200", size === "sm" ? "size-3.5" : "size-4")} key={index} />;
      })}
    </div>
  );
}

function OccupancyBar({ currentLabel, progress, value }: { currentLabel: string; progress: number | null; value: string }) {
  const color = progress === null ? "bg-slate-300" : progress < 0.5 ? "bg-emerald-500" : progress < 0.8 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <BookOpen className="size-4" />
        <span className="text-sm font-medium">{currentLabel}</span>
      </div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${(progress ?? 0.38) * 100}%` }} />
      </div>
      <span className="text-sm text-muted-foreground font-medium tabular-nums">{value}</span>
    </div>
  );
}

function AspectRating({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm text-foreground capitalize flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", value ? "bg-primary" : "bg-slate-200")} style={{ width: `${((value ?? 0) / 5) * 100}%` }} />
        </div>
        <span className="text-sm text-muted-foreground w-6 text-right tabular-nums">{value ? value.toFixed(1) : "—"}</span>
      </div>
    </div>
  );
}

function TransportSummary({ transport }: { transport: TransportPresentation[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {transport.map((option) => {
        const colors = colorsForMode(option.mode);
        const Icon = iconForMode(option.mode);
        return (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
              colors.bg,
              colors.border,
              colors.text,
            )}
            key={option.id}
          >
            <Icon className="size-3" />
            <span>{option.chips[0] ?? option.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function TransportOptionCard({ option }: { option: TransportPresentation }) {
  const colors = colorsForMode(option.mode);
  const Icon = iconForMode(option.mode);

  return (
    <div className={cn("p-4 rounded-lg border", colors.bg, colors.border)}>
      <div className="flex items-start gap-4">
        <div className={cn("size-10 rounded-lg flex items-center justify-center bg-white border", colors.border)}>
          <span className={colors.icon}>
            <Icon className="size-4" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("font-medium text-sm", colors.text)}>{option.title}</span>
            <span className="text-[10px] px-1.5 py-0 h-5 inline-flex items-center rounded-full bg-white/80 border border-white text-slate-600">
              {option.reliabilityLabel === "Texto oficial" ? "TEXTO OFICIAL" : "HEURISTICA"}
            </span>
          </div>
          <p className="text-sm text-foreground leading-6">{option.detail}</p>
          {option.chips.length > 0 ? (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {option.chips.map((chip) => (
                <span className="text-xs px-2 py-0.5 bg-white rounded border border-slate-200 font-medium text-foreground" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LibraryCard({
  center,
  onNavigate,
  onDetails,
  onReview,
  viewMode = "card",
}: {
  center: CenterPresentation;
  onNavigate?: () => void;
  onDetails?: () => void;
  onReview?: () => void;
  viewMode?: "card" | "list";
}) {
  const [isTransportExpanded, setIsTransportExpanded] = useState(viewMode === "card");

  if (viewMode === "list") {
    return (
      <article className="overflow-hidden border-border shadow-sm hover:shadow-md transition-all bg-card rounded-xl">
        <div className="flex flex-col">
          <div className="flex items-stretch">
            <div className="w-14 shrink-0 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">{center.rankingPosition}</span>
            </div>

            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground border-border shrink-0 rounded-full border px-2.5 py-0.5">
                      {center.kindLabel}
                    </span>
                    <span className={cn("font-medium text-xs shrink-0 rounded-full border px-2.5 py-0.5", statusBadge(center.headlineStatus))}>
                      {center.headlineStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold leading-tight text-foreground mb-1">{center.name}</h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{center.addressLine ?? "Direccion pendiente"}</span>
                    {center.distanceLabel ? (
                      <>
                        <span className="text-border">|</span>
                        <span className="text-primary font-medium shrink-0">{center.distanceLabel}</span>
                      </>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[center.neighborhood, center.district].filter(Boolean).join(" - ")}
                  </p>

                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={center.rating.ratingAverage} size="sm" />
                      <span className="font-bold text-sm text-foreground">{center.rating.ratingAverage ? center.rating.ratingAverage.toFixed(1) : "—"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>{center.scheduleLabel}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{center.occupancyValue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Link className="inline-flex items-center justify-center rounded-md border border-border bg-card h-9 w-9" to={`/centros/${center.slug}`}>
                    <ExternalLink className="size-4" />
                  </Link>
                  <a
                    className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 w-9"
                    href={center.mapsUrl ?? "#"}
                    onClick={onNavigate}
                    rel="noreferrer"
                    target={center.mapsUrl ? "_blank" : undefined}
                  >
                    <Navigation className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-0">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transporte</span>
                <button className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => setIsTransportExpanded(!isTransportExpanded)} type="button">
                  {isTransportExpanded ? "Ver menos" : "Ver detalles"}
                  {isTransportExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              </div>

              {!isTransportExpanded ? (
                <TransportSummary transport={center.transportOptions} />
              ) : (
                <div className="space-y-2 mt-3">
                  {center.transportOptions.map((option) => (
                    <TransportOptionCard key={option.id} option={option} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden border-border shadow-sm hover:shadow-md transition-all bg-card rounded-xl">
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 size-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
            {center.rankingPosition}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground border-border rounded-full border px-2.5 py-0.5">
                {center.kindLabel}
              </span>
              <span className={cn("font-medium text-xs rounded-full border px-2.5 py-0.5", statusBadge(center.headlineStatus))}>
                {center.headlineStatus}
              </span>
            </div>

            <h3 className="text-lg font-semibold leading-tight text-foreground mb-1.5 text-balance">{center.name}</h3>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>{center.addressLine ?? "Direccion pendiente"}</span>
              {center.distanceLabel ? (
                <>
                  <span className="text-border">|</span>
                  <span className="text-primary font-medium">{center.distanceLabel}</span>
                </>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-6">
              {[center.neighborhood, center.district].filter(Boolean).join(" - ")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Horario:</span>
              <span className="font-medium text-foreground">{center.scheduleLabel}</span>
            </div>
          </div>
          <OccupancyBar currentLabel={center.occupancyLabel} progress={center.occupancyProgress} value={center.occupancyValue} />
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <StarRating rating={center.rating.ratingAverage} size="md" />
            <span className="text-lg font-bold text-foreground">{center.rating.ratingAverage ? center.rating.ratingAverage.toFixed(1) : "—"}</span>
            <span className="text-sm text-muted-foreground">
              {center.rating.ratingCount > 0 ? `(${center.rating.ratingCount} opiniones)` : "(sin opiniones todavía)"}
            </span>
          </div>
          <button
            className="gap-2 border-border hover:bg-muted/50 inline-flex items-center justify-center rounded-md border bg-card h-9 px-3 text-sm font-medium disabled:opacity-60"
            disabled
            onClick={onReview}
            type="button"
          >
            Opinar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <AspectRating icon={Volume2} label="Silencio" value={center.rating.aspects[0]?.value ?? null} />
          <AspectRating icon={Plug} label="Enchufes" value={center.rating.aspects[1]?.value ?? null} />
          <AspectRating icon={Wifi} label="WiFi" value={center.rating.aspects[2]?.value ?? null} />
          <AspectRating icon={Thermometer} label="Temperatura" value={center.rating.aspects[3]?.value ?? null} />
          <AspectRating icon={Sparkles} label="Limpieza" value={center.rating.aspects[4]?.value ?? null} />
          <AspectRating icon={Lightbulb} label="Iluminacion" value={center.rating.aspects[5]?.value ?? null} />
        </div>
      </div>

      {center.schedule.notesUnparsed ? (
        <div className="px-5 pb-4">
          <div className="p-3 rounded-lg border flex items-start gap-3 bg-amber-50 border-amber-200">
            <TriangleAlert className="size-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">{center.schedule.notesUnparsed}</p>
          </div>
        </div>
      ) : null}

      <div className="px-5 pb-4">
        <button
          className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
          onClick={() => setIsTransportExpanded(!isTransportExpanded)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Train className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Como llegar</span>
            <span className="text-xs text-muted-foreground">({center.transportOptions.length} opciones)</span>
          </div>
          {isTransportExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>

        {isTransportExpanded ? (
          <div className="mt-3 space-y-3">
            {center.transportOptions.map((option) => (
              <TransportOptionCard key={option.id} option={option} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="px-5 pb-5 flex gap-3">
        <Link
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card h-10 px-4 text-sm font-medium hover:bg-muted/50"
          onClick={onDetails}
          to={`/centros/${center.slug}`}
        >
          <ExternalLink className="size-4" />
          Ver detalles
        </Link>
        <a
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary h-10 px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          href={center.mapsUrl ?? "#"}
          onClick={onNavigate}
          rel="noreferrer"
          target={center.mapsUrl ? "_blank" : undefined}
        >
          <Navigation className="size-4" />
          Ir ahora
        </a>
      </div>

      <div className="px-5 pb-5 flex flex-wrap gap-2">
        {center.wifi ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            <Wifi className="size-3.5" />
            WiFi
          </span>
        ) : null}
        {center.accessibility ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="size-3.5" />
            Accesible
          </span>
        ) : null}
        {center.phone ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Tel. {center.phone}
          </span>
        ) : null}
        {center.websiteUrl ? (
          <a
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            href={center.websiteUrl}
            rel="noreferrer"
            target="_blank"
          >
            Web oficial
            <ArrowRight className="size-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
