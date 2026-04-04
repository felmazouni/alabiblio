# PROD INCIDENT REPORT

Fecha: 2026-04-04

## Sintoma

- usuarios y navegadores de auditoria reportan `ERR_CONNECTION_TIMED_OUT` al abrir `https://alabiblio.org/`
- el flujo real de producto que mas castigaba al worker era `GET /api/centers` con origen activo
- la capa visible de cards no seguia una jerarquia clara y mezclaba resumentes con detalle tecnico

## Causa raiz de runtime

Se detectaron tres causas aplicativas concretas:

1. `GET /api/centers` seguia cargando demasiados datos antes de paginar
   - listaba todos los centros filtrados
   - cargaba horarios para todo el set cargado
   - construia decision base para todo el set
   - solo despues cortaba la pagina visible

2. el calculo de origen repetia trabajo caro en cada request
   - `transport_nodes` activos de `emt_stop`, `bicimad_station` y `metro_station` se consultaban enteros para cada listado y cada detalle de movilidad

3. EMT realtime no tenia timeout duro ni degradacion parcial por parada
   - un login lento o una parada lenta podia mantener bloqueado el lote completo

## Fix aplicado

### Backend

- `apps/web/worker/routes/centers.ts`
  - el listado ahora trabaja en ventanas
  - escanea por bloques de 48 y corta en un maximo de 144 centros por request
  - calcula la decision base solo para la ventana necesaria
  - enriquece con movilidad completa solo la ventana candidata visible

- `apps/web/worker/lib/db.ts`
  - nuevo `countCenters(...)`
  - `listCenters(...)` admite `limit` y `offset`

- `apps/web/worker/lib/originTransport.ts`
  - nuevo helper compartido para origen
  - cache en memoria del worker para nodos activos de transporte durante 5 minutos
  - elimina duplicacion entre listado y detalle

- `apps/web/worker/routes/mobility.ts`
  - reutiliza el helper cacheado de origen

### Upstream EMT

- `packages/mobility/src/emtApi.ts`
  - timeout de login: 3.5 s
  - timeout de realtime por parada: 4 s
  - si una parada falla, se degrada parcialmente
  - solo se devuelve `error` duro si todo el lote falla

### UI

- card principal reorganizada como board oscuro
  - cabecera
  - filas limpias de `METRO`, `BUS`, `BICIMAD`
  - franja inferior partida `COCHE` / `A PIE` o `DISTANCIA`
  - una sola linea de motivo

- cards secundarias
  - filas compactas de movilidad, ya sin dumps tecnicos

- detalle
  - bloque `Como llegar` alineado con la misma semantica visual

## Evidencia de validacion

### Validacion de codigo

- `pnpm typecheck`: OK
- `pnpm lint`: OK
- `pnpm test`: OK
- `pnpm build`: OK

### Deploy real

- entorno: `production`
- comando: `pnpm deploy:production`
- version desplegada: `ff5b1b81-c970-4036-9ef2-a88e590bb23b`

### Evidencia de reachability desde la maquina de auditoria

Desde esta maquina persiste un timeout de conexion TCP tanto contra `production` como contra `staging`:

- `Invoke-WebRequest https://alabiblio.org/api/health -TimeoutSec 15` -> timeout
- `Invoke-WebRequest https://staging.alabiblio.org/api/health -TimeoutSec 15` -> timeout
- captura headless de `https://alabiblio.org/` -> pagina de timeout de Edge

Interpretacion:

- el problema de app runtime que sobrecargaba el worker ha sido corregido en codigo y desplegado
- la imposibilidad de abrir `production` y `staging` desde esta maquina no apunta al worker ni a D1, porque afecta tambien a `staging` y a `/api/health`
- esa parte restante es un problema de reachability externa / edge / red entre esta maquina y Cloudflare, no un bloqueo del runtime del worker

## Estado final honesto

- incidente de runtime del listado: mitigado y corregido en codigo desplegado
- timeout de conexion observado desde la maquina de auditoria: sigue presente y queda fuera del runtime de la app
- rediseño funcional de cards y detalle: aplicado y desplegado
