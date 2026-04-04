import type { CenterDecisionCardItem } from "@alabiblio/contracts/centers";
import type { CenterMobility } from "@alabiblio/contracts/mobility";
import { Accessibility, Bike, Bus, Clock3, MapPin, Navigation, Plug, TrainFront, Trees, Users, Wifi, Zap } from "lucide-react";
import SpotlightCard from "../../../components/reactbits/SpotlightCard";
import { buildFeaturedTransportRows, buildSecondaryCardHighlights } from "../transportCopy";
import "./CenterCard.css";

type CenterCardProps = {
  center: CenterDecisionCardItem;
  mobility: CenterMobility | null;
  mobilityLoading: boolean;
  canLoadMobility: boolean;
  onLoadMobility: () => void;
  onSelect: (slug: string) => void;
};

function buildArea(center: CenterDecisionCardItem): string {
  return [center.district, center.neighborhood].filter(Boolean).join(" - ");
}

function buildNextChange(center: CenterDecisionCardItem): string | null {
  if (center.is_open_now) return center.closes_today ? `Cierra ${center.closes_today}` : null;
  return center.opens_today ? `Abre ${center.opens_today}` : null;
}

function serviceItems(center: CenterDecisionCardItem) {
  return [
    center.services.wifi ? { key: "wifi", label: "WiFi", icon: <Wifi size={14} /> } : null,
    center.services.accessible ? { key: "accessible", label: "Accesible", icon: <Accessibility size={14} /> } : null,
    center.services.sockets ? { key: "sockets", label: "Enchufes", icon: <Plug size={14} /> } : null,
    center.services.open_air ? { key: "open-air", label: "Aire libre", icon: <Trees size={14} /> } : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null);
}

export function CenterCard({
  center,
  mobility,
  mobilityLoading,
  canLoadMobility,
  onLoadMobility,
  onSelect,
}: CenterCardProps) {
  const area = buildArea(center);
  const nextChange = buildNextChange(center);
  const services = serviceItems(center).slice(0, 4);
  const highlightRows = buildSecondaryCardHighlights(center);
  const transportRows = mobility ? buildFeaturedTransportRows(mobility) : [];
  const showExpandedTransport = mobility !== null;

  return (
    <div className="decision-card">
      <button type="button" className="decision-card__main" onClick={() => onSelect(center.slug)}>
        <SpotlightCard className="decision-card__surface">
          <div className="decision-card__header">
            <span className="decision-card__kind">{center.kind_label}</span>
            <span
              className={
                center.is_open_now
                  ? "decision-card__status decision-card__status--open"
                  : "decision-card__status decision-card__status--closed"
              }
            >
              {center.is_open_now ? "Abierta" : "Cerrada"}
            </span>
          </div>

          <h2 className="decision-card__name">{center.name}</h2>

          {area ? (
            <div className="decision-card__zone">
              <MapPin size={12} />
              <span>{area}</span>
            </div>
          ) : null}

          <p className="decision-card__schedule">
            <Clock3 size={12} />
            <span>{center.today_human_schedule ?? "Sin horario"}</span>
            {nextChange ? <span className="decision-card__next-change">- {nextChange}</span> : null}
            {center.capacity_value !== null ? (
              <>
                <Users size={12} />
                <span>{center.capacity_value}</span>
              </>
            ) : null}
          </p>

          {services.length > 0 ? (
            <div className="decision-card__support-row">
              {services.map((service) => (
                <span key={service.key} className="decision-card__service-pill">
                  {service.icon}
                  {service.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className={`decision-card__board${showExpandedTransport ? " decision-card__board--expanded" : ""}`}>
            {showExpandedTransport ? transportRows.map((row) => (
              <div key={`${center.id}-${row.mode}`} className="decision-card__board-row">
                <span className="decision-card__board-label">
                  {row.mode === "metro"
                    ? <TrainFront size={13} />
                    : row.mode === "bus"
                      ? <Bus size={13} />
                      : <Bike size={13} />}
                  {row.label}
                </span>
                <span className="decision-card__board-body">{row.body}</span>
                {row.eta ? <span className="decision-card__board-eta">{row.eta}</span> : null}
              </div>
            )) : highlightRows.length > 0 ? highlightRows.map((line) => (
              <div key={`${center.id}-${line.label}-${line.body}`} className="decision-card__board-row">
                <span className="decision-card__board-label">{line.label}</span>
                <span className="decision-card__board-body">{line.body}</span>
              </div>
            )) : (
              <div className="decision-card__board-row decision-card__board-row--fallback">
                <span className="decision-card__board-label">LLEGADA</span>
                <span className="decision-card__board-body">
                  {center.decision.summary_label ?? "Sin origen suficiente"}
                </span>
              </div>
            )}
          </div>

          {center.decision.distance_m !== null ? (
            <div className="decision-card__footer">
              <Navigation size={12} />
              <span>
                {center.decision.distance_m < 1000
                  ? `${Math.round(center.decision.distance_m)} m`
                  : `${(center.decision.distance_m / 1000).toFixed(1)} km`}
              </span>
            </div>
          ) : null}
        </SpotlightCard>
      </button>

      {!showExpandedTransport && canLoadMobility ? (
        <button
          type="button"
          className="decision-card__mobility-action"
          onClick={onLoadMobility}
          disabled={mobilityLoading}
        >
          <Zap size={14} />
          {mobilityLoading ? "Calculando transporte..." : "Ver transporte"}
        </button>
      ) : null}
    </div>
  );
}
