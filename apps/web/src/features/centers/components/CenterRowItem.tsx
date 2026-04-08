import type {
  CenterListBaseItemV1,
  ListCentersResponse,
} from "@alabiblio/contracts/centers";
import {
  ArrowRight,
  Clock3,
  MapPin,
  Navigation,
  Shield,
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

  return (
    <article className="center-row-item">
      <div className="center-row-item__left">
        <div className="center-row-item__name-row">
          <span
            className={`center-row-item__dot center-row-item__dot--${center.is_open_now ? "open" : "closed"}`}
          />
          <span className="center-row-item__name">{center.name}</span>
          <span className="center-row-item__kind">{center.kind_label}</span>
        </div>

        {area ? (
          <span className="center-row-item__area">
            <MapPin size={11} />
            {area}
          </span>
        ) : null}

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
