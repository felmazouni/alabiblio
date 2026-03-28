import type {
  CenterKind,
  CenterListItem,
  CenterRecord,
} from "../../contracts/src/centers";

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

export function toCenterListItem(center: CenterRecord): CenterListItem {
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
    capacity_text: center.capacity_text,
    wifi_flag: center.wifi_flag,
    sockets_flag: center.sockets_flag,
    accessibility_flag: center.accessibility_flag,
    open_air_flag: center.open_air_flag,
  };
}
