import type { CenterDetailItem } from "@alabiblio/contracts/centers";

type CenterDetailPanelProps = {
  center: CenterDetailItem | null;
  error: string | null;
  loading: boolean;
  onClose: () => void;
};

function renderValue(value: string | number | null): string {
  if (value === null) {
    return "Sin dato";
  }

  return String(value);
}

export function CenterDetailPanel({
  center,
  error,
  loading,
  onClose,
}: CenterDetailPanelProps) {
  if (loading) {
    return (
      <aside className="detail-panel detail-panel--state">
        <strong>Cargando detalle</strong>
        <p>Consultando el centro seleccionado.</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="detail-panel detail-panel--state">
        <strong>Error</strong>
        <p>{error}</p>
      </aside>
    );
  }

  if (!center) {
    return (
      <aside className="detail-panel detail-panel--state">
        <strong>Selecciona un centro</strong>
        <p>Abre una card para ver contacto, coordenadas y horario raw.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="detail-panel__top">
        <div>
          <span className="detail-panel__kind">{center.kind_label}</span>
          <h2>{center.name}</h2>
          <p>
            {[center.district, center.neighborhood].filter(Boolean).join(" · ") ||
              "Sin distrito o barrio"}
          </p>
        </div>
        <button className="detail-panel__close" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <dl className="detail-panel__grid">
        <div>
          <dt>Direccion</dt>
          <dd>{renderValue(center.address_line)}</dd>
        </div>
        <div>
          <dt>Codigo postal</dt>
          <dd>{renderValue(center.postal_code)}</dd>
        </div>
        <div>
          <dt>Municipio</dt>
          <dd>{center.municipality}</dd>
        </div>
        <div>
          <dt>Telefono</dt>
          <dd>{renderValue(center.phone)}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{renderValue(center.email)}</dd>
        </div>
        <div>
          <dt>Web</dt>
          <dd>
            {center.website_url ? (
              <a href={center.website_url} target="_blank" rel="noreferrer">
                Abrir ficha oficial
              </a>
            ) : (
              "Sin web"
            )}
          </dd>
        </div>
        <div>
          <dt>Capacidad</dt>
          <dd>{renderValue(center.capacity_text)}</dd>
        </div>
        <div>
          <dt>Valor numerico</dt>
          <dd>{renderValue(center.capacity_value)}</dd>
        </div>
        <div>
          <dt>Coordenadas</dt>
          <dd>
            {center.lat !== null && center.lon !== null
              ? `${center.lat}, ${center.lon}`
              : "Sin coordenadas validas"}
          </dd>
        </div>
        <div>
          <dt>coord_status</dt>
          <dd>{center.coord_status}</dd>
        </div>
      </dl>

      <div className="detail-panel__badges">
        {center.wifi_flag ? <span>Wifi</span> : null}
        {center.sockets_flag ? <span>Enchufes</span> : null}
        {center.accessibility_flag ? <span>Accesible</span> : null}
        {center.open_air_flag ? <span>Al aire libre</span> : null}
      </div>

      <section className="detail-panel__section">
        <h3>Horario raw</h3>
        <pre>{center.raw_schedule_text ?? "Sin horario raw"}</pre>
      </section>

      <section className="detail-panel__section">
        <h3>Fuentes</h3>
        <ul className="detail-panel__sources">
          {center.sources.map((source) => (
            <li key={`${source.code}-${source.external_id}`}>
              <strong>{source.name}</strong>
              <span>{source.code}</span>
              <span>{source.external_id}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
