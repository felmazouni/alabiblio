import type {
  CenterDetailDecisionItem,
  CenterKind,
  CenterListBaseItemV1,
  CenterRecord,
  CenterSerInfo,
  CenterSourceSummary,
  CenterDecisionSummary,
  CenterSchedulePayload,
  CenterServicesV1,
} from "@alabiblio/contracts/centers";
import type { CenterFeature } from "@alabiblio/contracts/features";
import type {
  CenterTopMobilityCardV1,
  StaticTransportAnchorsV1,
} from "@alabiblio/contracts/mobility";

const KIND_LABELS: Record<CenterKind, string> = {
  study_room: "Sala de estudio",
  library: "Biblioteca",
};

export function getCenterKindLabel(kind: CenterKind): string {
  return KIND_LABELS[kind];
}

export function getScheduleConfidenceLabel(
  confidence: number | null,
): "high" | "medium" | "low" {
  if (confidence !== null && confidence >= 0.75) {
    return "high";
  }

  if (confidence !== null && confidence >= 0.4) {
    return "medium";
  }

  return "low";
}

export function buildContactSummary(
  center: Pick<CenterRecord, "phone" | "email" | "website_url">,
): string | null {
  const parts = [
    center.phone,
    center.email,
    center.website_url ? "Web oficial" : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}

export function formatDataFreshness(sourceLastUpdated: string | null): string | null {
  if (!sourceLastUpdated) {
    return null;
  }

  const parsed = new Date(sourceLastUpdated);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(parsed);
}

export function slugifyCenterName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildCenterServices(center: Pick<
  CenterRecord,
  "wifi_flag" | "sockets_flag" | "accessibility_flag" | "open_air_flag"
>): CenterServicesV1 {
  return {
    wifi: center.wifi_flag,
    sockets: center.sockets_flag,
    accessible: center.accessibility_flag,
    open_air: center.open_air_flag,
  };
}

export function toCenterListBaseItem(input: {
  center: CenterRecord;
  schedule: CenterSchedulePayload;
  ser: { enabled: boolean; zone_name: string | null } | null;
}): CenterListBaseItemV1 {
  const { center, schedule, ser } = input;

  return {
    id: center.id,
    slug: center.slug,
    kind: center.kind,
    kind_label: getCenterKindLabel(center.kind),
    name: center.name,
    district: center.district,
    neighborhood: center.neighborhood,
    address_line: center.address_line,
    capacity_value: center.capacity_value,
    ser,
    services: buildCenterServices(center),
    is_open_now: schedule.is_open_now,
    next_change_at: schedule.next_change_at,
    today_human_schedule: schedule.today_human_schedule,
    schedule_confidence: schedule.schedule_confidence,
    schedule_confidence_label: getScheduleConfidenceLabel(
      schedule.schedule_confidence,
    ),
    opens_today: schedule.opens_today,
    closes_today: schedule.closes_today,
  };
}

export function toCenterTopMobilityCardItem(input: {
  center: CenterRecord;
  schedule: CenterSchedulePayload;
  ser: { enabled: boolean; zone_name: string | null } | null;
  decision: CenterDecisionSummary;
}): CenterTopMobilityCardV1 {
  const { center, schedule, ser, decision } = input;

  return {
    id: center.id,
    slug: center.slug,
    kind: center.kind,
    kind_label: getCenterKindLabel(center.kind),
    name: center.name,
    district: center.district,
    neighborhood: center.neighborhood,
    address_line: center.address_line,
    is_open_now: schedule.is_open_now,
    opens_today: schedule.opens_today,
    closes_today: schedule.closes_today,
    today_human_schedule: schedule.today_human_schedule,
    decision,
    ser,
  };
}

export function toCenterDetailDecisionItem(input: {
  center: CenterRecord;
  schedule: CenterSchedulePayload;
  sources: CenterSourceSummary[];
  sourceLastUpdated: string | null;
  ser: CenterSerInfo;
  staticTransport: StaticTransportAnchorsV1;
  features: CenterFeature[];
}): CenterDetailDecisionItem {
  const {
    center,
    schedule,
    sources,
    sourceLastUpdated,
    ser,
    staticTransport,
    features,
  } = input;

  return {
    id: center.id,
    slug: center.slug,
    kind: center.kind,
    kind_label: getCenterKindLabel(center.kind),
    name: center.name,
    district: center.district,
    neighborhood: center.neighborhood,
    address_line: center.address_line,
    postal_code: center.postal_code,
    municipality: center.municipality,
    phone: center.phone,
    email: center.email,
    website_url: center.website_url,
    contact_summary: buildContactSummary(center),
    lat: center.lat,
    lon: center.lon,
    coord_status: center.coord_status,
    capacity_value: center.capacity_value,
    notes_raw: center.notes_raw,
    ser,
    services: buildCenterServices(center),
    schedule,
    static_transport: staticTransport,
    features,
    data_freshness: {
      center_updated_at: formatDataFreshness(sourceLastUpdated),
      mobility_static_updated_at: formatDataFreshness(sourceLastUpdated),
    },
    sources,
  };
}
