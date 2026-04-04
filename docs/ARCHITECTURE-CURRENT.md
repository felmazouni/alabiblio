# ARCHITECTURE CURRENT

Fecha: 2026-04-04

## 1. Vista general

Arquitectura actual:

- SPA React/Vite en `apps/web/src`
- Worker Cloudflare en `apps/web/worker`
- D1 como almacenamiento principal
- pipelines batch para centros, movilidad, SER y callejero

Flujo principal:

1. fuentes externas -> pipelines -> SQL
2. SQL -> D1
3. Worker -> D1 -> payload API
4. SPA -> `/api/*`

## 2. Entrypoints reales

### Cliente

- [main.tsx](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\src\main.tsx)
- [App.tsx](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\src\App.tsx)

Rutas visibles:

- `/`
- `/centers/:slug`

Rutas no operativas redirigidas a `/`:

- `/map`
- `/saved`
- `/profile`
- `/search`

### Worker

- [index.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\worker\index.ts)

Endpoints:

- `GET /api/health`
- `GET /api/centers`
- `GET /api/centers/:slug`
- `GET /api/centers/:slug/schedule`
- `GET /api/centers/:slug/mobility`
- `GET /api/geocode`
- `GET /api/origin/presets`

## 3. Modulos

### `packages/contracts`

Tipos compartidos entre cliente, worker y dominio.

### `packages/domain`

Decision, ordenacion y movilidad trip-centric.

### `packages/ingestion`

Normalizacion e ingesta de centros.

### `packages/mobility`

Sync de EMT, BiciMAD, Metro y parkings.

### `packages/geo`

Distancia, UTM/WGS84 y SER.

### `packages/schedule-engine`

Parser y motor de horarios.

### `packages/ui`

Tokens y primitives visuales compartidos.

## 4. Monorepo real

Tras el cierre de Fase 2:

- `contracts`
- `domain`
- `geo`
- `ingestion`
- `mobility`
- `schedule-engine`
- `ui`

son paquetes reales de workspace, no solo aliases de Vite.

## 5. D1 actual

Dominios activos:

- fuentes e ingestas
- centros y enlaces de fuente
- horarios estructurados
- nodos de transporte
- enlaces centro-transporte
- cobertura SER
- features y evidencias
- callejero

Fuera del modelo operativo:

- `transport_routes`
- `transport_route_stops`
- claves R2 implcitas en ingestas

Eso se ha cerrado en Fase 2 como descarte explicito.

## 6. Transporte runtime actual

### 6.1 Datos estaticos por centro

Persistidos en D1:

- `center_transport_links`
- `transport_nodes`
- `center_ser_coverage`

Incluyen:

- EMT destino
- Metro destino
- BiciMAD destino
- parking destino
- SER del centro

### 6.2 Datos por origen

Calculados por request:

- EMT origen
- Metro origen
- BiciMAD origen
- walking fallback

Se construyen en:

- [mobility.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\worker\lib\mobility.ts)

### 6.3 Realtime

- EMT: por request, solo para paradas origen candidatas
- BiciMAD: via sync y persistencia en `metadata_json`
- Metro: solo estatico

### 6.4 Estrategia del explorador

`/api/centers` ya no calcula movilidad completa para todo el set filtrado.

Modelo actual:

- base sort para todos:
  - horario
  - walking fallback
  - open state
- movilidad completa solo para una ventana candidata:
  - `max(offset + limit + 12, 24)`
- el detalle sigue pudiendo calcular completo

Esto elimina el problema estructural de realtime masivo previo a paginacion.

## 7. UI operacional

La UI visible mantiene:

- explorador
- detalle full-screen

La navegacion ya no expone modos placeholder.

La app sigue consumiendo:

- `decision`
- `transport_summary`
- `transit_summary`

## 8. DECISIONES CERRADAS

### Deploy

Decision tomada:

- deploy directo con `wrangler deploy --config wrangler.jsonc --env <target>`
- scripts root como unica puerta operativa

Alternativa descartada:

- deploy desde `dist/alabiblio_api/wrangler.json`

Motivo:

- acoplaba el target al build previo
- dependia de estado implicito de entorno

### transport_routes

Decision tomada:

- descartar y eliminar del modelo operativo

Alternativa descartada:

- implementarlas a medias solo para "cerrar roadmap"

Motivo:

- no tenian runtime
- generaban falsa sensacion de capa de rutas resuelta

### KV / R2

Decision tomada:

- retirar referencias operativas de KV y R2

Alternativa descartada:

- mantener columnas y docs como "infra futura"

Motivo:

- no habia bindings reales
- introducia infraestructura implicita

### Transporte runtime

Decision tomada:

- visible-first en explorador
- full computation solo en ventana candidata y detalle

Alternativa descartada:

- calcular movilidad completa para todos los centros filtrados

Motivo:

- mal rendimiento
- peor base para cache
- riesgo de realtime masivo innecesario
