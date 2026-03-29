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

function getWarningLabel(code: string): string {
  switch (code) {
    case "seasonal_july_august_detected":
      return "Julio y agosto";
    case "seasonal_rules_detected":
      return "Horario estacional";
    case "exam_extension_detected":
      return "Ampliacion por examenes";
    case "schedule_requires_manual_contact":
      return "Confirmacion manual";
    case "multiple_primary_audiences":
      return "Horarios multiples";
    case "split_schedule_detected":
      return "Horario partido";
    case "holiday_without_explicit_dates":
      return "Festivos ambiguos";
    case "regular_rules_not_parsed":
      return "Estructura insuficiente";
    default:
      return code;
  }
}

function getConfidenceLabel(center: CenterDetailItem): string {
  switch (center.schedule.schedule_confidence_label) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
  }
}

function getDetailStatus(center: CenterDetailItem): {
  label: string;
  className: string;
  helper: string | null;
} {
  if (center.schedule.schedule_confidence_label === "low") {
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
          <h3>Estado operativo</h3>
          <p>{status.label}</p>
          <span>{status.helper ?? "Sin cambio fiable para hoy"}</span>
        </div>
        <div>
          <h3>Horario de hoy</h3>
          <p>{center.schedule.today_human_schedule ?? "Sin horario estructurado"}</p>
          <span>
            {center.schedule.opens_today && center.schedule.closes_today
              ? `${center.schedule.opens_today} - ${center.schedule.closes_today}`
              : "Sin tramo horario fiable"}
          </span>
        </div>
        <div>
          <h3>Confianza</h3>
          <p>{getConfidenceLabel(center)}</p>
          <span>{center.data_freshness ?? "Sin fecha de actualizacion"}</span>
        </div>
      </section>

      <dl className="detail-panel__grid">
        <div>
          <dt>Direccion</dt>
          <dd>{renderValue(center.address_line)}</dd>
        </div>
        <div>
          <dt>Contacto</dt>
          <dd>{renderValue(center.contact_summary)}</dd>
        </div>
        <div>
          <dt>Telefono</dt>
          <dd>{renderValue(center.phone)}</dd>
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
          <dt>Email</dt>
          <dd>{renderValue(center.email)}</dd>
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
              <li
                key={`${warning.code}-${index}`}
                className={`detail-panel__warning detail-panel__warning--${warning.severity}`}
              >
                <strong>{getWarningLabel(warning.code)}</strong>
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
        <h3>Contexto operativo</h3>
        <dl className="detail-panel__grid detail-panel__grid--secondary">
          <div>
            <dt>Notas de la fuente</dt>
            <dd>{renderValue(center.schedule.notes_raw ?? center.notes_raw)}</dd>
          </div>
          <div>
            <dt>Fuente actualizada</dt>
            <dd>{renderValue(center.data_freshness)}</dd>
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
            <dt>Estado de coordenadas</dt>
            <dd>{renderValue(center.coord_status)}</dd>
          </div>
        </dl>
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

      <section className="detail-panel__section detail-panel__section--raw">
        <h3>Horario raw</h3>
        <pre>{center.schedule.raw_schedule_text ?? "Sin horario raw"}</pre>
      </section>
    </aside>
  );
}
