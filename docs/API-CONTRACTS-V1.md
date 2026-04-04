# API CONTRACTS V1

Fecha: 2026-04-04

## Objetivo

Definir la frontera exacta entre listado, detalle y movilidad, evitando payloads ambiguos o solapados.

## 1. `GET /api/centers`

### Propósito

Payload de listado. Debe servir para:

- explorar
- ordenar
- comparar cards

No debe servir para renderizar el detalle completo.

### Query params

Requeridos:

- ninguno

Opcionales:

- `kind`
- `limit`
- `offset`
- `q`
- `open_now`
- `has_wifi`
- `has_sockets`
- `accessible`
- `open_air`
- `has_ser`
- `district`
- `neighborhood`
- `sort_by`
- `user_lat`
- `user_lon`

### Response shape V1

```ts
type ListCentersResponseV1 = {
  items: CenterListCardV1[];
  total: number;
  open_count: number;
  limit: number;
  offset: number;
  next_offset?: number | null;
};

type CenterListCardV1 = {
  id: string;
  slug: string;
  kind: "study_room" | "library";
  kind_label: string;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  is_open_now: boolean | null;
  opens_today: string | null;
  closes_today: string | null;
  today_human_schedule: string | null;
  capacity_value: number | null;
  ser: {
    enabled: boolean;
    zone_name: string | null;
  } | null;
  services: {
    wifi: boolean;
    sockets: boolean;
    accessible: boolean;
    open_air: boolean;
  };
  decision: {
    best_mode: "car" | "bus" | "bike" | "metro" | "walk" | null;
    best_time_minutes: number | null;
    confidence: "high" | "medium" | "low";
    rationale: string[];
    summary_label: string | null;
  };
  mobility_highlights: {
    primary: MobilityHighlightV1 | null;
    secondary: MobilityHighlightV1 | null;
  };
};
```

### Required fields

- identidad del centro
- estado operativo breve
- servicios mínimos de card
- `decision`
- hasta dos `mobility_highlights`

### Optional fields

- `ser`
- `capacity_value`
- `opens_today`
- `closes_today`

### Prohibiciones

- no incluir `feature_evidence`
- no incluir horario estructurado completo
- no incluir arrays completos de anchors
- no incluir realtime detallado de todos los modos

## 2. `GET /api/centers/:slug`

### Propósito

Payload base del detalle.

Debe devolver:

- identidad del centro
- horario
- contacto
- servicios
- anchors estáticos

No debe exigir realtime embebido.

### Query params

Requeridos:

- ninguno

Opcionales:
- ninguno

### Response shape V1

```ts
type GetCenterDetailResponseV1 = {
  item: CenterDetailBaseV1;
};

type CenterDetailBaseV1 = {
  id: string;
  slug: string;
  kind: "study_room" | "library";
  kind_label: string;
  name: string;
  district: string | null;
  neighborhood: string | null;
  address_line: string | null;
  postal_code: string | null;
  municipality: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  contact_summary: string | null;
  lat: number | null;
  lon: number | null;
  capacity_value: number | null;
  notes_raw: string | null;
  ser: {
    enabled: boolean;
    zone_name: string | null;
    coverage_method: string | null;
    distance_m: number | null;
  };
  services: CenterServicesV1;
  schedule: CenterSchedulePayloadV1;
  static_transport: StaticTransportAnchorsV1;
  data_freshness: {
    center_updated_at: string | null;
    mobility_static_updated_at: string | null;
  };
};
```

### Required fields

- centro base
- horario
- contacto
- `ser`
- `services`
- `static_transport`

### Optional fields

- `capacity_value`
- `notes_raw`

### Prohibiciones

- no incluir EMT realtime obligatorio
- no incluir BiciMAD realtime obligatorio
- no incluir ranking completo de modos

## 3. `GET /api/centers/:slug/mobility`

### Propósito

Endpoint de cálculo dependiente del origen y realtime.

### Query params

Requeridos:

- ninguno

Opcionales:

- `user_lat`
- `user_lon`
- en V1 no se añade `origin_kind`; se deriva del cliente si hace falta en cabecera o payload futuro

### Response shape V1

```ts
type GetCenterMobilityResponseV1 = {
  item: CenterMobilityRuntimeV1;
};

type CenterMobilityRuntimeV1 = {
  origin: {
    available: boolean;
    kind: "geolocation" | "manual_address" | "preset_area" | null;
    label: string | null;
    lat: number | null;
    lon: number | null;
  };
  summary: {
    best_mode: "car" | "bus" | "bike" | "metro" | "walk" | null;
    best_time_minutes: number | null;
    confidence: "high" | "medium" | "low";
    rationale: string[];
  };
  modules: {
    car: CarModuleV1;
    bus: BusModuleV1;
    bike: BikeModuleV1;
    metro: MetroModuleV1;
  };
  degraded_modes: Array<"car" | "bus" | "bike" | "metro">;
  fetched_at: string;
};
```

### Required fields

- `origin`
- `summary`
- `modules.car`
- `modules.bus`
- `modules.bike`
- `modules.metro`
- `degraded_modes`
- `fetched_at`

### Optional fields

- campos concretos dentro de cada módulo según anchor o realtime disponible

### Fallback states

#### Sin origen

- `origin.available = false`
- `summary.best_mode = null` o `walk`
- módulos con anchors destino, pero sin cálculo dependiente del origen

#### EMT upstream caído

- `bus.state = "degraded_upstream"`
- se mantienen:
  - parada origen
  - parada destino
  - línea candidata si existe

#### BiciMAD upstream caído

- `bike.state = "degraded_upstream"`
- se mantienen estaciones origen/destino
- `bikes_available` / `docks_available` pueden ser `null`

#### Centro sin anchor útil de un modo

- módulo concreto en `degraded_missing_anchor`
- no afecta al resto de modos

## Frontera exacta

### Listado

- resumen
- highlights
- sin payload ancho

### Detalle

- centro base
- horario
- static anchors
- sin realtime obligatorio

### Mobility

- origen
- realtime
- ranking
- degradación controlada
