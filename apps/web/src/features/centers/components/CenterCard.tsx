import type {
  CenterListBaseItemV1,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import {
  Accessibility,
  ArrowRight,
  Clock3,
  MapPin,
  Navigation,
  Plug,
  Trees,
  Users,
  Wifi,
} from "lucide-react";
import SpotlightCard from "../../../components/reactbits/SpotlightCard";
import { buildBaseCardPresentation } from "../cardPresentation";
import "./CenterCard.css";

type CenterCardProps = {
  center: CenterListBaseItemV1;
  scope: ListCentersResponse["meta"]["scope"];
  onSelect: (slug: string) => void;
};

function buildArea(center: CenterListBaseItemV1): string {
  return [center.district, center.neighborhood].filter(Boolean).join(" - ");
}

function buildNextChange(center: CenterListBaseItemV1): string | null {
  if (center.is_open_now) return center.closes_today ? `Cierra ${center.closes_today}` : null;
  return center.opens_today ? `Abre ${center.opens_today}` : null;
}

function serviceItems(center: CenterListBaseItemV1) {
  return [
    center.services.wifi ? { key: "wifi", label: "WiFi", icon: <Wifi size={14} /> } : null,
    center.services.accessible ? { key: "accessible", label: "Accesible", icon: <Accessibility size={14} /> } : null,
    center.services.sockets ? { key: "sockets", label: "Enchufes", icon: <Plug size={14} /> } : null,
    center.services.open_air ? { key: "open-air", label: "Aire libre", icon: <Trees size={14} /> } : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null);
}

export function CenterCard({
  center,
  scope,
  onSelect,
}: CenterCardProps) {
  const area = buildArea(center);
  const locationLine = center.address_line ?? area;
  const secondaryArea = center.address_line && area ? area : null;
  const nextChange = buildNextChange(center);
  const services = serviceItems(center).slice(0, 2);
  const presentation = buildBaseCardPresentation(center, scope);

  return (
    <article className="decision-card decision-card--catalog">
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

          {locationLine ? (
            <div className="decision-card__zone">
              <MapPin size={12} />
              <span>{locationLine}</span>
            </div>
          ) : null}

          {secondaryArea ? (
            <p className="decision-card__catalog-area">{secondaryArea}</p>
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

          <div className="decision-card__catalog-highlights">
            {presentation.highlightRows.length > 0 ? presentation.highlightRows.map((line) => (
              <div key={`${center.id}-${line.label}-${line.body}`} className="decision-card__catalog-highlight">
                <span className="decision-card__catalog-highlight-label">{line.label}</span>
                <span className="decision-card__catalog-highlight-body">{line.body}</span>
              </div>
            )) : (
              <div className="decision-card__catalog-highlight decision-card__catalog-highlight--muted">
                <span className="decision-card__catalog-highlight-label">BASE</span>
                <span className="decision-card__catalog-highlight-body">{presentation.fallbackCopy}</span>
              </div>
            )}
          </div>

          <div className="decision-card__footer decision-card__footer--catalog">
            <span className="decision-card__footer-tag">
              <Navigation size={12} />
              {presentation.footerLabel}
            </span>
            <span className="decision-card__footer-link">
              Ver detalle
              <ArrowRight size={13} />
            </span>
          </div>
        </SpotlightCard>
      </button>
    </article>
  );
}
