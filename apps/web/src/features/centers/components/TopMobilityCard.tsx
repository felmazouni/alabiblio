import { useId, useState } from "react";
import type {
  BikeModuleV1,
  BusModuleV1,
  CenterMobility,
  CenterTopMobilityCardV1,
  MetroModuleV1,
  MobilityConfidence,
  MobilityConfidenceSource,
} from "@alabiblio/contracts/mobility";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Bus,
  Car,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Gauge,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  TrainFront,
} from "lucide-react";
import { buildTopMobilityCardPresentation } from "../cardPresentation";
import {
  confidenceSourceLabel,
  formatDistanceCompact,
  modeLabel,
} from "../transportCopy";
import "./TopMobilityCard.css";

type TopMobilityCardProps = {
  center: CenterTopMobilityCardV1;
  mobility: CenterMobility;
  rank: number;
  serverOpenCount: number;
  onSelect: (slug: string) => void;
};

type SignalMetric = {
  key: string;
  label: string;
  value: string;
  percent: number;
  icon: "best" | "bus" | "metro" | "bike" | "car" | "walk";
};

function getConfidencePercent(
  confidence: MobilityConfidence,
  source: MobilityConfidenceSource,
): number {
  const base =
    confidence === "high" ? 88 : confidence === "medium" ? 68 : 44;

  switch (source) {
    case "realtime":
      return Math.min(100, base + 8);
    case "estimated":
      return base;
    case "frequency":
      return Math.max(28, base - 8);
    case "heuristic":
      return Math.max(20, base - 16);
    case "fallback":
      return Math.max(16, base - 22);
  }
}

function getScheduleCopy(center: CenterTopMobilityCardV1): string {
  if (center.is_open_now && center.closes_today) {
    return `Abierta hasta ${center.closes_today}`;
  }
  if (center.is_open_now) {
    return center.today_human_schedule ?? "Abierta ahora";
  }
  if (center.opens_today) {
    return `Abre a las ${center.opens_today}`;
  }
  return center.today_human_schedule ?? "Horario por confirmar";
}

function buildSignalMetrics(
  center: CenterTopMobilityCardV1,
  mobility: CenterMobility,
): SignalMetric[] {
  return [
    {
      key: "best",
      label: "Mejor llegada",
      value:
        center.decision.best_time_minutes !== null && center.decision.best_mode
          ? `${center.decision.best_time_minutes} min`
          : "Sin ETA cerrada",
      percent: getConfidencePercent(
        center.decision.confidence,
        center.decision.confidence_source,
      ),
      icon: "best",
    },
    {
      key: "bus",
      label: "Bus",
      value:
        mobility.modules.bus.estimated_total_min !== null
          ? `${mobility.modules.bus.estimated_total_min} min`
          : "s/d",
      percent: getConfidencePercent("medium", mobility.modules.bus.confidence_source),
      icon: "bus",
    },
    {
      key: "metro",
      label: "Metro",
      value:
        mobility.modules.metro.eta_min !== null
          ? `${mobility.modules.metro.eta_min} min`
          : "s/d",
      percent: getConfidencePercent("medium", mobility.modules.metro.confidence_source),
      icon: "metro",
    },
    {
      key: "bike",
      label: "BiciMAD",
      value:
        mobility.modules.bike.eta_min !== null
          ? `${mobility.modules.bike.eta_min} min`
          : mobility.modules.bike.confidence_source === "realtime"
            ? "realtime"
            : "s/d",
      percent: getConfidencePercent("medium", mobility.modules.bike.confidence_source),
      icon: "bike",
    },
    {
      key: "car",
      label: "Coche",
      value:
        mobility.modules.car.eta_min !== null
          ? `${mobility.modules.car.eta_min} min`
          : "Sin ETA",
      percent: getConfidencePercent("medium", mobility.modules.car.confidence_source),
      icon: "car",
    },
    {
      key: "walk",
      label: "A pie",
      value:
        mobility.origin_dependent.walking_eta_min !== null
          ? `${mobility.origin_dependent.walking_eta_min} min`
          : "s/d",
      percent: 24,
      icon: "walk",
    },
  ];
}

function getDistanceLabel(center: CenterTopMobilityCardV1): string | null {
  return formatDistanceCompact(center.decision.distance_m);
}

function renderSignalIcon(icon: SignalMetric["icon"]) {
  switch (icon) {
    case "bus":
      return <Bus size={15} />;
    case "metro":
      return <TrainFront size={15} />;
    case "bike":
      return <Bike size={15} />;
    case "car":
      return <Car size={15} />;
    case "walk":
      return <Navigation size={15} />;
    default:
      return <Sparkles size={15} />;
  }
}

function getPrimarySummary(center: CenterTopMobilityCardV1): string {
  if (center.decision.best_time_minutes !== null && center.decision.best_mode) {
    return `${center.decision.best_time_minutes} min en ${modeLabel(center.decision.best_mode)}`;
  }

  return "Sin ETA cerrada";
}

function renderMetroSection(module: MetroModuleV1) {
  const origin = module.origin_station?.name ?? "Origen sin estacion clara";
  const destination =
    module.destination_station?.name ?? "Destino sin estacion clara";

  return (
    <div className="top-mobility-card__transport-row top-mobility-card__transport-row--metro">
      <div className="top-mobility-card__transport-icon">
        <TrainFront size={18} />
      </div>
      <div className="top-mobility-card__transport-copy">
        <div className="top-mobility-card__transport-headline">
          <strong>{origin}</strong>
          <ArrowRight size={14} />
          <strong>{destination}</strong>
        </div>
        <div className="top-mobility-card__transport-tags">
          {module.line_labels.length > 0 ? (
            module.line_labels.slice(0, 3).map((line) => (
              <span key={line} className="top-mobility-card__mini-tag">
                {line}
              </span>
            ))
          ) : (
            <span className="top-mobility-card__mini-tag">
              {confidenceSourceLabel(module.confidence_source)}
            </span>
          )}
        </div>
      </div>
      <div className="top-mobility-card__transport-eta">
        <strong>{module.eta_min !== null ? `${module.eta_min} min` : "s/d"}</strong>
        <span>trayecto</span>
      </div>
    </div>
  );
}

function renderBusSection(module: BusModuleV1) {
  return (
    <div className="top-mobility-card__transport-row top-mobility-card__transport-row--bus">
      <div className="top-mobility-card__transport-icon">
        <Bus size={18} />
      </div>
      <div className="top-mobility-card__transport-copy">
        <div className="top-mobility-card__transport-line">
          <strong>{module.selected_line ? `L${module.selected_line}` : "Bus"}</strong>
          <span
            className={`top-mobility-card__confidence-badge top-mobility-card__confidence-badge--${module.confidence_source}`}
          >
            {confidenceSourceLabel(module.confidence_source)}
          </span>
        </div>
        <div className="top-mobility-card__transport-points">
          <span>
            <span className="top-mobility-card__point top-mobility-card__point--origin" />
            Subida: {module.origin_stop?.name ?? "Parada sin confirmar"}
          </span>
          <span>
            <span className="top-mobility-card__point top-mobility-card__point--destination" />
            Bajada: {module.destination_stop?.name ?? module.selected_destination ?? "Destino sin parada clara"}
          </span>
        </div>
      </div>
      <div className="top-mobility-card__transport-eta top-mobility-card__transport-eta--bus">
        {module.next_arrival_min !== null ? (
          <span className="top-mobility-card__transport-wait">
            <Clock3 size={14} />
            {module.next_arrival_min} min espera
          </span>
        ) : null}
        <strong>
          {module.estimated_total_min !== null
            ? `${module.estimated_total_min} min`
            : "s/d"}
        </strong>
        <span>trayecto</span>
      </div>
    </div>
  );
}

function renderBikeStationCard(
  tone: "origin" | "destination",
  title: string,
  label: string,
  availability: string,
  distance: string | null,
) {
  return (
    <div className="top-mobility-card__station-card">
      <span className="top-mobility-card__station-label">
        <span
          className={`top-mobility-card__point top-mobility-card__point--${tone}`}
        />
        {title}
      </span>
      <strong>{label}</strong>
      <div className="top-mobility-card__station-meta">
        <span>{availability}</span>
        <span>{distance ?? "s/d"}</span>
      </div>
    </div>
  );
}

function renderBikeSection(module: BikeModuleV1) {
  const originLabel =
    module.origin_station?.station_number
      ? `Estacion ${module.origin_station.station_number}`
      : module.origin_station?.name ?? "Origen sin estacion";
  const destinationLabel =
    module.destination_station?.station_number
      ? `Estacion ${module.destination_station.station_number}`
      : module.destination_station?.name ?? "Destino sin estacion";

  return (
    <div className="top-mobility-card__transport-row top-mobility-card__transport-row--bike">
      <div className="top-mobility-card__transport-icon">
        <Bike size={18} />
      </div>
      <div className="top-mobility-card__transport-copy">
        <div className="top-mobility-card__transport-line">
          <strong>Red BiciMAD</strong>
          <span
            className={`top-mobility-card__confidence-badge top-mobility-card__confidence-badge--${module.confidence_source}`}
          >
            {confidenceSourceLabel(module.confidence_source)}
          </span>
        </div>
        <div className="top-mobility-card__station-grid">
          {renderBikeStationCard(
            "origin",
            "Origen",
            originLabel,
            module.bikes_available !== null
              ? `${module.bikes_available} bicis`
              : "Stock sin confirmar",
            module.origin_station
              ? formatDistanceCompact(module.origin_station.distance_m)
              : null,
          )}
          {renderBikeStationCard(
            "destination",
            "Destino",
            destinationLabel,
            module.docks_available !== null
              ? `${module.docks_available} anclajes`
              : "Anclajes sin confirmar",
            module.destination_station
              ? formatDistanceCompact(module.destination_station.distance_m)
              : null,
          )}
        </div>
      </div>
      <div className="top-mobility-card__transport-eta">
        <strong>{module.eta_min !== null ? `${module.eta_min} min` : "s/d"}</strong>
        <span>trayecto</span>
      </div>
    </div>
  );
}

function renderCarSection(
  center: CenterTopMobilityCardV1,
  mobility: CenterMobility,
) {
  const car = mobility.modules.car;
  const distance = formatDistanceCompact(
    car.distance_m ?? center.decision.distance_m,
  );
  const serZone = car.ser_zone_name
    ? `Zona SER ${car.ser_zone_name}`
    : center.ser?.zone_name
      ? `Zona SER ${center.ser.zone_name}`
      : null;

  return (
    <div className="top-mobility-card__transport-row top-mobility-card__transport-row--car">
      <div className="top-mobility-card__transport-icon">
        <Car size={18} />
      </div>
      <div className="top-mobility-card__transport-copy">
        <div className="top-mobility-card__transport-line">
          <strong>En coche</strong>
        </div>
        <div className="top-mobility-card__transport-meta">
          {[distance, serZone].filter(Boolean).join(" | ") || "Sin contexto adicional"}
        </div>
      </div>
      <div className="top-mobility-card__transport-eta">
        <strong>{car.eta_min !== null ? `${car.eta_min} min` : "s/d"}</strong>
        <span>trayecto</span>
      </div>
    </div>
  );
}

export function TopMobilityCard({
  center,
  mobility,
  rank,
  serverOpenCount,
  onSelect,
}: TopMobilityCardProps) {
  const accordionId = useId();
  const [expanded, setExpanded] = useState(rank === 1);
  const presentation = buildTopMobilityCardPresentation({
    center,
    mobility,
    scope: "origin_enriched",
    serverOpenCount,
  });
  const area = [center.neighborhood, center.district].filter(Boolean).join(" - ");
  const address = center.address_line ?? area;
  const distanceLabel = getDistanceLabel(center);
  const confidencePercent = getConfidencePercent(
    center.decision.confidence,
    center.decision.confidence_source,
  );
  const signalMetrics = buildSignalMetrics(center, mobility);
  const bestSourceLabel = confidenceSourceLabel(center.decision.confidence_source);
  const summaryTitle = center.decision.best_mode
    ? `Llegada ${modeLabel(center.decision.best_mode)}`
    : "Mejor llegada";

  return (
    <article className="top-mobility-card">
      <header className="top-mobility-card__header">
        <div className="top-mobility-card__rank">{rank}</div>

        <div className="top-mobility-card__header-copy">
          <div className="top-mobility-card__chips">
            <span className="top-mobility-card__chip top-mobility-card__chip--kind">
              {center.kind_label}
            </span>
            <span
              className={`top-mobility-card__chip ${
                center.is_open_now
                  ? "top-mobility-card__chip--open"
                  : "top-mobility-card__chip--closed"
              }`}
            >
              {center.is_open_now ? "Abierta" : "Cerrada"}
            </span>
          </div>

          <h3 className="top-mobility-card__title">{center.name}</h3>

          {address ? (
            <p className="top-mobility-card__address-line">
              <MapPin size={15} />
              <span>{address}</span>
              {distanceLabel ? (
                <>
                  <span className="top-mobility-card__separator">|</span>
                  <strong>{distanceLabel}</strong>
                </>
              ) : null}
            </p>
          ) : null}

          {area && center.address_line ? (
            <p className="top-mobility-card__area-line">{area}</p>
          ) : null}
        </div>
      </header>

      <section className="top-mobility-card__summary-panel">
        <div className="top-mobility-card__summary-row">
          <span className="top-mobility-card__summary-label">
            <Clock3 size={15} />
            Horario
          </span>
          <strong>{getScheduleCopy(center)}</strong>
        </div>

        <div className="top-mobility-card__summary-row top-mobility-card__summary-row--bar">
          <span className="top-mobility-card__summary-label">
            <Gauge size={15} />
            Confianza de movilidad
          </span>
          <div className="top-mobility-card__confidence-bar" aria-hidden="true">
            <span
              className="top-mobility-card__confidence-bar-fill"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <strong className="top-mobility-card__summary-value">
            {confidencePercent}/100
          </strong>
        </div>
      </section>

      <section className="top-mobility-card__metrics">
        <div className="top-mobility-card__metrics-head">
          <div className="top-mobility-card__metrics-summary">
            <div className="top-mobility-card__metrics-stars" aria-hidden="true">
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <Star size={15} fill="currentColor" />
              <Star size={15} />
            </div>
            <strong>{summaryTitle}</strong>
            <span>{getPrimarySummary(center)}</span>
          </div>
          <span className="top-mobility-card__review-chip">{bestSourceLabel}</span>
        </div>

        <div className="top-mobility-card__signals-grid">
          {signalMetrics.map((metric) => (
            <div key={metric.key} className="top-mobility-card__signal">
              <span className="top-mobility-card__signal-copy">
                {renderSignalIcon(metric.icon)}
                <span>{metric.label}</span>
              </span>
              <div className="top-mobility-card__signal-bar" aria-hidden="true">
                <span
                  className="top-mobility-card__signal-bar-fill"
                  style={{ width: `${metric.percent}%` }}
                />
              </div>
              <span className="top-mobility-card__signal-value">{metric.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="top-mobility-card__notice">
        <AlertTriangle size={16} />
        <p>{presentation.reason}</p>
      </section>

      <section className="top-mobility-card__accordion">
        <button
          type="button"
          className="top-mobility-card__accordion-toggle"
          aria-expanded={expanded}
          aria-controls={accordionId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="top-mobility-card__accordion-title">
            Como llegar <span>(4 opciones)</span>
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded ? (
          <div id={accordionId} className="top-mobility-card__transport-list">
            {renderMetroSection(mobility.modules.metro)}
            {renderBusSection(mobility.modules.bus)}
            {renderBikeSection(mobility.modules.bike)}
            {renderCarSection(center, mobility)}
          </div>
        ) : null}
      </section>

      <div className="top-mobility-card__actions">
        <button
          type="button"
          className="top-mobility-card__action top-mobility-card__action--secondary"
          onClick={() => onSelect(center.slug)}
        >
          <ExternalLink size={16} />
          Ver detalles
        </button>
        <button
          type="button"
          className="top-mobility-card__action top-mobility-card__action--primary"
          onClick={() => onSelect(center.slug)}
        >
          <Navigation size={16} />
          Ir ahora
        </button>
      </div>
    </article>
  );
}
