import type {
  CenterMobility,
  CenterTopMobilityCardV1,
} from "@alabiblio/contracts/mobility";
import {
  ArrowRight,
  Bike,
  Bus,
  Car,
  Clock3,
  Flag,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Sparkles,
  TrainFront,
} from "lucide-react";
import SpotlightCard from "../../../components/reactbits/SpotlightCard";
import { buildTopMobilityCardPresentation } from "../cardPresentation";
import { confidenceSourceLabel } from "../transportCopy";

type TopMobilityCardProps = {
  center: CenterTopMobilityCardV1;
  mobility: CenterMobility;
  rank: number;
  serverOpenCount: number;
  onSelect: (slug: string) => void;
};

export function TopMobilityCard({
  center,
  mobility,
  rank,
  serverOpenCount,
  onSelect,
}: TopMobilityCardProps) {
  const presentation = buildTopMobilityCardPresentation({
    center,
    mobility,
    scope: "origin_enriched",
    serverOpenCount,
  });
  const area = [center.neighborhood, center.district].filter(Boolean).join(" - ");
  const locationLine = center.address_line ?? area;
  const secondaryLine = center.address_line && area ? area : null;
  const rankLabel = rank === 1 ? "1a opcion" : rank === 2 ? "2a opcion" : "3a opcion";

  return (
    <button
      type="button"
      className="best-option-card top-pick-card"
      onClick={() => onSelect(center.slug)}
    >
      <SpotlightCard className="best-option-card__surface top-pick-card__surface">
        <div className="best-option-card__eyebrow-row">
          <span className="best-option-card__eyebrow best-option-card__eyebrow--rank">
            <Sparkles size={11} />
            {rankLabel}
          </span>
          <span className="best-option-card__kind-badge">{center.kind_label}</span>
          <span className={center.is_open_now ? "decision-card__status decision-card__status--open" : "decision-card__status decision-card__status--closed"}>
            {center.is_open_now ? "Abierta" : "Cerrada"}
          </span>
        </div>

        <h2 className="best-option-card__name">{center.name}</h2>

        {locationLine ? (
          <p className="best-option-card__subline top-pick-card__location">
            <MapPin size={11} />
            {locationLine}
          </p>
        ) : null}

        {secondaryLine ? <p className="top-pick-card__secondary-line">{secondaryLine}</p> : null}
        <p className="top-pick-card__state-line">
          <strong>{presentation.frame.sectionTitle}</strong>
          <span>{presentation.frame.sectionSummary}</span>
        </p>

        <div className="best-option-card__board">
          {presentation.transportRows.map((row) => {
            const compactDetails = row.details
              .filter((detail) => detail.kind !== "note")
              .slice(0, row.recommended ? 2 : 1);

            return (
              <div
                key={`${center.id}-${row.mode}`}
                className={`best-option-card__board-row${row.recommended ? " best-option-card__board-row--recommended" : ""}`}
              >
                <span className="best-option-card__board-mode top-pick-card__board-mode">
                  <span className={`top-pick-card__mode-icon top-pick-card__mode-icon--${row.mode}`}>
                    {row.mode === "metro" ? <TrainFront size={14} /> : row.mode === "bus" ? <Bus size={14} /> : <Bike size={14} />}
                  </span>
                  <span className="top-pick-card__mode-label">{row.label}</span>
                </span>
                <span className="best-option-card__board-copy">
                  <span className="top-pick-card__board-header">
                    <strong className="best-option-card__board-headline">{row.headline}</strong>
                    <span className={`transport-confidence-chip transport-confidence-chip--${row.confidenceSource}`}>
                      {confidenceSourceLabel(row.confidenceSource)}
                    </span>
                  </span>
                  {compactDetails.length > 0 ? (
                    <span className="best-option-card__board-details">
                      {compactDetails.map((detail) => (
                        <span key={`${center.id}-${row.mode}-${detail.kind}-${detail.text}`} className={`best-option-card__board-detail best-option-card__board-detail--${detail.kind}`}>
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
                  ) : null}
                </span>
                <span className="best-option-card__board-eta">{row.eta}</span>
              </div>
            );
          })}
        </div>

        <div className="best-option-card__footer-grid">
          {presentation.footerTiles.map((tile) => (
            <div
              key={tile.mode}
              className={`best-option-card__footer-tile best-option-card__footer-tile--${tile.mode}`}
            >
              <span className="best-option-card__footer-label">
                {tile.mode === "car" ? <Car size={13} /> : <Navigation size={13} />}
                {tile.label}
              </span>
              <strong className="best-option-card__footer-body">{tile.body}</strong>
            </div>
          ))}
        </div>

        <p className="best-option-card__reason">{presentation.reason}</p>

        <div className="best-option-card__footer">
          <span className="best-option-card__cta">
            Ver detalle <ArrowRight size={13} />
          </span>
        </div>
      </SpotlightCard>
    </button>
  );
}
