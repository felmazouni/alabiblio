import type {
  CenterDetailItem,
  GetCenterDetailResponse,
  ScheduleRegularRule,
} from "@alabiblio/contracts/centers";
import type {
  CenterMobility,
  GetCenterMobilityResponse,
} from "@alabiblio/contracts/mobility";
import type { UserOrigin } from "@alabiblio/contracts/origin";
import {
  ArrowLeft,
  Bike,
  Bus,
  Car,
  Clock3,
  ExternalLink,
  Flag,
  FileText,
  MapPin,
  Navigation,
  Route as RouteIcon,
  TrainFront,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  buildDetailModeSummary,
  buildFeaturedFooterTiles,
  buildFeaturedTransportRows,
  buildHumanReason,
  buildModuleNote,
  confidenceSourceLabel,
  modeLabel,
} from "../transportCopy";
import { getDetailMobilityScopeLabel } from "../scopePresentation";
import { CenterFeatureGrid } from "./CenterFeatureGrid";
import { CenterMobilityMap } from "./CenterMobilityMap";
import { EmptyStateCard } from "../../ui/EmptyStateCard";

type CenterDetailScreenProps = {
  item: CenterDetailItem | null;
  detailScope: GetCenterDetailResponse["meta"]["scope"] | null;
  mobility: CenterMobility | null;
  mobilityScope: GetCenterMobilityResponse["meta"]["scope"] | null;
  origin: UserOrigin | null;
  loading: boolean;
  mobilityLoading: boolean;
  mobilityError: string | null;
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
  detailScope,
  mobility,
  mobilityScope,
  origin,
  loading,
  mobilityLoading,
  mobilityError,
  error,
}: CenterDetailScreenProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="detail-screen">
        <section className="detail-screen__hero detail-screen__hero--loading">
          <div className="detail-screen__hero-header">
            <div className="detail-screen__hero-copy">
              <span className="detail-screen__eyebrow">Cargando centro</span>
              <h1 className="detail-screen__skeleton detail-screen__skeleton--title" />
              <p className="detail-screen__skeleton detail-screen__skeleton--line" />
            </div>
          </div>
          <div className="detail-screen__kpi-strip">
            <div className="detail-screen__kpi detail-screen__kpi--skeleton" />
            <div className="detail-screen__kpi detail-screen__kpi--skeleton" />
            <div className="detail-screen__kpi detail-screen__kpi--skeleton" />
          </div>
        </section>
        <section className="detail-screen__section">
          <div className="detail-screen__section-copy">
            <span className="detail-screen__section-label">Como llegar</span>
            <h3>Cargando movilidad</h3>
            <p>Mostramos la base del centro primero y resolvemos el trayecto aparte.</p>
          </div>
          <div className="transport-v1-list transport-v1-list--board">
            <div className="transport-v1-row transport-v1-row--board transport-v1-row--loading">Cargando coche, EMT, BiciMAD y metro...</div>
            <div className="transport-v1-row transport-v1-row--board transport-v1-row--loading">Preparando el mapa de llegada...</div>
          </div>
        </section>
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

  if (!item) {
    return (
      <section className="detail-screen">
        <EmptyStateCard title="Centro no disponible" body="No hay payload consistente para este centro." />
      </section>
    );
  }

  const mapsUrl = formatMapsUrl(item);
  const scheduleRows = buildCompactSchedule(item.schedule.regular_rules);
  const reason = buildHumanReason(mobility);
  const transportRows = mobility ? buildFeaturedTransportRows(mobility) : [];
  const hasOriginEnrichedMobility = mobilityScope === "origin_enriched" && mobility !== null;
  const footerTiles = hasOriginEnrichedMobility ? buildFeaturedFooterTiles(mobility, {
    ser: item.ser,
      decision: {
        best_mode: mobility.summary.best_mode,
        best_time_minutes: mobility.summary.best_time_minutes,
        distance_m: null,
        confidence: mobility.summary.confidence,
        confidence_source: mobility.summary.confidence_source,
        rationale: mobility.summary.rationale,
        summary_label: null,
      },
  }) : [];

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
            <span className="detail-screen__eyebrow">
              {item.kind_label}
              {detailScope === "base_exploration" ? " / detalle base" : ""}
            </span>
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
              {hasOriginEnrichedMobility && mobility.summary.best_time_minutes !== null && mobility.summary.best_mode
                ? `${mobility.summary.best_time_minutes} min - ${modeLabel(mobility.summary.best_mode)} (${confidenceSourceLabel(mobility.summary.confidence_source)})`
                : mobilityLoading
                  ? "Resolviendo llegada desde tu origen"
                  : "Detalle base sin llegada contextual"}
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
          <span className="detail-screen__section-label">
            {getDetailMobilityScopeLabel(mobilityScope)}
          </span>
          <h3>
            {hasOriginEnrichedMobility && mobility.summary.best_mode
              ? `${mobility.summary.confidence_source === "realtime" ? "Llegada resuelta" : mobility.summary.confidence_source === "estimated" ? "Llegada estimada" : "Llegada orientativa"}: ${modeLabel(mobility.summary.best_mode)}`
              : "Movilidad"}
          </h3>
          <p>
            {hasOriginEnrichedMobility
              ? reason
              : "El detalle se carga en scope base y la llegada contextual se resuelve aparte cuando hay origen."}
          </p>
        </div>
        {!mobility && mobilityLoading ? (
          <div className="transport-v1-list transport-v1-list--board">
            <div className="transport-v1-row transport-v1-row--board transport-v1-row--loading">Calculando coche, EMT, BiciMAD y metro...</div>
            <div className="transport-v1-row transport-v1-row--board transport-v1-row--loading">Cargando anchors y tiempos del origen...</div>
          </div>
        ) : hasOriginEnrichedMobility ? (
          <div className="transport-v1-list transport-v1-list--board">
            {transportRows.map((row) => (
              <div key={row.mode} className={`transport-v1-row transport-v1-row--board${row.recommended ? " transport-v1-row--recommended" : ""}`}>
                <span className="transport-v1-row__label">
                  {row.mode === "metro" ? <TrainFront size={14} /> : row.mode === "bus" ? <Bus size={14} /> : <Bike size={14} />}
                  {row.label}
                </span>
                <div className="transport-v1-row__copy">
                  <strong className="transport-v1-row__headline">{row.headline}</strong>
                  {row.details.length > 0 ? (
                    <span className="transport-v1-row__detail-list">
                      {row.details.map((detail) => (
                        <span key={`${row.mode}-${detail.kind}-${detail.text}`} className={`transport-v1-row__detail transport-v1-row__detail--${detail.kind}`}>
                          {detail.kind === "origin" ? <MapPin size={11} /> : null}
                          {detail.kind === "destination" ? <Flag size={11} /> : null}
                          {detail.kind === "time" ? <Clock3 size={11} /> : null}
                          {detail.kind === "route" ? <RouteIcon size={11} /> : null}
                          {detail.kind === "availability" ? <Bike size={11} /> : null}
                          {detail.kind === "note" ? <Navigation size={11} /> : null}
                          {detail.text}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="transport-v1-row__body">
                      {buildDetailModeSummary(row.mode, mobility)}
                    </span>
                  )}
                  {buildModuleNote(row.mode, mobility) ? <span className="transport-v1-row__note">{buildModuleNote(row.mode, mobility)}</span> : null}
                </div>
                {row.eta ? <span className="transport-v1-row__eta">{row.eta}</span> : null}
              </div>
            ))}
            <div className="transport-v1-footer-grid">
              {footerTiles.map((tile) => (
                <div key={tile.mode} className={`transport-v1-footer-tile transport-v1-footer-tile--${tile.mode}`}>
                  <span className="transport-v1-footer-tile__label">
                    {tile.mode === "car" ? <Car size={13} /> : <Navigation size={13} />}
                    {tile.label}
                  </span>
                  <strong className="transport-v1-footer-tile__body">{tile.body}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="transport-v1-list transport-v1-list--board">
            <div className="transport-v1-row transport-v1-row--board transport-v1-row--loading">
              {mobilityError ?? "No se pudo cargar la movilidad de este centro."}
            </div>
          </div>
        )}
      </section>

      <section className="detail-screen__section">
        {mobility ? (
          <CenterMobilityMap center={item} mobility={mobility} ser={item.ser} origin={origin} />
        ) : (
          <div className="detail-screen__fallback">Calculando mapa de movilidad y anchors utiles...</div>
        )}
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
