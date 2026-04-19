import { ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LibraryCard } from "../components/LibraryCard";
import { PublicChrome } from "../components/PublicChrome";
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
    <div className="space-y-2">
      {grouped.map((group) => (
        <div
          className="flex items-center justify-between rounded-2xl border border-border bg-muted/45 px-3.5 py-2.5"
          key={group.label}
        >
          <span className="text-[13px] font-medium text-foreground">{group.label}</span>
          <span className="text-[12px] text-muted-foreground">
            {group.entries.length > 0
              ? group.entries.map((entry) => `${entry.opensAt} - ${entry.closesAt}`).join(", ")
              : "Cerrado o no disponible"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CenterDetailRoute() {
  const { slug } = useParams();
  const { location } = useUserLocation();
  const { center, data, error, loading } = usePublicCenterDetail(slug, location);

  return (
    <PublicChrome backTo="/listado" compact>
      <main className="mx-auto max-w-[900px]">
        {loading ? (
          <div className="rounded-[24px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Cargando centro...
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-destructive/20 bg-destructive/8 p-6 text-sm text-destructive shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        ) : !center || !data ? (
          <div className="rounded-[24px] border border-border bg-card p-6 text-sm text-muted-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            Centro no encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            <LibraryCard center={center} />

            <section className="rounded-[22px] border border-border bg-card p-4 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/45 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Direccion y contacto
                  </p>
                  <p className="mt-2 text-[13px] text-foreground">
                    {[
                      data.item.location.addressLine,
                      data.item.location.postalCode,
                      data.item.location.neighborhood,
                      data.item.location.district,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Direccion no disponible"}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {data.item.contact.phone ?? "Telefono no publicado"}
                    {data.item.contact.email ? ` · ${data.item.contact.email}` : ""}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/45 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Calidad y trazabilidad
                  </p>
                  <p className="mt-2 text-[13px] text-foreground">
                    Fuente: {center.sourceCode === "libraries" ? "Bibliotecas" : "Salas de estudio"}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Confianza horario: {center.schedule.confidence} · Revision manual: {center.schedule.needsManualReview ? "si" : "no"}
                  </p>
                </div>
              </div>

              <details className="mt-4 rounded-2xl border border-border bg-muted/35 px-3.5 py-3">
                <summary className="cursor-pointer text-[13px] font-medium text-foreground">
                  Ver horario estructurado
                </summary>
                <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                  {center.schedule.displayText ?? center.schedule.rawText ?? "Horario no disponible"}
                </p>
                <div className="mt-3">
                  <ScheduleRulesBlock rules={center.schedule.rules} />
                </div>
                {center.schedule.notesUnparsed ? (
                  <p className="mt-3 text-[12px] leading-6 text-muted-foreground">
                    Notas no estructuradas: {center.schedule.notesUnparsed}
                  </p>
                ) : null}
              </details>

              <details className="mt-3 rounded-2xl border border-border bg-muted/35 px-3.5 py-3">
                <summary className="cursor-pointer text-[13px] font-medium text-foreground">
                  Ver equipamiento tecnico
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {data.item.equipment.map((equipment) => (
                    <div
                      className="rounded-2xl border border-border bg-card px-3.5 py-3"
                      key={equipment.key}
                    >
                      <p className="text-[13px] font-medium text-foreground">{equipment.label}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {equipment.available ? equipment.value : "No disponible"}
                      </p>
                    </div>
                  ))}
                </div>
              </details>

              {data.item.contact.websiteUrl ? (
                <a
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-muted/45 px-4 py-2.5 text-[12px] font-medium text-foreground transition hover:bg-muted/65"
                  href={data.item.contact.websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Ver ficha oficial
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </section>

            <div className="flex justify-start">
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[12px] font-medium text-foreground transition hover:bg-muted/55"
                to="/listado"
              >
                Volver al listado
              </Link>
            </div>
          </div>
        )}
      </main>
    </PublicChrome>
  );
}
