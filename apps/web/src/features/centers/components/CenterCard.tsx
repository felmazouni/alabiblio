import type { CenterListItem } from "@alabiblio/contracts/centers";

type CenterCardProps = {
  center: CenterListItem;
  isSelected: boolean;
  onSelect: (slug: string) => void;
};

function renderBadge(label: string) {
  return <span className="center-card__badge">{label}</span>;
}

export function CenterCard({
  center,
  isSelected,
  onSelect,
}: CenterCardProps) {
  const meta = [center.district, center.neighborhood]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return (
    <button
      className={`center-card${isSelected ? " center-card--selected" : ""}`}
      type="button"
      onClick={() => onSelect(center.slug)}
    >
      <div className="center-card__header">
        <span className="center-card__kind">{center.kind_label}</span>
        <h2>{center.name}</h2>
        {meta ? <p className="center-card__meta">{meta}</p> : null}
      </div>

      <dl className="center-card__details">
        <div>
          <dt>Dirección</dt>
          <dd>{center.address_line ?? "Dirección pendiente"}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{center.phone ?? "Sin teléfono"}</dd>
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
