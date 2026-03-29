import type {
  CenterDetailItem,
  CenterKind,
  CenterListItem,
  CenterRecord,
  CenterSchedulePayload,
  CenterSourceSummary,
} from "@alabiblio/contracts/centers";

const KIND_LABELS: Record<CenterKind, string> = {
  study_room: "Sala de estudio",
  library: "Biblioteca",
};

export function getCenterKindLabel(kind: CenterKind): string {
  return KIND_LABELS[kind];
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

export function toCenterListItem(
  center: CenterRecord,
  schedule: CenterSchedulePayload,
): CenterListItem {
  return {
    id: center.id,
    slug: center.slug,
    kind: center.kind,
    kind_label: getCenterKindLabel(center.kind),
    name: center.name,
    district: center.district,
    neighborhood: center.neighborhood,
    address_line: center.address_line,
    phone: center.phone,
    email: center.email,
    website_url: center.website_url,
    lat: center.lat,
    lon: center.lon,
    coord_status: center.coord_status,
    capacity_text: center.capacity_text,
    wifi_flag: center.wifi_flag,
    sockets_flag: center.sockets_flag,
    accessibility_flag: center.accessibility_flag,
    open_air_flag: center.open_air_flag,
    is_open_now: schedule.is_open_now,
    next_change_at: schedule.next_change_at,
    today_human_schedule: schedule.today_human_schedule,
    schedule_confidence: schedule.schedule_confidence,
    opens_today: schedule.opens_today,
    closes_today: schedule.closes_today,
  };
}

export function toCenterDetailItem(
  center: CenterRecord,
  schedule: CenterSchedulePayload,
  sources: CenterSourceSummary[],
): CenterDetailItem {
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
    lat: center.lat,
    lon: center.lon,
    coord_status: center.coord_status,
    capacity_value: center.capacity_value,
    capacity_text: center.capacity_text,
    wifi_flag: center.wifi_flag,
    sockets_flag: center.sockets_flag,
    accessibility_flag: center.accessibility_flag,
    open_air_flag: center.open_air_flag,
    notes_raw: center.notes_raw,
    sources,
    schedule,
  };
}
