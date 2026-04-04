import type { CenterDecisionCardItem } from "@alabiblio/contracts/centers";
import { Accessibility, Clock3, MapPin, Navigation, Plug, Trees, Users, Wifi } from "lucide-react";
import SpotlightCard from "../../../components/reactbits/SpotlightCard";
import { humanizeHighlightLabel } from "../transportCopy";
import "./CenterCard.css";

type CenterCardProps = {
  center: CenterDecisionCardItem;
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

function highlightModeLabel(mode: NonNullable<CenterDecisionCardItem["mobility_highlights"]["primary"]>["mode"]): string {
  switch (mode) {
    case "walk": return "A pie";
    case "car": return "Coche";
    case "bus": return "EMT";
    case "bike": return "BiciMAD";
    case "metro": return "Metro";
    default: return "Llegada";
  }
}

export function CenterCard({ center, onSelect }: CenterCardProps) {
  const area = buildArea(center);
  const nextChange = buildNextChange(center);
  const services = serviceItems(center).slice(0, 4);
  const highlights = [center.mobility_highlights.primary, center.mobility_highlights.secondary].filter(Boolean);

  return (
    <button type="button" className="decision-card" onClick={() => onSelect(center.slug)}>
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

        <div className="decision-card__highlights">
          {highlights.length > 0 ? highlights.map((highlight) => (
            <div key={`${center.id}-${highlight!.mode}-${highlight!.label}`} className="decision-card__highlight">
              <span className="decision-card__highlight-mode">{highlightModeLabel(highlight!.mode)}</span>
              <span className="decision-card__highlight-label">{humanizeHighlightLabel(highlight!.label)}</span>
            </div>
          )) : (
            <div className="decision-card__highlight decision-card__highlight--fallback">
              <span className="decision-card__highlight-mode">Llegada</span>
              <span className="decision-card__highlight-label">
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
  );
}
