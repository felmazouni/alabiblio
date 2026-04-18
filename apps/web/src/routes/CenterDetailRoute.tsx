import { ExternalLink, MapPin, Phone, ShieldCheck, Wifi } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LibraryCard } from "../components/LibraryCard";
import { PublicChrome } from "../components/PublicChrome";
import { usePublicCatalog } from "../lib/publicCatalog";

export function CenterDetailRoute() {
  const { slug } = useParams();
  const { error, items, loading } = usePublicCatalog();
  const center = items.find((item) => item.slug === slug);

  return (
    <PublicChrome backTo="/listado" compact>
      <main className="mx-auto max-w-[820px]">
        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            Cargando centro…
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        ) : !center ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-600 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            Centro no encontrado.
          </div>
        ) : (
          <div className="space-y-5">
            <LibraryCard center={center} />

            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <h2 className="text-lg font-semibold text-slate-950">Datos operativos</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>{center.addressLine ?? "Dirección pendiente"}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>{center.phone ?? "Teléfono no publicado en la fuente"}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Wifi className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>{center.wifi ? "WiFi indicado en fuente oficial" : "WiFi no confirmado"}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>{center.accessibility ? "Accesibilidad indicada" : "Accesibilidad no confirmada"}</span>
                  </p>
                </div>
              </article>

              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <h2 className="text-lg font-semibold text-slate-950">Fuente y estado</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <p>Fuente oficial: {center.sourceCode === "libraries" ? "Bibliotecas" : "Salas de estudio"}</p>
                  <p>Confianza de horario: {center.schedule.confidence}</p>
                  <p>Tipo: {center.kindLabel}</p>
                  <p>Aforo: {center.capacityValue ? `${center.capacityValue} plazas` : "sin dato estructurado"}</p>
                </div>
                {center.websiteUrl ? (
                  <a
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                    href={center.websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Ver ficha oficial
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
              </article>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-semibold text-slate-950">Horarios y notas</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {center.schedule.displayText ?? center.schedule.rawText ?? "Horario pendiente de estructuración."}
              </p>
              {center.schedule.notesUnparsed ? (
                <p className="mt-3 text-sm leading-7 text-slate-600">{center.schedule.notesUnparsed}</p>
              ) : null}
            </section>

            <div className="flex justify-start">
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
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
