# AUDIT TAKEOVER

Fecha: 2026-04-04

## Objetivo

Recuperar control tecnico del repo y cerrar las ambiguedades operativas detectadas en la auditoria inicial.

## Resultado ejecutivo

Estado tras Fase 2:

- build reproducible: OK
- typecheck: OK
- lint: OK
- test: OK
- deploy directo por `wrangler.jsonc`: OK
- infraestructura implicita: eliminada del modelo operativo
- `transport_routes`: descartado
- explorador: visible-first
- placeholders principales: retirados de la navegacion

## Que estaba roto de verdad

### 1. Deploy

El repo mezclaba dos caminos:

- deploy por artefacto Vite
- deploy directo con Wrangler

Eso hacia que el target efectivo dependiera del build previo.

### 2. Esquema con features fantasma

Existian elementos "semi modelados" sin runtime real:

- `transport_routes`
- `transport_route_stops`
- `snapshot_r2_key`
- `raw_payload_r2_key`
- expectativa de KV/R2 sin bindings

### 3. Explorador

`/api/centers` calculaba movilidad completa antes de paginar.

Eso hacia el sistema mas caro y menos refactorizable.

### 4. UI visible

La navegacion seguia exponiendo modos placeholder:

- mapa
- guardadas
- perfil

## Decisiones ejecutadas

### Deploy

Se cierra un unico camino:

- root scripts
- deploy de app con `wrangler deploy --config wrangler.jsonc --env <target>`

Se elimina del modelo operativo:

- dependencia de `CLOUDFLARE_ENV`
- deploy por `dist/alabiblio_api/wrangler.json`

### transport_routes

Se elige descarte completo:

- `0006_transport_routes_features.sql` deja de crear tablas de rutas
- `0008_drop_unused_transport_routes.sql` limpia bases existentes

### KV / R2

Se elige descarte completo en esta fase:

- `0001_core_sources_centers.sql` ya no modela columnas R2
- `0009_remove_implicit_storage_columns.sql` reconstruye tablas para eliminar esas columnas en bases existentes
- pipelines y tipos dejan de referenciarlas

### Explorador

Se pasa a visible-first:

- base sort con walking/open state para todo el set
- movilidad completa solo para ventana candidata visible
- detalle mantiene calculo completo

### UI minima

Se retiran estados rotos visibles:

- `/map`, `/saved`, `/profile`, `/search` redirigen a `/`
- la bottom nav deja de exponer items placeholder
- `TransportModeTabs` deja de mostrar el texto "Modo no disponible"

## Archivos principales tocados en Fase 2

- [package.json](c:\Users\ttefm\OneDrive\Documents\alabiblio\package.json)
- [scripts/run-workspace-script.mjs](c:\Users\ttefm\OneDrive\Documents\alabiblio\scripts\run-workspace-script.mjs)
- [apps/web/package.json](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\package.json)
- [apps/web/worker/routes/centers.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\worker\routes\centers.ts)
- [apps/web/worker/routes/mobility.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\worker\routes\mobility.ts)
- [apps/web/src/App.tsx](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\src\App.tsx)
- [apps/web/src/features/navigation/BottomNavBar.tsx](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\src\features\navigation\BottomNavBar.tsx)
- [apps/web/src/features/centers/components/TransportModeTabs.tsx](c:\Users\ttefm\OneDrive\Documents\alabiblio\apps\web\src\features\centers\components\TransportModeTabs.tsx)
- [packages/geo/src/ser.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\packages\geo\src\ser.ts)
- [packages/mobility/src/sync.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\packages\mobility\src\sync.ts)
- [packages/ingestion/src/types.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\packages\ingestion\src\types.ts)
- [packages/ingestion/src/normalizers/center.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\packages\ingestion\src\normalizers\center.ts)
- [packages/ingestion/src/pipelines/ingestCenters.ts](c:\Users\ttefm\OneDrive\Documents\alabiblio\packages\ingestion\src\pipelines\ingestCenters.ts)
- [sql/migrations/0001_core_sources_centers.sql](c:\Users\ttefm\OneDrive\Documents\alabiblio\sql\migrations\0001_core_sources_centers.sql)
- [sql/migrations/0006_transport_routes_features.sql](c:\Users\ttefm\OneDrive\Documents\alabiblio\sql\migrations\0006_transport_routes_features.sql)
- [sql/migrations/0008_drop_unused_transport_routes.sql](c:\Users\ttefm\OneDrive\Documents\alabiblio\sql\migrations\0008_drop_unused_transport_routes.sql)
- [sql/migrations/0009_remove_implicit_storage_columns.sql](c:\Users\ttefm\OneDrive\Documents\alabiblio\sql\migrations\0009_remove_implicit_storage_columns.sql)

## Deuda tecnica restante

### P0

- ninguna ambiguedad estructural abierta equivalente a las antiguas capas fantasma

### P1

- matching EMT sigue heuristico
- `/api/centers` sigue cargando horarios base para todo el set antes del corte visible
- no existe cache selectiva por ventana visible
- payload detail sigue siendo ancho
- `wrangler d1 execute --local` no ha podido revalidarse en este terminal; el CLI queda bloqueado incluso con `select 1`

### P2

- bundle cliente grande
- falta cerrar tests de integracion/API/E2E
- preview no se ha revalidado en esta fase

## Veredicto

El sistema queda mas determinista que al inicio del takeover:

- un solo camino operativo de deploy
- cero infraestructura implicita en el modelo vigente
- cero features fantasma tipo `transport_routes`
- transporte listo para refactor posterior sin deuda estructural falsa
