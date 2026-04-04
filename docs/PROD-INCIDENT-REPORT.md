# PROD INCIDENT REPORT

Fecha: 2026-04-04

## Sintoma

- durante la auditoria se observaron `ERR_CONNECTION_TIMED_OUT` e intermitencia al abrir `https://alabiblio.org/`
- el flujo mas exigente de la app era `GET /api/centers` con origen activo y movilidad visible
- la card principal podia titularse `Mejor opcion ahora` aun cuando el centro destacado estaba cerrado
- en esta fase se reproduce `connect timeout` tanto en:
  - `https://alabiblio.org/`
  - `https://alabiblio.org/api/health`
  - `https://staging.alabiblio.org/`
  - `http://alabiblio.org/`
  - `http://staging.alabiblio.org/`

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
- `nslookup alabiblio.org` resuelve correctamente a IPs de Cloudflare
- `cloudflare.com` responde `200` desde esta misma maquina
- `workers.dev` del servicio base responde:
  - `https://alabiblio-api.ttefmb.workers.dev/` -> `200`
  - `https://alabiblio-api.ttefmb.workers.dev/api/health` -> `200`, con `env: "local"`
- el endpoint base de `workers.dev` no valida `production` porque esta asociado al servicio base y no al entorno productivo; de hecho `GET /api/centers?limit=1` ahi devuelve `{"error":"Internal server error","detail":"list_centers_failed"}`
- `wrangler deployments list --name alabiblio-api-production --json` confirma despliegues recientes del worker productivo y la version actual:
  - `b081342b-2601-4440-b292-a868052cfb29`
- por tanto, el timeout observado desde esta maquina no apunta primero a React ni a una excepcion del worker, sino a reachability del dominio antes o fuera de la ejecucion productiva

## Que no esta demostrado

- no esta demostrado que el edge de Cloudflare este caido globalmente
- no esta demostrado que el problema restante sea solo de red local de esta maquina
- no esta demostrado que todos los usuarios sigan viendo el mismo timeout en home, listado y detalle
- no esta demostrado que HTML y API fallen de la misma manera desde una red externa distinta
- no esta demostrado que el worker productivo este saturado, porque el sintoma actual es timeout de conexion al dominio antes de obtener respuesta HTTP
- no esta demostrado que `wrangler tail` no funcione; en esta sesion no ha emitido eventos capturables, asi que no sirve todavia como prueba a favor ni en contra

## Verificacion edge

### Dominio custom

- `curl -I https://alabiblio.org/` -> `connect timeout`
- `curl https://alabiblio.org/api/health` -> `connect timeout`
- `curl -I https://staging.alabiblio.org/` -> `connect timeout`
- `Test-NetConnection alabiblio.org -Port 443` -> fallo / timeout
- `Test-NetConnection alabiblio.org -Port 80` -> fallo / timeout

### workers.dev

- `curl -I https://alabiblio-api.ttefmb.workers.dev/` -> `200`
- `curl https://alabiblio-api.ttefmb.workers.dev/api/health` -> `200`
- `curl https://alabiblio-api.ttefmb.workers.dev/api/centers?limit=1` -> `500 list_centers_failed`

Lectura operativa:

- el servicio worker base existe y responde por `workers.dev`
- el problema de timeout actual afecta al acceso por dominio custom, no al simple hecho de que el worker no exista

## Routing verificado

- configuracion declarada en `apps/web/wrangler.jsonc`:
  - `production` -> `alabiblio.org/*`
  - `staging` -> `staging.alabiblio.org/*`
- despliegue productivo confirmado por `wrangler deployments list`
- queda pendiente verificar desde Cloudflare Dashboard si las rutas estan aplicadas correctamente en edge y no solo en config local

## wrangler tail

Se hicieron intentos de `wrangler tail` sobre:

- `alabiblio-api-production`
- `alabiblio-api`

Resultado en esta sesion:

- no se capturaron eventos utilizables ni para el dominio custom ni para `workers.dev`
- eso deja `tail` como evidencia insuficiente aqui
- siguiente prueba minima:
  - abrir `wrangler tail` en una terminal interactiva dedicada
  - lanzar requests desde otra terminal o desde otra red
  - comprobar si entra algo cuando falla el dominio custom

Si no entra nada en `tail` mientras el dominio falla, el problema esta antes del worker.
Si entra y se queda colgado o da error, el problema vuelve al runtime/upstream.

## Limites de ejecucion revisados

### `GET /api/centers`

- ya no hace movilidad completa para todo el grid
- usa listado base y el enriquecimiento pesado esta separado
- mantiene cache publica y bucket de origen

### `GET /api/centers/:slug/mobility`

- carga origen + anchors + realtime con cache corta
- sigue teniendo trabajo externo, pero acotado a un centro

### EMT / BiciMAD

- EMT tiene timeout duro:
  - login: `3500 ms`
  - realtime: `4000 ms`
- `Promise.allSettled` se usa para EMT realtime por paradas, reduciendo bloqueo total
- el listado base ya no depende del realtime de EMT/BiciMAD

Lectura:

- los hotspots de runtime existen y ya se han recortado
- el sintoma actual de `connect timeout` al dominio no encaja primero con un worker saturado, porque falla incluso `/api/health`

## Hipotesis ordenadas

### 1. Mas probable: problema de edge/routing o reachability del dominio custom

Evidencia:

- falla `production` y `staging`
- fallan `80` y `443`
- falla incluso `/api/health`
- `workers.dev` responde
- DNS resuelve a Cloudflare

### 2. Probable: problema de red local / ISP hacia las IPs anycast asignadas a este dominio

Evidencia:

- `cloudflare.com` responde desde esta maquina
- `alabiblio.org` no responde desde esta maquina
- eso sugiere un problema selectivo de reachability, no una caida general de Internet

### 3. Menos probable: saturacion del worker productivo

Evidencia en contra:

- el timeout es de conexion, no de respuesta HTTP lenta
- afecta tambien a `/api/health`
- no hay prueba de que las requests lleguen a ejecutar el worker

### 4. Pendiente de descartar: mala aplicacion de routes en Cloudflare

Evidencia:

- en config local las routes existen
- falta confirmacion desde el dashboard / API de que esten activas correctamente en edge

## Siguiente prueba minima para aislar la causa

1. lanzar una sonda externa desde otra red contra:
   - `GET https://alabiblio.org/api/health`
   - `GET https://alabiblio.org/api/centers?limit=1`
   - `GET https://staging.alabiblio.org/api/health`

2. abrir `wrangler tail` en terminal interactiva y repetir esas requests
   - si no entra nada: problema antes del worker
   - si entra algo con errores: problema de runtime/upstream

3. revisar en Cloudflare Dashboard:
   - DNS de apex y staging
   - estado proxy
   - SSL/TLS
   - Worker Routes activas sobre zona `alabiblio.org`

4. si el dominio sigue fallando, habilitar contingencia en `workers.dev` apuntando a un entorno util y no al servicio base local

## Plan de contingencia

Si el dominio custom sigue caido:

1. exponer un endpoint publico estable en `workers.dev` para `production`
2. si hace falta, dejar el listado en modo base barato y sin enriquecimiento adicional hasta estabilizar reachability
3. usar esa URL temporal para validacion funcional mientras se corrige edge/dominio

## Validacion de codigo

- `pnpm typecheck`: OK
- `pnpm lint`: OK
- `pnpm test`: OK
- `pnpm build`: OK

## Deploy mas reciente

- entorno: `production`
- version desplegada: `b081342b-2601-4440-b292-a868052cfb29`

## Evidencia adicional desde esta maquina

- `Invoke-WebRequest https://alabiblio.org/api/health -TimeoutSec 20` -> timeout
- `Invoke-WebRequest https://alabiblio.org/api/centers?limit=1 -TimeoutSec 25` -> timeout

Estos dos timeouts, por si solos, siguen sin demostrar si el problema restante esta en edge, red intermedia o reachability desde esta maquina.
