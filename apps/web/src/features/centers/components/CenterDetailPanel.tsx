import type {
  CenterDetailItem,
  ScheduleRegularRule,
} from "@alabiblio/contracts/centers";

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

function weekdayLabel(weekday: number): string {
  const labels = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
  ];

  return labels[weekday] ?? "Dia";
}

function groupRegularRules(rules: ScheduleRegularRule[]): Array<{
  weekday: number;
  text: string;
}> {
  return [...new Set(rules.map((rule) => rule.weekday))]
    .sort((left, right) => left - right)
    .map((weekday) => {
      const groupedRules = rules
        .filter((rule) => rule.weekday === weekday)
        .sort((left, right) => left.sequence - right.sequence);

      return {
        weekday,
        text: groupedRules
          .map((rule) => `${rule.opens_at}-${rule.closes_at}`)
          .join(" | "),
      };
    });
}

function getDetailStatus(center: CenterDetailItem): {
  label: string;
  className: string;
  helper: string | null;
} {
  if (
    center.schedule.schedule_confidence !== null &&
    center.schedule.schedule_confidence < 0.4
  ) {
    return {
      label: "Horario no fiable",
      className: "status-pill status-pill--warning",
      helper: center.schedule.today_human_schedule,
    };
  }

  if (center.schedule.is_open_now) {
    return {
      label: "Abierto ahora",
      className: "status-pill status-pill--open",
      helper: center.schedule.closes_today
        ? `Cierra a las ${center.schedule.closes_today}`
        : center.schedule.today_human_schedule,
    };
  }

  return {
    label: "Cerrado",
    className: "status-pill status-pill--closed",
    helper: center.schedule.opens_today
      ? `Abre a las ${center.schedule.opens_today}`
      : center.schedule.today_human_schedule,
  };
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
        <p>Abre una card para ver estado operativo, horario y contacto.</p>
      </aside>
    );
  }

  const status = getDetailStatus(center);
  const groupedRules = groupRegularRules(center.schedule.regular_rules);

  return (
    <aside className="detail-panel">
      <div className="detail-panel__top">
        <div>
          <div className="detail-panel__status-row">
            <span className="detail-panel__kind">{center.kind_label}</span>
            <span className={status.className}>{status.label}</span>
          </div>
          <h2>{center.name}</h2>
          <p>
            {[center.district, center.neighborhood].filter(Boolean).join(" | ") ||
              "Sin distrito o barrio"}
          </p>
        </div>
        <button className="detail-panel__close" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <section className="detail-panel__hero">
        <div>
          <h3>Horario de hoy</h3>
          <p>{center.schedule.today_human_schedule ?? "Sin horario estructurado"}</p>
        </div>
        <div>
          <h3>Proximo cambio</h3>
          <p>{status.helper ?? "Sin dato fiable"}</p>
        </div>
        <div>
          <h3>Confianza</h3>
          <p>
            {center.schedule.schedule_confidence !== null
              ? `${Math.round(center.schedule.schedule_confidence * 100)}%`
              : "Sin dato"}
          </p>
        </div>
      </section>

      <dl className="detail-panel__grid">
        <div>
          <dt>Direccion</dt>
          <dd>{renderValue(center.address_line)}</dd>
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
          <dt>Coordenadas</dt>
          <dd>
            {center.lat !== null && center.lon !== null
              ? `${center.lat}, ${center.lon}`
              : "Sin coordenadas validas"}
          </dd>
        </div>
      </dl>

      <div className="detail-panel__badges">
        {center.wifi_flag ? <span>Wifi</span> : null}
        {center.sockets_flag ? <span>Enchufes</span> : null}
        {center.accessibility_flag ? <span>Accesible</span> : null}
        {center.open_air_flag ? <span>Al aire libre</span> : null}
      </div>

      <section className="detail-panel__section">
        <h3>Horario estructurado</h3>
        {groupedRules.length > 0 ? (
          <ul className="detail-panel__sources">
            {groupedRules.map((item) => (
              <li key={item.weekday}>
                <strong>{weekdayLabel(item.weekday)}</strong>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-panel__fallback">
            Todavia no hay reglas estructuradas fiables.
          </p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Avisos y anomalias</h3>
        {center.schedule.warnings.length > 0 ? (
          <ul className="detail-panel__warnings">
            {center.schedule.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`}>
                <strong>{warning.code}</strong>
                <span>{warning.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-panel__fallback">
            Sin avisos de parseo en la version activa.
          </p>
        )}
      </section>

      <section className="detail-panel__section">
        <h3>Horario raw</h3>
        <pre>{center.schedule.raw_schedule_text ?? "Sin horario raw"}</pre>
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
