import type { CenterCatalogItem } from "@alabiblio/contracts";

function statusLabel(item: CenterCatalogItem): string {
  if (item.schedule.isOpenNow === true) {
    return "Abierta ahora";
  }

  if (item.schedule.isOpenNow === false && item.schedule.nextChangeAt) {
    return "Cerrada, abre despues";
  }

  return "Horario pendiente de revision";
}

function scheduleTone(item: CenterCatalogItem): string {
  if (item.schedule.isOpenNow === true) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (item.schedule.isOpenNow === false) {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-slate-200 text-slate-700";
}

export function CatalogCard({ item }: { item: CenterCatalogItem }) {
  return (
    <article className="rounded-[30px] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_80px_rgba(23,32,42,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#1f2a32] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {item.kindLabel}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scheduleTone(item)}`}>
              {statusLabel(item)}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--muted)]">
              Parser {item.schedule.confidence}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--ink)]">
            {item.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {item.addressLine ?? "Direccion pendiente"}{item.neighborhood ? ` · ${item.neighborhood}` : ""}{item.district ? ` · ${item.district}` : ""}
          </p>
        </div>

        <div className="min-w-[180px] rounded-[24px] bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            Horario util
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {item.schedule.displayText ?? "No disponible"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[22px] bg-white/72 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            Servicios
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>Wifi: {item.wifi ? "si" : "no confirmado"}</li>
            <li>Accesible: {item.accessibility ? "si" : "sin confirmar"}</li>
            <li>Aforo: {item.capacityValue ?? "sin dato"}</li>
          </ul>
        </div>

        <div className="rounded-[22px] bg-white/72 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            Como llegar
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {item.transportText ?? "Sin bloque de transporte textual en el origen oficial."}
          </p>
        </div>

        <div className="rounded-[22px] bg-white/72 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            Acciones
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a
              className="rounded-full bg-[#1f2a32] px-4 py-2 font-medium text-white"
              href={item.websiteUrl ?? "#"}
              rel="noreferrer"
              target={item.websiteUrl ? "_blank" : undefined}
            >
              Ver detalles
            </a>
            <a
              className="rounded-full border border-[var(--card-border)] bg-white px-4 py-2 font-medium text-[var(--ink)]"
              href={
                item.latitude !== null && item.longitude !== null
                  ? `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`
                  : "#"
              }
              rel="noreferrer"
              target={item.latitude !== null && item.longitude !== null ? "_blank" : undefined}
            >
              Ir ahora
            </a>
          </div>
        </div>
      </div>

      {item.schedule.notesUnparsed ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-[var(--card-border)] bg-white/65 p-4 text-sm leading-6 text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">Notas pendientes de estructurar:</span>{" "}
          {item.schedule.notesUnparsed}
        </div>
      ) : null}
    </article>
  );
}
