import type { TransportOption } from "@alabiblio/contracts";
import {
  ArrowLeft,
  Bike,
  Bus,
  Car,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Train,
  Users,
  Wifi,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PublicChrome } from "../components/PublicChrome";
import { cn } from "../lib/cn";
import { usePublicCenterDetail } from "../lib/publicCatalog";
import { useUserLocation } from "../lib/userLocation";

function ScheduleRulesBlock({
  rules,
}: {
  rules: Array<{ weekday: number; opensAt: string; closesAt: string }>;
}) {
  const labels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const grouped = labels.map((label, weekday) => ({
    label,
    entries: rules.filter((rule) => rule.weekday === weekday),
  }));

  return (
    <div className="space-y-1.5">
      {grouped.map((group) => (
        <div
          className="flex items-center justify-between rounded-xl border border-border bg-muted/35 px-3 py-2"
          key={group.label}
        >
          <span className="text-[12px] font-medium text-foreground">{group.label}</span>
          <span className="text-[12px] text-muted-foreground">
            {group.entries.length > 0
              ? group.entries.map((entry) => `${entry.opensAt} - ${entry.closesAt}`).join(", ")
              : "Cerrado"}
          </span>
        </div>
      ))}
    </div>
  );
}

function transportModeIcon(mode: TransportOption["mode"]) {
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

function statusBadge(status: string) {
  if (status === "Abierta") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-950/45 dark:text-emerald-200";
  }
  if (status === "Cerrada") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/40 dark:bg-rose-950/45 dark:text-rose-200";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/45 dark:text-amber-200";
}

export function CenterDetailRoute() {
  const { slug } = useParams();
  const { location } = useUserLocation();
  const { center, data, error, loading } = usePublicCenterDetail(slug, location);

  return (
    <PublicChrome backTo="/listado" compact>
      <main className="mx-auto max-w-[860px] space-y-4">
        {loading ? (
          <div className="rounded-[22px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Cargando centro...
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-destructive/20 bg-destructive/8 p-6 text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        ) : !center || !data ? (
          <div className="rounded-[22px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Centro no encontrado.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {center.kindLabel}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    statusBadge(center.headlineStatus),
                  )}
                >
                  {center.headlineStatus}
                </span>
              </div>

              <h1 className="mt-2.5 text-[1.3rem] font-semibold leading-tight text-foreground">
                {center.name}
              </h1>

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
              {[center.neighborhood, center.district].filter(Boolean).length > 0 ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {[center.neighborhood, center.district].filter(Boolean).join(" - ")}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
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

              <div className="mt-3 flex flex-wrap gap-2">
                {center.wifi ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-[11px] font-medium text-foreground">
                    <Wifi className="size-3.5" />
                    WiFi
                  </span>
                ) : null}
                {center.accessibility ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-[11px] font-medium text-foreground">
                    Accesible
                  </span>
                ) : null}
              </div>

              {center.operationalNote ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-600/40 dark:bg-amber-950/35 dark:text-amber-200">
                  <span className="font-semibold">Aviso:</span> {center.operationalNote}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2.5">
                {center.mapsUrl ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition hover:opacity-90"
                    href={center.mapsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Navigation className="size-4" />
                    Ir ahora
                  </a>
                ) : null}
                {data.item.contact.websiteUrl ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/45 px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted/65"
                    href={data.item.contact.websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="size-3.5" />
                    Ver ficha oficial
                  </a>
                ) : null}
              </div>
            </div>

            {/* Transporte */}
            {center.transportOptions.filter((o) => o.mode !== "car").length > 0 ? (
              <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Como llegar
                </h2>
                <div className="space-y-2">
                  {center.transportOptions
                    .filter((o) => o.mode !== "car")
                    .filter((o) => o.metrics.walkDistanceMeters === null || o.metrics.walkDistanceMeters <= 500)
                    .slice(0, 6)
                    .map((option) => {
                      const Icon = transportModeIcon(option.mode);
                      return (
                        <div
                          className="flex items-start gap-3 rounded-xl border border-border bg-muted/25 px-3.5 py-2.5"
                          key={option.id}
                        >
                          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-foreground">{option.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{option.summary}</p>
                            {option.lines.length > 0 ? (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {option.lines.map((line) => (
                                  <span
                                    className="inline-flex h-5 items-center rounded-md border border-border bg-card px-1.5 text-[10px] font-medium text-foreground"
                                    key={line}
                                  >
                                    {line}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          {option.metrics.walkDistanceMeters !== null && option.metrics.walkDistanceMeters > 0 ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {Math.round(option.metrics.walkDistanceMeters)} m
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : null}

            {/* Horario detallado */}
            <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Horario
              </h2>
              {center.schedule.displayText || center.schedule.rawText ? (
                <p className="mb-3 text-[13px] text-muted-foreground">
                  {center.schedule.displayText ?? center.schedule.rawText}
                </p>
              ) : null}
              <ScheduleRulesBlock rules={center.schedule.rules} />
              {center.schedule.notesUnparsed ? (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  {center.schedule.notesUnparsed}
                </p>
              ) : null}
            </div>

            {/* Equipamiento */}
            {data.item.equipment.length > 0 ? (
              <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Equipamiento
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {data.item.equipment.map((equipment) => (
                    <div
                      className="rounded-xl border border-border bg-muted/35 px-3 py-2.5"
                      key={equipment.key}
                    >
                      <p className="text-[12px] font-medium text-foreground">{equipment.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {equipment.available ? equipment.value : "No disponible"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Contacto */}
            {(data.item.contact.phone || data.item.contact.email) ? (
              <div className="rounded-[22px] border border-border bg-card p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Contacto
                </h2>
                <div className="space-y-1.5">
                  {data.item.contact.phone ? (
                    <p className="text-[13px] text-foreground">{data.item.contact.phone}</p>
                  ) : null}
                  {data.item.contact.email ? (
                    <p className="text-[13px] text-muted-foreground">{data.item.contact.email}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Back */}
            <div className="pb-2">
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:bg-muted/55"
                to="/listado"
              >
                <ArrowLeft className="size-4" />
                Volver al listado
              </Link>
            </div>
          </>
        )}
      </main>
    </PublicChrome>
  );
}
