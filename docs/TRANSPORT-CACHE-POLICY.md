# TRANSPORT CACHE POLICY

Fecha: 2026-04-04

## Objetivo

Definir reglas explícitas de persistencia, memoización e invalidación para transporte.

## 1. Qué se persiste en D1

Persistencia larga:

- anchors estáticos de centro
  - EMT destino
  - Metro destino
  - BiciMAD destino
  - parkings
  - SER
- timestamps de sync por fuente

No se persiste como verdad operativa:

- EMT realtime por parada
- BiciMAD realtime efímero
- cálculo de movilidad por origen

## 2. Qué se memoiza

### En memoria / request scope

- parsing de `metadata_json`
- agrupación de nodos destino por centro
- agrupación de realtime EMT por `stop_id`

### En `caches.default`

- `GET /api/centers`
- `GET /api/centers/:slug`
- `GET /api/centers/:slug/mobility`

Con claves que incluyan:

- ruta
- query
- versión de datos estáticos (`x-data-version` o equivalente)
- bucket de origen si aplica

## 3. TTL por capa

### Static anchors

- TTL lógico: hasta nuevo sync
- invalidación:
  - tras `sync:mobility`
  - tras `sync:ser`
  - tras `ingest:centers`

### `GET /api/centers`

- TTL HTTP: `30s`
- `stale-while-revalidate`: `60s`

Regla adicional:

- para resultados sin origen:
  - se puede reutilizar entero
- para resultados con origen:
  - la clave debe incluir bucket geográfico y filtros

### Visible-first window del explorador

- cacheable por:
  - `origin_bucket`
  - `sort_by`
  - `filters_hash`
  - `offset_window`

TTL:

- `30s`

### `GET /api/centers/:slug`

- TTL HTTP: `60s`
- depende solo de datos estáticos y horario base

### `GET /api/centers/:slug/mobility`

- TTL HTTP: `15s`
- `stale-while-revalidate`: `15s`

## 4. TTL por fuente realtime

### EMT realtime

- TTL objetivo: `15s`
- clave: `emt:stop_id`
- no consultar paradas no seleccionadas del explorador fuera de la ventana visible

### BiciMAD realtime

- TTL objetivo: `15s`
- clave: `bicimad:station_id`
- solo consultar:
  - estación origen seleccionada
  - estación destino seleccionada

### Metro realtime

- V1: no cachea porque no existe como fuente operativa

## 5. Qué no se cachea

- errores 5xx como respuesta duradera
- payload completo de todos los centros con movilidad detallada
- combinaciones de origen sin bucketizar

## 6. Bucketización del origen

Para el explorador:

- bucket geográfico de lat/lon
- resolución sugerida V1:
  - `~150m` a `250m`

Clave conceptual:

- `centers:list:{origin_bucket}:{sort}:{filters}:{offset_window}`

Motivo:

- evitar explosión de claves
- permitir reuse razonable en scroll y refresco corto

## 7. Invalidación

### Eventos de invalidación dura

- nuevo `ingestion_run` completado de centros
- nuevo `sync:mobility`
- nuevo `sync:ser`
- cambio de schema que afecte a contrato

### Eventos de invalidación blanda

- cambio de origen
- cambio de sort
- cambio de filtros
- cambio de ventana visible

## 8. Política de degradación de caché

Si falla upstream realtime:

- servir último valor cacheado si no supera TTL degradado:
  - EMT: `<= 60s`
  - BiciMAD: `<= 60s`
- marcar módulo como:
  - `degraded_upstream`
  - con `source_timestamp`

Si no existe valor cacheado:

- devolver módulo degradado con anchors y sin cifras realtime

## 9. Reglas operativas cerradas

- no realtime masivo para todos los centros
- no cache eterno para realtime
- listado con origen usa visible-first + bucketización
- detalle permite cálculo completo con TTL corto
