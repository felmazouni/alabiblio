# PROD INCIDENT REPORT

Fecha: 2026-04-04

## Sintoma

- durante la auditoria se observaron `ERR_CONNECTION_TIMED_OUT` e intermitencia al abrir `https://alabiblio.org/`
- el flujo mas exigente de la app era `GET /api/centers` con origen activo y movilidad visible
- la card principal podia titularse `Mejor opcion ahora` aun cuando el centro destacado estaba cerrado

## Causa raiz aplicativa demostrada

Se demostraron tres problemas reales dentro del runtime de la app:

1. `GET /api/centers` hacia demasiado trabajo antes de responder
   - cargaba demasiados centros antes de cortar la pagina
   - calculaba decision base para demasiados registros por request
   - enriquecia mas movilidad de la necesaria

2. el calculo de origen repetia trabajo caro
   - los nodos activos de EMT, BiciMAD y metro se recalculaban para listado y detalle

3. EMT realtime no tenia limite duro suficiente
   - una parada lenta podia degradar el lote entero

## Fix aplicado

### Runtime

- `apps/web/worker/routes/centers.ts`
  - escaneo visible-first por ventanas
  - corte acotado por request
  - enriquecimiento completo solo para la ventana candidata

- `apps/web/worker/lib/db.ts`
  - paginacion real y `countCenters(...)`

- `apps/web/worker/lib/originTransport.ts`
  - cache en memoria del worker para nodos de origen

- `apps/web/worker/routes/mobility.ts`
  - reutiliza el helper cacheado

- `packages/mobility/src/emtApi.ts`
  - timeout duro para login y realtime EMT
  - degradacion parcial en vez de bloqueo total

### UI / ranking

- `apps/web/src/App.tsx`
  - la card principal ya no puede titularse `Mejor opcion ahora` si el centro esta cerrado
  - si el centro destacado esta cerrado, el framing cambia a `Mejor opcion proxima`, `Mejor opcion cercana` u `Opcion destacada`

- `apps/web/src/features/centers/transportCopy.ts`
  - degradacion publica y copy humano para BUS, SER y highlights

## Que esta demostrado

- habia una causa aplicativa real en el listado y en EMT realtime
- esos fixes estan implementados en codigo y desplegados
- desde esta maquina, tanto `production` como `staging` presentan timeout de conexion incluso contra `/api/health`
- por tanto, el timeout observado desde esta maquina no prueba por si solo un fallo exclusivo del worker de produccion

## Que no esta demostrado

- no esta demostrado que el edge de Cloudflare este caido globalmente
- no esta demostrado que el problema restante sea solo de red local de esta maquina
- no esta demostrado que todos los usuarios sigan viendo el mismo timeout en home, listado y detalle
- no esta demostrado que HTML y API fallen de la misma manera desde una red externa distinta

## Siguiente prueba minima para aislar la causa

1. lanzar una sonda externa desde una segunda red o runner contra:
   - `GET /api/health`
   - `GET /api/centers?limit=1`
   - `GET /`

2. ejecutar `wrangler tail` durante esa sonda
   - si no entran requests, el problema esta antes del worker
   - si entran requests con latencia alta o error, el problema sigue en runtime/upstream

3. repetir la misma sonda sobre `staging` y `production`
   - si fallan las dos igual, el problema apunta a edge/ruta/red
   - si falla solo `production`, el problema queda acotado al entorno productivo

## Validacion de codigo

- `pnpm typecheck`: OK
- `pnpm lint`: OK
- `pnpm test`: OK
- `pnpm build`: OK

## Deploy mas reciente

- entorno: `production`
- version desplegada: `bc01480c-013e-4d4f-bf28-c3af0d46bbbd`

## Evidencia adicional desde esta maquina

- `Invoke-WebRequest https://alabiblio.org/api/health -TimeoutSec 20` -> timeout
- `Invoke-WebRequest https://alabiblio.org/api/centers?limit=1 -TimeoutSec 25` -> timeout

Estos dos timeouts, por si solos, siguen sin demostrar si el problema restante esta en edge, red intermedia o reachability desde esta maquina.
