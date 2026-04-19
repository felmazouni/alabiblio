import type { DataOrigin, TransportOption } from "@alabiblio/contracts";
import {
  Bike,
  Bus,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Lightbulb,
  MapPin,
  Navigation,
  Plug,
  ShieldCheck,
  Star,
  Thermometer,
  Train,
  TriangleAlert,
  Users,
  Volume2,
  Wifi,
} from "lucide-react";
import { useState, type ElementType } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import type { PublicCenterPresentation } from "../lib/publicCatalog";

const aspectItems = [
  { key: "silencio", label: "Silencio", icon: Volume2 },
  { key: "wifi", label: "WiFi", icon: Wifi },
  { key: "limpieza", label: "Limpieza", icon: SparklineIcon },
  { key: "enchufes", label: "Enchufes", icon: Plug },
  { key: "temperatura", label: "Temperatura", icon: Thermometer },
  { key: "iluminacion", label: "Iluminacion", icon: Lightbulb },
] as const;

function SparklineIcon(props: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 16.5L8 12l3 3 5-7 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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

function availabilityProgress(center: PublicCenterPresentation) {
  return center.capacityOrigin !== "not_available" && center.capacityValue !== null ? 100 : 0;
}

function renderStars(ratingOrigin: DataOrigin) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-3.5",
            ratingOrigin === "not_available"
              ? "text-slate-300 dark:text-slate-600"
              : "fill-amber-400 text-amber-400",
          )}
        />
      ))}
    </div>
  );
}

function AspectRow({
  label,
  icon: Icon,
  hasData,
}: {
  label: string;
  icon: ElementType;
  hasData: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <div className="flex items-center gap-2 text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700">
          {hasData ? (
            <div className="h-1.5 w-10 rounded-full bg-emerald-500" />
          ) : null}
        </div>
        <span className="min-w-[28px] text-right text-[11px] text-muted-foreground">
          {hasData ? "4.0" : "N/D"}
        </span>
      </div>
    </div>
  );
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

function RatingSection({ center }: { center: PublicCenterPresentation }) {
  const hasRatings = center.ratingOrigin !== "not_available";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {renderStars(center.ratingOrigin)}
          <div className="flex items-baseline gap-2">
            <span className="text-[1rem] font-semibold text-foreground">
              {hasRatings && center.ratingAverage !== null
                ? center.ratingAverage.toFixed(1)
                : "0.0"}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {hasRatings
                ? `(${center.ratingCount} opiniones)`
                : "(sin valoraciones todavia)"}
            </span>
          </div>
        </div>

        <button
          className="inline-flex h-8 items-center justify-center rounded-xl border border-border bg-card px-3 text-[12px] font-medium text-muted-foreground"
          disabled
          type="button"
        >
          Opinar (proximamente)
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-x-6">
        {aspectItems.map((aspect) => (
          <AspectRow
            hasData={hasRatings}
            icon={aspect.icon}
            key={aspect.key}
            label={aspect.label}
          />
        ))}
      </div>
      {!hasRatings ? (
        <p className="text-[11px] text-muted-foreground">
          Las valoraciones se activaran cuando exista voto real verificado.
        </p>
      ) : null}
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

function MetaLine({ center }: { center: PublicCenterPresentation }) {
  return (
    <>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
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
        <p className="mt-1 text-[11px] text-muted-foreground">{joinPlace(center)}</p>
      ) : null}
    </>
  );
}

function SummaryBox({ center }: { center: PublicCenterPresentation }) {
  const progress = availabilityProgress(center);
  const capacitySummaryLabel =
    center.capacityOrigin === "official_structured"
      ? "Aforo publicado"
      : center.capacityOrigin === "official_text_parsed"
        ? "Aforo publicado (texto oficial)"
        : "Aforo no disponible";
  const capacitySummaryNote =
    center.capacityOrigin === "official_structured"
      ? "Dato oficial de capacidad. La ocupacion en tiempo real todavia no esta integrada."
      : center.capacityOrigin === "official_text_parsed"
        ? "Capacidad extraida de texto oficial. La ocupacion en tiempo real todavia no esta integrada."
        : "Sin aforo publicado o verificable.";

  return (
    <div className="rounded-[16px] border border-border bg-muted/40 px-3 py-3">
      <div className="flex items-center gap-2 text-[12px]">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Horario:</span>
        <span className="font-medium text-foreground">{center.scheduleLabel}</span>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Users className="size-3.5" />
            {capacitySummaryLabel}
          </span>
          <span className="font-medium text-foreground">
            {center.capacityOrigin !== "not_available" && center.capacityValue !== null
              ? `${center.capacityValue} plazas`
              : "N/D"}
          </span>
        </div>

        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              center.capacityOrigin !== "not_available"
                ? "bg-slate-300 dark:bg-slate-600"
                : "bg-slate-300 dark:bg-slate-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-1.5 text-[10px] text-muted-foreground">{capacitySummaryNote}</p>
      </div>
    </div>
  );
}

export function LibraryCard({
  center,
  viewMode = "card",
}: {
  center: PublicCenterPresentation;
  viewMode?: "card" | "list";
}) {
  const [isTransportExpanded, setIsTransportExpanded] = useState(
    viewMode === "card",
  );

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
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-primary text-[1.2rem] font-bold text-primary-foreground shadow-[0_12px_20px_rgba(15,91,167,0.18)]">
            {center.rankingPosition ?? "1"}
          </div>

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

            <h3 className="mt-2 text-[1rem] font-semibold leading-tight text-foreground md:text-[1.08rem]">
              {center.name}
            </h3>
            <MetaLine center={center} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <SummaryBox center={center} />
      </div>

      <div className="px-4 pb-3">
        <RatingSection center={center} />
      </div>

      {center.operationalNote && center.operationalNoteOrigin !== "not_available" ? (
        <div className="px-4 pb-3">
          <div className="rounded-[16px] border border-amber-300 bg-amber-50 px-3 py-3 dark:border-amber-600/40 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200">
                    Texto operativo
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      originTone(center.operationalNoteOrigin),
                    )}
                  >
                    {originLabel(center.operationalNoteOrigin)}
                  </span>
                </div>
                <p className="text-[11px] leading-5 text-amber-900 dark:text-amber-100">
                  {center.operationalNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="px-4 pb-3">
        <button
          className="flex w-full items-center justify-between rounded-[14px] border border-border bg-muted/35 px-3 py-2.5"
          onClick={() => setIsTransportExpanded((current) => !current)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Train className="size-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium text-foreground">Como llegar</span>
            <span className="text-[10px] text-muted-foreground">
              ({center.transportOptions.length} opciones)
            </span>
          </div>
          {isTransportExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {isTransportExpanded ? (
          <div className="mt-2.5 space-y-2">
            {center.transportOptions.length > 0 ? (
              center.transportOptions.map((option) => (
                <TransportOptionCard key={option.id} option={option} />
              ))
            ) : (
              <div className="rounded-[16px] border border-border bg-muted/35 px-3 py-3 text-[12px] text-muted-foreground">
                No hay opciones de transporte publicadas para este centro.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex gap-2.5 px-4 pb-4">
        <Link
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-[13px] font-medium text-foreground transition hover:bg-muted/40"
          to={`/centros/${center.slug}`}
        >
          <ExternalLink className="size-4" />
          Ver detalles
        </Link>
        <a
          className={cn(
            "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-[13px] font-medium text-primary-foreground transition hover:opacity-90",
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

      <div className="flex flex-wrap gap-2 px-4 pb-4">
        {center.wifi ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
            <Wifi className="size-3" />
            WiFi
          </span>
        ) : null}
        {center.accessibility ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
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
