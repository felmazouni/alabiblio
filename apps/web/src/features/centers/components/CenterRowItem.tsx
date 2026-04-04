import type { CenterDecisionCardItem } from "@alabiblio/contracts/centers";
import { Clock3, MapPin, Navigation } from "lucide-react";
import { buildSecondaryCardHighlights } from "../transportCopy";

type CenterRowItemProps = {
  center: CenterDecisionCardItem;
  onSelect: (slug: string) => void;
};

export function CenterRowItem({ center, onSelect }: CenterRowItemProps) {
  const highlights = buildSecondaryCardHighlights(center);

  return (
    <button type="button" className="center-row-item" onClick={() => onSelect(center.slug)}>
      <span
        className={`center-row-item__dot center-row-item__dot--${center.is_open_now ? "open" : "closed"}`}
      />
      <div className="center-row-item__info">
        <div className="center-row-item__name-row">
          <span className="center-row-item__name">{center.name}</span>
          <span className="center-row-item__kind">{center.kind_label}</span>
        </div>
        {(center.district || center.neighborhood) ? (
          <span className="center-row-item__area">
            <MapPin size={11} />
            {[center.district, center.neighborhood].filter(Boolean).join(" - ")}
          </span>
        ) : null}
      </div>
      <div className="center-row-item__schedule">
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
      <div className="center-row-item__eta">
        <span className="center-row-item__eta-value">{center.decision.summary_label ?? "Sin origen"}</span>
        {center.decision.distance_m !== null ? (
          <span className="center-row-item__dist">
            <Navigation size={11} />
            {center.decision.distance_m < 1000
              ? `${Math.round(center.decision.distance_m)} m`
              : `${(center.decision.distance_m / 1000).toFixed(1)} km`}
          </span>
        ) : null}
      </div>
      <div className="center-row-item__features">
        {highlights.slice(0, 2).map((highlight) => (
          <span key={`${center.id}-${highlight.label}-${highlight.body}`} className="center-row-item__highlight">
            {highlight.label} - {highlight.body}
          </span>
        ))}
      </div>
    </button>
  );
}
