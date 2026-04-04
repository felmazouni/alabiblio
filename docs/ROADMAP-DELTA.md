# ROADMAP DELTA

Fecha: 2026-04-04

## Plataforma

| Feature | Prioridad | Estado | Dependencia | Criterio de cierre |
| ------- | --------- | ------ | ----------- | ------------------ |
| Workspace packages internos | P0 | OK | ninguna | todos los modulos consumidos por worker y cliente son paquetes de workspace reales |
| Install limpio | P0 | OK | Node 22 + pnpm 10.11.0 | `install -> build` funciona desde cero |
| Build root | P0 | OK | wrapper root | `pnpm build` no depende de hacks de shell |
| Deploy staging/production | P0 | OK | `wrangler.jsonc` | `pnpm deploy:staging` y `pnpm deploy:production` usan el mismo camino operativo |
| Reachability publica desde la red de auditoria | P0 | PARCIAL | edge / red externa | `production` y `staging` cargan sin timeout tambien desde esta maquina |
| Deploy por artefacto `dist/alabiblio_api` | P0 | DESCARTADO | ninguna | no se usa ni se documenta como camino valido |
| Wrangler D1 local CLI | P1 | PARCIAL | entorno local limpio | `wrangler d1 execute --local` responde en local sin bloqueo |
| Documentacion operativa | P0 | OK | docs takeover | runbook y arquitectura permanecen alineados a codigo real |

## Datos e ingesta

| Feature | Prioridad | Estado | Dependencia | Criterio de cierre |
| ------- | --------- | ------ | ----------- | ------------------ |
| Migraciones D1 | P0 | OK | reconstruccion idempotente | migraciones aplican sobre base nueva y base existente |
| KV operativo | P0 | DESCARTADO | ninguna | no existen referencias operativas ni docs que lo anuncien |
| R2 operativo | P0 | DESCARTADO | ninguna | no existen referencias operativas ni columnas activas |
| Ingesta de centros | P1 | PARCIAL | tests integracion | suite de integracion cubre pipeline study rooms + libraries |
| EMT stops + realtime | P1 | PARCIAL | fuente EMT estable | hit rate EMT aceptable o criterio formal de degradacion documentado |
| BiciMAD | P1 | PARCIAL | politica de frescura | TTL e invalidacion por fuente cerrados tambien a nivel de upstream y no solo por endpoint |
| Metro CRTM | P1 | OK | ninguna | estaciones y lineas consistentes en payload, runtime y UI V1 |
| `transport_routes` / `transport_route_stops` | P0 | DESCARTADO | ninguna | fuera del esquema operativo y fuera de runtime |

## API

| Feature | Prioridad | Estado | Dependencia | Criterio de cierre |
| ------- | --------- | ------ | ----------- | ------------------ |
| `/api/centers` | P0 | OK | visible-first + contratos V1 | devuelve solo resumen de listado y highlights sin payload de detalle ni escaneo completo del dataset |
| `/api/centers/:slug` | P1 | OK | contratos V1 | devuelve detalle base + anchors estaticos sin realtime obligatorio |
| `/api/centers/:slug/mobility` | P1 | OK | contratos V1 + cache | devuelve origen, realtime, ranking y degradacion controlada |
| Geocode | P1 | PARCIAL | politica de cache | fallback e invalidacion definidos |

## Movilidad

| Feature | Prioridad | Estado | Dependencia | Criterio de cierre |
| ------- | --------- | ------ | ----------- | ------------------ |
| Modelo canonico de movilidad | P0 | OK | `TRANSPORT-ARCHITECTURE-V1.md` | cada campo pertenece a `STATIC_CENTER`, `ORIGIN_DEPENDENT` o `REALTIME` en runtime real |
| Explorador transporte | P0 | OK | visible-first + cache | full computation solo en principal y ventana visible con scan acotado por request |
| Cache de movilidad | P0 | PARCIAL | `TRANSPORT-CACHE-POLICY.md` | TTL, invalidacion y bucketizacion aplicados tambien en fallback stale por fuente |
| Matching EMT | P1 | PARCIAL | criterio V1 cerrado | linea util y degradacion cumplen especificacion V1 con hit rate aceptable |
| Degradacion por modo | P0 | OK | contratos V1 | no existe fallback generico si quedan modulos utiles |

## UI publica

| Feature | Prioridad | Estado | Dependencia | Criterio de cierre |
| ------- | --------- | ------ | ----------- | ------------------ |
| Tarjeta principal de transporte | P0 | PARCIAL | `UI-TRANSPORT-SPECS.md` + API V1 | muestra board principal con `METRO`, `BUS`, `BICIMAD`, franja `COCHE` / `A PIE` y 1 motivo, validado tambien en produccion visible |
| Cards secundarias | P1 | PARCIAL | `UI-TRANSPORT-SPECS.md` | muestran filas compactas de movilidad, validadas tambien en produccion visible |
| Encoding y copy visible | P0 | OK | sanitizacion UI + copy V1 | no aparece mojibake ni labels tecnicos en explorador, cards y detalle |
| Home / nav placeholders | P0 | OK | ninguna | rutas placeholder ya no estan expuestas en navegacion |
| Detalle full-screen | P1 | OK | API V1 + mobility V1 | usa misma semantica que la card, ampliada y sin payload ambiguo ni labels internos |
| Mapa global | P2 | DESCARTADO | ninguna | no se reactiva hasta tener base de transporte estable |
| Guardadas / Perfil | P2 | DESCARTADO | identidad real | no se reactivan sin backend real |

## Calidad / operacion

| Feature | Prioridad | Estado | Dependencia | Criterio de cierre |
| ------- | --------- | ------ | ----------- | ------------------ |
| Typecheck / lint / test | P0 | OK | CI | cadena base verde de forma sostenida |
| Incidente de timeout en produccion | P0 | PARCIAL | `docs/PROD-INCIDENT-REPORT.md` | home, listado y detalle cargan sin timeout desde redes externas y desde la maquina de auditoria |
| Tests de integracion API | P1 | PARCIAL | contratos V1 | cubren listado, detalle y mobility degradado |
| Tests E2E | P2 | PARCIAL | UI V1 estabilizada | validan explorador, detalle y cambio de origen |
| Admin | P2 | DESCARTADO | ninguna | fuera de alcance del takeover actual |
| Identidad / valoraciones | P2 | DESCARTADO | ninguna | congelado hasta cerrar movilidad y API V1 |
