import type { CenterListItem } from "@alabiblio/contracts/centers";

type CenterCardProps = {
  center: CenterListItem;
  isSelected: boolean;
  onSelect: (slug: string) => void;
};

function renderBadge(label: string) {
  return <span className="center-card__badge">{label}</span>;
}

function getStatusTone(center: CenterListItem): {
  label: string;
  className: string;
  helper: string | null;
} {
  if (center.schedule_confidence !== null && center.schedule_confidence < 0.4) {
    return {
      label: "Horario no fiable",
      className: "status-pill status-pill--warning",
      helper: center.today_human_schedule,
    };
  }

  if (center.is_open_now) {
    return {
      label: "Abierto ahora",
      className: "status-pill status-pill--open",
      helper: center.closes_today
        ? `Cierra a las ${center.closes_today}`
        : center.today_human_schedule,
    };
  }

  return {
    label: "Cerrado",
    className: "status-pill status-pill--closed",
    helper: center.opens_today
      ? `Abre a las ${center.opens_today}`
      : center.today_human_schedule,
  };
}

export function CenterCard({
  center,
  isSelected,
  onSelect,
}: CenterCardProps) {
  const meta = [center.district, center.neighborhood]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
  const status = getStatusTone(center);

  return (
    <button
      className={`center-card${isSelected ? " center-card--selected" : ""}`}
      type="button"
      onClick={() => onSelect(center.slug)}
    >
      <div className="center-card__header">
        <div className="center-card__header-top">
          <span className="center-card__kind">{center.kind_label}</span>
          <span className={status.className}>{status.label}</span>
        </div>
        <h2>{center.name}</h2>
        {meta ? <p className="center-card__meta">{meta}</p> : null}
        <p className="center-card__schedule">
          {center.today_human_schedule ?? "Horario de hoy sin estructurar"}
        </p>
        {status.helper ? <p className="center-card__helper">{status.helper}</p> : null}
      </div>

      <dl className="center-card__details">
        <div>
          <dt>Direccion</dt>
          <dd>{center.address_line ?? "Direccion pendiente"}</dd>
        </div>
        <div>
          <dt>Telefono</dt>
          <dd>{center.phone ?? "Sin telefono"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{center.email ?? "Sin email"}</dd>
        </div>
        <div>
          <dt>Capacidad</dt>
          <dd>{center.capacity_text ?? "Sin dato de aforo"}</dd>
        </div>
      </dl>

      <div className="center-card__badges">
        {center.wifi_flag ? renderBadge("Wifi") : null}
        {center.sockets_flag ? renderBadge("Enchufes") : null}
        {center.accessibility_flag ? renderBadge("Accesible") : null}
        {center.open_air_flag ? renderBadge("Al aire libre") : null}
      </div>
    </button>
  );
}
