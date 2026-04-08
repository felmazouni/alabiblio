# API CONTRACTS V1

Fecha: 2026-04-08

## Objetivo

Definir la frontera exacta entre listado, detalle y movilidad, evitando payloads ambiguos o solapados.

## 0. Semantic scopes V1

Estado:

- definido formalmente en Lote 1A
- enforcement runtime pendiente de Lote 1B

### `base_exploration`

Uso:

- explorar catalogo
- filtrar
- ordenar por estado operativo base
- abrir detalle base

Campos semanticamente permitidos:

- identidad del centro
- horario resumido
- servicios
- detalle base
- `open_now`

Campos semanticamente prohibidos:

- `recommended`
- `arrival`
- `distance`

Regla:

- este scope no puede vender decision contextual ni ranking dependiente del origen

### `origin_enriched`

Uso:

- ranking contextual
- top por movilidad
- comparacion real entre modos
- decision de llegada

Campos semanticamente permitidos:

- `recommended`
- `arrival`
- `distance`
- `open_now`

Regla:

- este scope solo es valido si el mismo request resuelve origen y contexto suficiente para sostener la decision

### Semantica exacta de campos

- `recommended`: recomendacion contextual de modo o llegada. Solo existe en `origin_enriched`.
- `arrival`: tiempo estimado contextual hasta el centro desde el origen activo. Solo existe en `origin_enriched`.
- `distance`: distancia directa centro-origen con origen resuelto dentro del mismo request. Solo existe en `origin_enriched`.
- `open_now`: estado operativo derivado del horario del centro. Puede existir en ambos scopes.

### Endpoint -> scope

- `GET /api/centers` -> `base_exploration`
- `GET /api/centers/top-mobility` -> `origin_enriched`
- `GET /api/centers/:slug` -> `base_exploration`
- `GET /api/centers/:slug/mobility` -> `origin_enriched`

## 1. `GET /api/centers`

### Scope

`base_exploration`

### Proposito

Payload de listado para:

- explorar
- filtrar
- comparar cards

No debe servir para:

- prometer una mejor opcion contextual
- prometer ETA contextual
- renderizar detalle completo

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

Nota semantica:

- en V1 el endpoint puede recibir origen por compatibilidad
- tras Lote 1B eso no le convierte en `origin_enriched`

## 2. `GET /api/centers/top-mobility`

### Scope

`origin_enriched`

### Proposito

Payload de ranking contextual para:

- resolver top por llegada
- comparar modos con origen real
- exponer una recomendacion semantica fuerte

No debe servir para:

- actuar como listado paginado general

## 3. `GET /api/centers/:slug`

### Scope

`base_exploration`

### Proposito

Payload base del detalle. Debe devolver:

- identidad del centro
- horario
- contacto
- servicios
- anchors estaticos

No debe exigir:

- realtime embebido
- decision contextual fuerte

## 4. `GET /api/centers/:slug/mobility`

### Scope

`origin_enriched`

### Proposito

Endpoint de calculo dependiente del origen y del contexto de movilidad.

### Query params

Requeridos:

- ninguno

Opcionales:

- `user_lat`
- `user_lon`

## Frontera exacta

### Base exploration

- exploracion
- filtros
- estado operativo
- detalle base

### Origin enriched

- recomendacion contextual
- ETA contextual
- distancia contextual
- degradacion controlada por upstream o anchors
