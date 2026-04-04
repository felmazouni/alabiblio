import type { CenterDetailItem, ScheduleRegularRule } from "@alabiblio/contracts/centers";
import type { CenterMobility } from "@alabiblio/contracts/mobility";
import type { UserOrigin } from "@alabiblio/contracts/origin";
import {
  ArrowLeft,
  Bike,
  Bus,
  Car,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Navigation,
  TrainFront,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  buildBikeCopy,
  buildBusCopy,
  buildCarCopy,
  buildHumanReason,
  buildMetroCopy,
  buildModuleNote,
  modeLabel,
} from "../transportCopy";
import { CenterFeatureGrid } from "./CenterFeatureGrid";
import { CenterMobilityMap } from "./CenterMobilityMap";
import { EmptyStateCard } from "../../ui/EmptyStateCard";

type CenterDetailScreenProps = {
  item: CenterDetailItem | null;
  mobility: CenterMobility | null;
  origin: UserOrigin | null;
  loading: boolean;
  error: string | null;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function buildCompactSchedule(rules: ScheduleRegularRule[]): Array<{ day: string; hours: string }> {
  const weekdays = new Map<number, string[]>();
  for (const rule of rules) {
    const label = `${rule.opens_at}-${rule.closes_at}`;
    const current = weekdays.get(rule.weekday) ?? [];
    current.push(label);
    weekdays.set(rule.weekday, current);
  }
  return WEEKDAY_LABELS.map((label, index) => ({
    day: label,
    hours: weekdays.has(index + 1) ? weekdays.get(index + 1)?.join(", ") ?? "" : "-",
  }));
}

function formatMapsUrl(item: CenterDetailItem): string | null {
  if (item.lat === null || item.lon === null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`;
}

export function CenterDetailScreen({
  item,
  mobility,
  origin,
  loading,
  error,
}: CenterDetailScreenProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="detail-screen">
        <EmptyStateCard title="Cargando detalle" body="Preparando decision, transporte y contexto." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="detail-screen">
        <EmptyStateCard title="No se pudo cargar" body={error} />
      </section>
    );
  }

  if (!item || !mobility) {
    return (
      <section className="detail-screen">
        <EmptyStateCard title="Centro no disponible" body="No hay payload consistente para este centro." />
      </section>
    );
  }

  const mapsUrl = formatMapsUrl(item);
  const scheduleRows = buildCompactSchedule(item.schedule.regular_rules);
  const reason = buildHumanReason(mobility);

  return (
    <section className="detail-screen">
      <div className="detail-screen__topbar">
        <button type="button" className="detail-screen__back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Volver
        </button>
      </div>

      <section className={`detail-screen__hero detail-screen__hero--${item.schedule.is_open_now ? "open" : "closed"}`}>
        <div className="detail-screen__hero-band" />
        <div className="detail-screen__hero-header">
          <div className="detail-screen__hero-copy">
            <span className="detail-screen__eyebrow">{item.kind_label}</span>
            <h1>{item.name}</h1>
            <p>{[item.address_line, item.neighborhood, item.district].filter(Boolean).join(" / ") || "Madrid"}</p>
          </div>
          <span className={item.schedule.is_open_now ? "detail-screen__status detail-screen__status--open" : "detail-screen__status detail-screen__status--closed"}>
            {item.schedule.is_open_now ? "Abierta" : "Cerrada"}
          </span>
        </div>

        <div className="detail-screen__kpi-strip">
          <div className="detail-screen__kpi"><Clock3 size={14} /><span>{item.schedule.today_human_schedule ?? "Sin horario"}</span></div>
          <div className="detail-screen__kpi"><Users size={14} /><span>{item.capacity_value ?? "s/d"} plazas</span></div>
          <div className="detail-screen__kpi">
            <Navigation size={14} />
            <span>
              {mobility.summary.best_time_minutes !== null && mobility.summary.best_mode
                ? `${mobility.summary.best_time_minutes} min - ${modeLabel(mobility.summary.best_mode)}`
                : "Sin origen suficiente"}
            </span>
          </div>
          {origin ? <div className="detail-screen__kpi"><MapPin size={14} /><span>{origin.label}</span></div> : null}
        </div>

        {mapsUrl ? (
          <div className="detail-screen__cta-row">
            <a className="detail-screen__cta" href={mapsUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Ver en Maps
            </a>
          </div>
        ) : null}
      </section>

      <section className="detail-screen__section">
        <div className="detail-screen__section-copy">
          <span className="detail-screen__section-label">Como llegar</span>
          <h3>{mobility.summary.rationale[0] ?? "Decision de movilidad"}</h3>
          <p>{reason}</p>
        </div>
        <div className="transport-v1-list">
          <div className="transport-v1-row">
            <span className="transport-v1-row__label"><Car size={14} />Coche</span>
            <div className="transport-v1-row__copy">
              <span className="transport-v1-row__body">{buildCarCopy(mobility)}</span>
              {buildModuleNote("car", mobility) ? <span className="transport-v1-row__note">{buildModuleNote("car", mobility)}</span> : null}
            </div>
          </div>
          <div className="transport-v1-row">
            <span className="transport-v1-row__label"><Bus size={14} />EMT</span>
            <div className="transport-v1-row__copy">
              <span className="transport-v1-row__body">{buildBusCopy(mobility)}</span>
              {buildModuleNote("bus", mobility) ? <span className="transport-v1-row__note">{buildModuleNote("bus", mobility)}</span> : null}
            </div>
          </div>
          <div className="transport-v1-row">
            <span className="transport-v1-row__label"><Bike size={14} />BiciMAD</span>
            <div className="transport-v1-row__copy">
              <span className="transport-v1-row__body">{buildBikeCopy(mobility)}</span>
              {buildModuleNote("bike", mobility) ? <span className="transport-v1-row__note">{buildModuleNote("bike", mobility)}</span> : null}
            </div>
          </div>
          <div className="transport-v1-row">
            <span className="transport-v1-row__label"><TrainFront size={14} />Metro</span>
            <div className="transport-v1-row__copy">
              <span className="transport-v1-row__body">{buildMetroCopy(mobility)}</span>
              {buildModuleNote("metro", mobility) ? <span className="transport-v1-row__note">{buildModuleNote("metro", mobility)}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="detail-screen__section">
        <CenterMobilityMap center={item} mobility={mobility} ser={item.ser} origin={origin} />
      </section>

      <section className="detail-screen__section">
        <div className="detail-screen__section-copy">
          <span className="detail-screen__section-label">Servicios</span>
          <h3>Prestaciones y contacto</h3>
        </div>
        <div className="detail-screen__services-strip">
          {item.contact_summary ? (
            <div className="detail-screen__service-item">
              <FileText size={14} />
              <span>{item.contact_summary}</span>
            </div>
          ) : null}
          {item.website_url ? (
            <a className="detail-screen__service-item detail-screen__service-item--link" href={item.website_url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              <span>Web</span>
            </a>
          ) : null}
        </div>
        <CenterFeatureGrid features={item.features} />
      </section>

      <section className="detail-screen__section">
        <div className="detail-screen__section-copy">
          <span className="detail-screen__section-label">Horario</span>
          <h3>{item.schedule.today_human_schedule ?? "Sin horario estructurado"}</h3>
        </div>
        <div className="detail-screen__schedule-compact">
          {scheduleRows.map(({ day, hours }) => (
            <div key={day} className={`detail-screen__schedule-row${hours === "-" ? " detail-screen__schedule-row--closed" : ""}`}>
              <span className="detail-screen__schedule-day">{day}</span>
              <span className="detail-screen__schedule-hours">{hours}</span>
            </div>
          ))}
        </div>
        {item.schedule.warnings.length > 0 ? (
          <div className="detail-screen__warnings">
            {item.schedule.warnings.map((warning) => (
              <span key={`${warning.code}-${warning.message}`} className="decision-card__transport-pill">
                {warning.message}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
