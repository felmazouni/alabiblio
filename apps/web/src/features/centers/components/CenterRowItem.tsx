import type {
  CenterListBaseItemV1,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import {
  ArrowRight,
  Accessibility,
  Clock3,
  MapPin,
  Navigation,
  Plug,
  Shield,
  Wifi,
} from "lucide-react";
import { buildBaseCardPresentation } from "../cardPresentation";

type CenterRowItemProps = {
  center: CenterListBaseItemV1;
  scope: ListCentersResponse["meta"]["scope"];
  onSelect: (slug: string) => void;
};

function getHighlightIcon(label: string) {
  switch (label) {
    case "SER":
      return <Shield size={12} />;
    default:
      return <Navigation size={12} />;
  }
}

export function CenterRowItem({ center, scope, onSelect }: CenterRowItemProps) {
  const presentation = buildBaseCardPresentation(center, scope);
  const area = [center.neighborhood, center.district].filter(Boolean).join(" - ");
  const locationLine = center.address_line ?? area;
  const secondaryArea = center.address_line && area ? area : null;
  const servicePills = [
    center.services.wifi ? { key: "wifi", label: "WiFi", icon: <Wifi size={11} /> } : null,
    center.services.accessible ? { key: "accessible", label: "Accesible", icon: <Accessibility size={11} /> } : null,
    center.services.sockets ? { key: "sockets", label: "Enchufes", icon: <Plug size={11} /> } : null,
  ].filter((value): value is NonNullable<typeof value> => value !== null).slice(0, 2);

  return (
    <article className="center-row-item center-row-item--catalog">
      <div className="center-row-item__left">
        <div className="center-row-item__name-row">
          <span
            className={`center-row-item__dot center-row-item__dot--${center.is_open_now ? "open" : "closed"}`}
          />
          <span className="center-row-item__name">{center.name}</span>
          <span className="center-row-item__kind">{center.kind_label}</span>
        </div>

        {locationLine ? (
          <span className="center-row-item__area">
            <MapPin size={11} />
            {locationLine}
          </span>
        ) : null}

        {secondaryArea ? <span className="center-row-item__subarea">{secondaryArea}</span> : null}

        <div className="center-row-item__meta">
          <span className={center.is_open_now ? "center-row-item__open" : "center-row-item__closed"}>
            {center.is_open_now ? "Abierta" : "Cerrada"}
          </span>
          {center.today_human_schedule ? (
            <span className="center-row-item__hours">
              <Clock3 size={11} />
              {center.today_human_schedule}
            </span>
          ) : null}
          {servicePills.map((service) => (
            <span key={service.key} className="center-row-item__service">
              {service.icon}
              {service.label}
            </span>
          ))}
        </div>
      </div>

      <div className="center-row-item__middle">
        {presentation.highlightRows.slice(0, 3).map((highlight) => (
          <div key={`${center.id}-${highlight.label}-${highlight.body}`} className="center-row-item__transport">
            <span className="center-row-item__transport-label">
              {getHighlightIcon(highlight.label)}
              {highlight.label}
            </span>
            <span className="center-row-item__transport-body">{highlight.body}</span>
          </div>
        ))}
      </div>

      <div className="center-row-item__right">
        <span className="center-row-item__eta-value">{presentation.footerLabel}</span>
        {center.ser?.enabled ? (
          <span className="center-row-item__dist">
            <Navigation size={11} />
            {center.ser.zone_name ? `SER ${center.ser.zone_name}` : "Zona SER"}
          </span>
        ) : null}
        <button type="button" className="center-row-item__cta" onClick={() => onSelect(center.slug)}>
          Ver detalle
          <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );
}
