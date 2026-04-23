# Estado actual

  - Fecha de corte: `2026-04-23`
  - Estado del proyecto: `produccion activa en alabiblio.org` con `preview de contingencia separada`, `Bloques 1, 2, 2.5, 2.6, 3, 4, 5, 6 y 7` completados, `subbloque 12.0 de consolidacion Cloudflare` completado, `deuda critica de ingesta autonoma en produccion resuelta`, `Tramo 2B refinado visual duro completado`, `release de endurecimiento honesto 2026-04-23 desplegada y validada en preview y produccion`.
- URL de preview: `https://alabiblio-preview.ttefmb.workers.dev`
- URL de produccion: `https://alabiblio.org` (runtime `alabiblio-prod` activo).
- Base de datos preview: D1 `alabiblio-preview`
- Centros publicados en preview: `115`
  - Version desplegada (preview): `afd63119-d7cc-4f87-9224-9dc6068872cb`
  - Version desplegada (produccion): `7b0930ad-11c6-4dfd-9984-7112004321bf`
- Cierre Tramo 1 (ejecucion directa): normalizacion de etiquetas de zona, persistencia completa de filtros en URL y restauracion de contexto de listado (scroll + back) validadas en preview y promovidas a produccion.
- Cierre Tramo 2 (ejecucion directa): rediseño premium transversal de filtros, cards, ratings y estados vacios con consistencia visual en light/dark y mobile/desktop, validado en preview y promovido a produccion.
- Cierre Tramo 2B (refinado visual duro): LibraryCard reescrita a layout 2 areas (cuerpo compacto + footer de transporte); rating inline con estrellas y numero; subratings en grid 3 columnas con barras; aviso tira fina; headers de seccion sin uppercase ni letter-spacing en FiltersPanel y CenterDetailRoute; ScheduleRulesBlock con divide-y y dots de estado; SettingCard sin caja de icono pesada; equipamiento como chips pill; transporte en divide-y limpio. Typecheck y build limpios. Preview (92e1f820) y produccion (8151e33d) verificadas.
- Cierre Tramo 2C (correcciones criticas UI): (1) Boton Google duplicado en modal de valoracion eliminado — queda solo el boton oficial renderizado por Google SDK; (2) Modales compactados en desktop — FiltersPanel max-w-[580px]/max-h-[82vh], modal de voto max-w-[480px]; (3) interurban_bus reparado en chips de filtros — transportIcon y transportLabel cubren el caso; (4) Pestana Horarios reconstruida con secciones Estado/Dias/Franja horaria; (5) Busqueda reactiva con debounce 300ms via useRef sin rerender espurio; (6) Iconografia de transporte cromatica por modo — metro=rojo, cercanias=azul, emt_bus=cyan, interurban_bus=ambar, bicimad=esmeralda, metro_ligero=purpura, car=neutro; (7) Boton "Ver" renombrado a "Ver detalle"; (8) Bloque de horario en detalle con aviso de confianza baja y sin tabla vacia cuando rules=[]; (9) Modal de transporte con iconos cromaticos; (10) Consistencia LibraryCard/CenterDetailRoute. Nuevos filtros weekdays/timeSlot aplicados en cliente via useMemo. Typecheck y build limpios. Preview (a46322c8) y produccion (e518f850) verificadas.
- Cierre trazable. Release de endurecimiento honesto (2026-04-23): ratings mantenidos visibles y etiquetados como internos de AlaBiblio; retirada la pestana `Horarios` y neutralizados `weekdays/timeSlot`; copy publica sin claims de realtime engañosos; distancia heuristica marcada como aproximada; filtro de transporte alineado con opciones realmente visibles en payload; `/api/health` validado como health real. Preview `afd63119-d7cc-4f87-9224-9dc6068872cb` y produccion `7b0930ad-11c6-4dfd-9984-7112004321bf` verificadas. Ver `docs/RELEASE-2026-04-23.md`.

# Lo que funciona ya de verdad

- Worker de Cloudflare desplegado en preview con assets del frontend y API publica.
- D1 de preview provisionada y conectada al Worker.
- `typecheck`, `build` y `wrangler deploy` verificados en este estado.
- `GET /api/health` operativo.
- `GET /api/public/catalog` operativo con datos reales.
- `GET /api/public/centers/:slug` operativo.
- `GET /api/public/filters` operativo.
- Ingesta minima real desde fuentes oficiales de bibliotecas y salas de estudio del Ayuntamiento.
- Exclusiones estrictas activas para espacios al aire libre y elementos no validos para estudio interior.
- Normalizacion persistente basica de horarios con `rules`, `schedule_confidence`, `notes_unparsed`, `is_open_now` y `next_change_at`.
- Overrides estructurados de horarios: verano, examenes, festivos, cierres temporales, jornadas reducidas.
- Cola de revision manual para centros con `needs_manual_review` o confianza baja.
- Distribucion de confidence post-Bloque 3: `medium`=87, `low`=18, `high`=2, `needs_manual_review`=8 (bajado de 43).
- Snapshot de movilidad de destino persistido por centro para `metro`, `cercanias`, `interurbanos CRTM`, `emt_bus`, `bicimad` y `car/SER`.
- Fuentes estructuradas activas: EMT paradas oficiales, CRTM Red Metro/Cercanias/Interurbanos (FeatureServer), BiciMAD oficial y cobertura SER oficial.
- Trazabilidad de ingesta de movilidad persistida en `transport_source_runs` por fuente, URL, conteo y fecha.
- Esquema runtime de D1 alineado con migraciones versionadas para transporte persistido y cobertura SER.
- Reclasificacion inicial de procedencia ya aplicada para `wifi`, `aforo`, flags de detalle y payloads visibles.
- Reingesta real de centros ejecutada sobre preview con 7 descartes persistidos y auditables.
- Normalizacion de centros validada sin slugs duplicados y sin espacios al aire libre retenidos.
- Parser de horarios mejorado para conservar contexto de dias y horas separados y extraer notas especiales basicas en preview.
- Home, listado, detalle basico y modal de filtros visibles en preview.
- Bloque de card `Transporte` compactado: trigger en tarjeta y dialog centrado con detalle por modo dentro de 500 m, sin acordeon vertical en la card.
- Disponibilidad BiciMAD preparada bajo demanda con endpoint publico dedicado (`/api/public/transport/bicimad/availability`) y degradacion honesta cuando realtime no esta configurado.
- Dark mode base operativo con persistencia de preferencia.
- Logging estructurado basico en Worker e ingesta.
- Ratings compactos en tarjeta: chips inline `[Icon] Label N/D` sin grid vertical, dos filas en escritorio.
- Dialog de transporte rediseÃ±ado: layout horizontal por modo (icono + label + badge a la izquierda, stops/lÃ­neas/BiciMAD a la derecha).
- BiciMAD en dialog: nombre de estaciÃ³n fija + botÃ³n "Ver disponibilidad" + resultado inline en la misma fila.
- Selector de ubicaciÃ³n en home: modo auto (GPS) y manual (autocompletado callejero Madrid), pill con label + Cambiar + X cuando hay ubicaciÃ³n activa.
- Endpoint `GET /api/public/callejero/autocomplete?q=` operativo: proxy Nominatim con bbox Madrid, cachÃ© 1h, UTF-8 correcto.
- Motor operativo de horarios corregido para overrides recurrentes (incluido `fines de semana y festivos`) con timezone Madrid coherente en `is_open_now`, `today_summary` y `next_change_at`.
- Caso real validado en preview: Sala de estudio Sanchinarro (Hortaleza) pasa de `Cerrada` a `Abierta` en fin de semana cuando aplica `8:30-22:00`, sin divergencia entre listado y detalle.
- Home: bloque `Top 3 opciones para ti` migrado a carrusel real (Embla) alimentado por Top 3 real de API, con cards compactas, CTA y soporte responsive/dark mode.
- Auditoria global de estado operativo ejecutada sobre `115/115` centros con resultado final `0 inconsistencias`.
- Convergencia validada entre `GET /api/public/catalog` y `GET /api/public/centers/:slug` para estado operativo (`is_open_now`, `today_summary`, `next_change_at`, `schedule_label`) sin divergencias sistÃ©micas.
- Saneo de transporte por modo aplicado en snapshot: si existe opcion `official_structured` para un modo, no se mantiene activa una competidora `official_text_parsed` del mismo modo.
- Lote de snapshots de transporte regenerado a `snapshot_version` uniforme `2026-04-19.v3` para `115/115` centros en preview.
- Coherencia catalogo/detalle en transporte validada en muestreo: ambos endpoints leen snapshot persistido en D1 y devuelven firmas de opciones equivalentes para los slugs auditados.
- Reconstruccion completa de produccion validada desde cero sin import desde preview: `centers=115`, `center_transport_snapshots=115`, `snapshot_version=2026-04-19.v3` uniforme y `emt=4926` en `transport_source_runs`.

## Cierre formal trazable. Correccion global del motor operativo (2026-04-19)

- Alcance auditado: `115/115` centros publicados en preview.
- Resultado final: `0 inconsistencias`.
- Causas raiz detectadas:
  - deriva de esquema D1 (`schedule_needs_review` ausente en algunos entornos),
  - saturacion de CPU en `GET /api/public/centers/:slug` bajo barrido masivo,
  - auditoria inicial sin paridad completa frente a `activeOverride.closed`.
- Correcciones aplicadas:
  - convergencia de esquema en runtime para `schedule_needs_review`,
  - carga de detalle por `slug` en O(1) y reduccion de coste en ruta de detalle,
  - auditoria reforzada con paridad de calculo de open-state (`activeOverride`, `next_opening`, `next_change_at`, `today_summary`) y throttling.
- Preview validada en este cierre:
  - `GET /api/health` = `200`,
  - `GET /api/public/catalog` = `200`,
  - `GET /api/public/centers/:slug` = `200` en muestreo y auditoria completa.
- Confirmacion de consistencia: catalogo y detalle no divergen en estado operativo para los centros auditados.

## Cierre trazable. Consolidacion Cloudflare y corte a dominio final (2026-04-20)

- Worker legacy identificado detras de `alabiblio.org/*`: `alabiblio-api-production`.
- Worker productivo nuevo desplegado: `alabiblio-prod` (`01cedcfa`) con `APP_ENV=production`, `APP_BASE_URL=https://alabiblio.org`, assets y binding D1 dedicado.
- D1 productiva nueva creada: `alabiblio-prod` (`d7f14afd-ee4d-40a7-8dd5-687127959456`).
- Migraciones aplicadas en `alabiblio-prod`: `0001` a `0006`.
- Ingesta directa en runtime productivo bloqueada por `403` de dataset oficial durante hidratacion inicial; fallback ejecutado sin improvisar: export de datos validados de `alabiblio-preview` e import completo en `alabiblio-prod`.
- Estado de datos tras convergencia en produccion: `centers=115`, `center_transport_snapshots=115`, `snapshot_version=2026-04-19.v3` uniforme.
- Corte de dominio ejecutado: ruta `alabiblio.org/*` actualizada a `alabiblio-prod`.
- Preview mantenida como contingencia: `alabiblio-preview` sigue operativa en workers.dev.
- Limpieza de recursos Alabiblio obsoletos ejecutada:
  - D1 eliminadas: `alabiblio-local-db`, `alabiblio-staging-db`, `alabiblio-production-db`.
  - Workers eliminados: `alabiblio-api`, `alabiblio-api-staging`, `alabiblio-api-production`.
- Topologia final Alabiblio:
  - Worker preview: `alabiblio-preview`
  - Worker production: `alabiblio-prod`
  - D1 preview: `alabiblio-preview`
  - D1 production: `alabiblio-prod`
- Smoke final en dominio real (`200`): `/`, `/listado`, `/api/health`, `/api/public/catalog`, `/api/public/filters`, `/api/public/centers/:slug`.
- Rollback operativo documentado:
  - Restituir ruta `alabiblio.org/*` a un Worker anterior versionado (si se conserva) o redeploy de version previa conocida.
  - Mantener `alabiblio-preview` como superficie de continuidad durante recuperacion.
  - En caso de regresion de datos, reimportar dump validado desde preview a `alabiblio-prod` y revalidar smoke.

## Cierre trazable. Resolucion de deuda critica de ingesta autonoma (2026-04-20)

- Endpoint exacto con `403` identificado en runtime Worker: fuente EMT CSV de transporte (`source_code=emt`) durante generacion de snapshots (`transport_source_unavailable`).
- Clasificacion de causa: restriccion de acceso HTTP sobre la URL legacy de EMT en runtime Worker; mitigado con cliente de descarga reforzado (headers completos, `user-agent` comun, `referer`, timeout y reintentos) y fallback a URL oficial directa de EMT.
- Paridad preview/prod verificada: mismo cliente HTTP, mismo `user-agent`, mismos headers, mismo timeout y misma configuracion de fetch tras despliegue en ambos entornos.
- Validacion de fuentes oficiales en produccion tras fix: `libraries=50`, `study_rooms=72`, `emt=4926`, `crtm_metro=291`, `crtm_cercanias=111`, `crtm_interurbanos=8683`, `bicimad=631`, `ser=67`.
- Regeneracion completa de `alabiblio-prod` ejecutada desde cero sin export/import desde preview.
- Smoke API produccion repetido en dominio real con `200`: `/api/public/catalog`, `/api/public/filters`, `/api/public/centers/:slug`.


## Cierre trazable. Bloque 7 UI publica final, compactacion y fidelidad v0 (2026-04-21)

- LibraryCard compactada: eliminados SummaryBox, RatingSection; linea de estado compacta (horario + aforo).
- PublicCatalogRoute: eliminado parrafo de cobertura por defecto del header de listado.
- FiltersPanel reescrito a 4 tabs (General / Zona / Ordenar / Horarios) sin scroll interno; chips y componentes compactados.
- CenterDetailRoute reescrita sin LibraryCard, sin `<details>`, sin datos tecnicos internos; transporte inline; horario, equipamiento y contacto siempre visibles.
- Typecheck limpio en los 3 tramos. Build limpio. Deploy preview (f6008638) y produccion (25bcb4aa) verificado.
- Commits: 75c4aed (tramo 1), 5f230de (tramo 2), de6ebef (tramo 3).

## Cierre trazable. Despliegue puntual de cards y smoke minimo en produccion (2026-04-23)

## Cierre trazable. Repo, preview y produccion alineados para release endurecida (2026-04-23)

- Estado publicado a fijar en `main` sin depender de workspace local no versionado.
- Preview y produccion validadas sobre el mismo corte funcional endurecido.
- Comprobaciones funcionales exigidas para este cierre: ratings internos visibles, sin filtros publicos de horario, sin distancia usable sin ubicacion real, filtro de transporte coherente con opciones visibles y `/api/health` con checks reales.
- Nota de release creada en `docs/RELEASE-2026-04-23.md`.

- Version de produccion desplegada: `6c28f173-23e8-4ab7-b3a6-b92b5083ff97`.
- Smoke minimo ejecutado sobre `alabiblio.org` con `200` en: `/api/health`, `/api/public/catalog` y `/api/public/centers/:slug`.
- El aforo vuelve a estar visible en cards de listado/home con regla explicita: `Aforo · X plazas` cuando existe dato y `Aforo · No disponible` cuando no existe.
- Verificacion visual en produccion confirmada en listado: San Juan Bautista muestra `Aforo · 277 plazas`; Pilares y Luis Gonzaga muestran `Aforo · No disponible`.
- No se han detectado regresiones funcionales en esos endpoints minimos tras el despliegue de produccion.
## Cierre trazable. Bloque 6 API publica final y contratos estables (2026-04-20)

- Contrato backend/UI alineado 1:1 para filtros y ordenaciones reales de catalogo.
- Query parser de API publica consolidado con soporte real para: `q`, `lat`, `lon`, `radius_m`, `kinds`, `transport`, `district`, `neighborhood`, `open_now`, `accessible`, `wifi`, `with_capacity`, `ser`, `sort`, `limit`.
- `GET /api/public/filters` ampliado con metadatos reales para `availableDistricts`, `availableNeighborhoods`, `availableFeatureFilters`, `availableTransportModes` y `availableSortModes`.
- Politica de cierre de zonas grises aplicada: los filtros no soportados extremo a extremo no se exponen; los que se exponen estan implementados en parser + backend + endpoint + UI.
- Smoke de bloque ejecutado en dominio real (`200`): `/api/public/catalog`, `/api/public/filters`, `/api/public/centers/:slug`.

| Filtro/Capacidad | Contrato | Parser query | Backend real | Endpoint | UI | Estado |
|---|---|---|---|---|---|---|
| accesible | `accessible` | `accessible` | `matchesQuery` por `accessibility` | `/api/public/catalog`, `/api/public/filters` | modal filtros | ok |
| wifi | `withWifi` | `wifi` | `matchesQuery` por `wifi` | `/api/public/catalog`, `/api/public/filters` | modal filtros | ok |
| aforo | `withCapacity` | `with_capacity` | `matchesQuery` por `capacityValue` | `/api/public/catalog`, `/api/public/filters` | modal filtros | ok |
| distrito | `districts` | `district`/`districts` | `matchesQuery` normalizado por `district` | `/api/public/catalog`, `/api/public/filters` + `availableDistricts` | modal filtros | ok |
| barrio | `neighborhoods` | `neighborhood`/`neighborhoods` | `matchesQuery` normalizado por `neighborhood` | `/api/public/catalog`, `/api/public/filters` + `availableNeighborhoods` | modal filtros | ok |
| SER | `withSer` | `ser`/`with_ser` | `matchesQuery` por `serZoneLabel` | `/api/public/catalog`, `/api/public/filters` | modal filtros | ok |
| bici | `transportModes` | `transport=bicimad` | `matchesQuery` por `transportOptions.mode` | `/api/public/catalog`, `/api/public/filters` | modal filtros (Transporte) | ok |
| bus | `transportModes` | `transport=emt_bus` | `matchesQuery` por `transportOptions.mode` | `/api/public/catalog`, `/api/public/filters` | modal filtros (Transporte) | ok |
| metro | `transportModes` | `transport=metro` | `matchesQuery` por `transportOptions.mode` | `/api/public/catalog`, `/api/public/filters` | modal filtros (Transporte) | ok |
| interurbanos/CRTM | `transportModes` | `transport=interurban_bus` | `matchesQuery` por `transportOptions.mode` | `/api/public/catalog`, `/api/public/filters` | modal filtros (Transporte) | ok |
| ordenaciones sostenibles | `sort` | `sort` | `sortItems` (`relevance`,`distance`,`closing`,`capacity`,`name`) | `/api/public/catalog`, `/api/public/filters` + `availableSortModes` | modal filtros (Ordenacion) | ok |

# Reglas de ejecuciÃ³n continua

- Ejecutar bloques en orden estricto.
- No saltar bloques.
- Al terminar un bloque, marcarlo en `ROADMAP.md`.
- Hacer commit limpio al cierre de cada bloque.
- Verificar preview tras cada bloque.
- Continuar automaticamente con el siguiente bloque sin detenerse.
- No tocar produccion hasta llegar al bloque final y pasar todos los checks.
- Si un bloque obliga a reabrir algo anterior, documentarlo y resolverlo sin dejar deuda oculta.

* [x] Bloque 1. Convergencia de base, esquema y verdad de datos

  * [x] Objetivo del bloque
  * [x] Congelar el estado funcional actual de preview como punto de partida operativo y documentar quÃ© endpoints, rutas y datasets sostienen la app.
  * [x] Mantener actualizado el bloque inicial de estado del roadmap: fecha de corte, estado del proyecto, URL de preview, URL de produccion cuando exista y lo que funciona ya de verdad.
  * [x] Alinear el esquema real usado por runtime con migraciones SQL versionadas para que D1 no dependa de creaciÃ³n implÃ­cita desde cÃ³digo.
  * [x] Eliminar o aislar artefactos temporales del repo: `tmp-*`, logs de verificaciÃ³n, capturas redundantes y componentes huÃ©rfanos no usados.
  * [x] Fijar la taxonomÃ­a Ãºnica de procedencia de datos: `realtime`, `official_structured`, `official_text_parsed`, `heuristic`, `not_available`.
  * [x] Reclasificar contratos, flags y payloads para que ningÃºn campo inferido o parseado se presente como estructurado.
  * [x] Separar y documentar quÃ© piezas actuales se conservan, cuÃ¡les se refactorizan y cuÃ¡les se eliminan.
  * [x] Criterio de cierre del bloque
  * [x] El esquema D1 queda alineado con migraciones, la taxonomÃ­a de procedencia queda fijada en contratos y el repo queda limpio de artefactos que generen confusiÃ³n operativa.
  * [x] Riesgos o dependencias si aplica
  * [x] Riesgo de tocar piezas que hoy sostienen preview; resuelto en este bloque sin romper endpoints ni bindings ya operativos.

* [x] Bloque 2. Reingesta y normalizaciÃ³n total de centros

  * [x] Objetivo del bloque
  * [x] Reprocesar bibliotecas y salas de estudio para dejar una entidad canÃ³nica limpia, coherente y visible en producto.
  * [x] Revisar y normalizar nombre, direcciÃ³n, barrio, distrito, telÃ©fono, email, web, coordenadas, tipologÃ­a y exclusiones.
  * [x] Reparar encoding, entidades HTML, separadores, duplicados, slugs estables y claves externas.
  * [x] Reclasificar `wifi`, `accesibilidad`, `aforo`, contacto y notas operativas segÃºn su origen real.
  * [x] Persistir campos crudos de origen y campos normalizados separados para trazabilidad.
  * [x] Persistir rechazos con motivo de descarte para bibliotecas al aire libre, salas no vÃ¡lidas, parques y elementos abiertos.
  * [x] Definir quÃ© campos pueden mostrarse como features visibles y cuÃ¡les deben quedarse fuera de UI por baja calidad o ambigÃ¼edad.
  * [x] Criterio de cierre del bloque
  * [x] Todos los centros publicados en preview salen de una normalizaciÃ³n consistente, sin espacios al aire libre, con slugs estables y con campos visibles clasificados honestamente.
  * [x] Riesgos o dependencias si aplica
  * [x] Dependencia del Bloque 1 resuelta; este bloque ha actualizado conteos y reingesta sin romper preview.

* [x] Bloque 2.5. CorrecciÃ³n estructural inmediata

  * [x] Objetivo del bloque
  * [x] Corregir el modelo persistido de transporte para evitar colisiones en `center_transport_nodes`.
  * [x] Corregir `GET /api/public/filters` para que los conteos se calculen del conjunto real de resultados, no de `payload.items` limitado.
  * [x] Alinear la UI de filtros con los filtros realmente soportados por la API.
  * [x] Eliminar o desactivar visualmente cualquier filtro decorativo o no funcional.
  * [x] Verificar que preview sigue estable tras estas correcciones.
  * [x] Criterio de cierre del bloque
  * [x] El modelo de transporte persistido no produce colisiones de nodos entre centros, los filtros devuelven conteos reales y la UI solo muestra controles funcionales.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende de los Bloques 1 y 2; obliga a limpiar la base de datos y la UI antes de continuar con Horarios y Movilidad.

* [x] Bloque 2.6. CorrecciÃ³n UX pÃºblica previa a fase 3

  * [x] Objetivo del bloque
  * [x] Rehacer la jerarquÃ­a visual de la tarjeta pÃºblica para que la informaciÃ³n crÃ­tica sea legible en una sola vista Ãºtil.
  * [x] Mantener transporte, horario, aforo publicado, estado y CTA en formato compacto y profesional sin inventar datos.
  * [x] Mantener estrellas visibles en UI sin activar todavÃ­a valoraciones reales.
  * [x] Corregir el alcance por distancia para no limitar por defecto la bÃºsqueda a pocos kilÃ³metros cuando hay geolocalizaciÃ³n.
  * [x] Dejar cobertura por defecto de toda la Comunidad de Madrid y radio configurable por usuario.
  * [x] Criterio de cierre del bloque
  * [x] El usuario ve una ficha mÃ¡s clara y densa sin perder informaciÃ³n y el listado no queda recortado por defecto a radio local corto.
  * [x] Riesgos o dependencias si aplica
  * [x] Reabre temporalmente UI pÃºblica del bloque 7 por correcciÃ³n urgente de utilidad, sin alterar contratos de API ni taxonomÃ­a de procedencia.

* [x] Bloque 3. Horarios robustos y revisiÃ³n manual

  * [x] Objetivo del bloque
  * [x] Convertir el parser actual en un sistema de horarios Ãºtil para producto, no solo para MVP tÃ©cnico.
  * [x] Soportar mÃºltiples franjas por dÃ­a, julio y agosto, festivos, horarios de exÃ¡menes, jornadas reducidas, cierres parciales y cierres temporales.
  * [x] Persistir horario semanal, overrides por fecha, cierres completos, campaÃ±as especiales y notas no estructuradas por separado.
  * [x] Mejorar `schedule_confidence`, `needs_manual_review`, `today_summary`, `next_opening`, `next_change_at` y `special_schedule_active`.
  * [x] Crear cola de revisiÃ³n manual para casos ambiguos y modelo de persistencia para correcciones humanas.
  * [x] Definir polÃ­tica de UI para horarios con confianza baja o revisiÃ³n pendiente.
  * [x] Criterio de cierre del bloque
  * [x] Cada centro tiene horario persistente usable, confianza calculada, notas separadas y comportamiento open/close estable sobre casos reales complejos.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 2 y afecta ranking, filtros, detalle y home.

* [x] Bloque 4. Movilidad estructurada de destino y snapshots persistidos

  * [x] Objetivo del bloque
  * [x] Dejar precalculado por centro el grafo mÃ­nimo Ãºtil de movilidad sin consultas absurdas por request.
  * [x] Ingerir y normalizar paradas y lÃ­neas EMT oficiales.
  * [x] Ingerir y normalizar movilidad estructurada Ãºtil de interurbanos y CRTM para metro, cercanÃ­as e interurbanos.
  * [x] Ingerir y normalizar BiciMAD oficial con soporte para enlazar estado y disponibilidad.
  * [x] Ingerir y normalizar SER oficial con cobertura geogrÃ¡fica y resultado binario Ãºtil para producto.
  * [x] Persistir por centro nodos, opciones y relevancia para EMT, interurbano, metro, cercanÃ­as, bici y coche/SER.
  * [x] Calcular walking distance aproximada entre centro y nodos relevantes del destino.
  * [x] Etiquetar cada opciÃ³n con `source_kind`, prioridad de visualizaciÃ³n, TTL y estado activo.
  * [x] Dejar explÃ­cito que EMT, interurbanos/CRTM, metro y cercanÃ­as entran como movilidad estructurada Ãºtil, no como clon de Google Maps.
  * [x] Dejar explÃ­cito que el Ãºnico realtime abierto en esta fase es BiciMAD oficial para bicis disponibles en origen y anclajes disponibles en destino, solo si la fuente es robusta.
  * [x] Criterio de cierre del bloque
  * [x] Todos los centros publicados tienen snapshot de movilidad de destino persistido y trazable, sin recomputaciÃ³n completa por request y sin motor falso tipo Google.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 2 y puede exigir trabajo adicional de licencias, formatos o limpieza de nodos CRTM.

* [x] Bloque 5. ResoluciÃ³n por usuario, cachÃ© y polÃ­tica de movilidad visible

  * [x] Objetivo del bloque
  * [x] Resolver solo la parte variable de origen del usuario contra el subconjunto precalculado del destino, sin N+1 ni saturaciÃ³n.
  * [x] Definir resoluciÃ³n online para ubicaciÃ³n de usuario sobre EMT, interurbanos/CRTM, BiciMAD, SER/coche y nodos estructurados relevantes.
  * [x] Limitar opciones visibles por centro a un mÃ¡ximo estable y ordenado.
  * [x] Implementar cachÃ© por centro y por `center + coarse_user_location` con TTL diferenciados por tipo de dato.
  * [x] Dejar realtime solo para bicis disponibles en origen y anclajes disponibles en destino usando BiciMAD oficial cuando la fuente lo soporte de forma robusta.
  * [x] No abrir mÃ¡s realtime en esta fase salvo justificaciÃ³n tÃ©cnica explÃ­cita y actualizaciÃ³n del roadmap.
  * [x] Prohibir tiempos totales falsos y cualquier simulaciÃ³n tipo Google Maps.
  * [x] Definir polÃ­tica de visibilidad: quÃ© campos se muestran, cuÃ¡les se ocultan y cuÃ¡les se etiquetan como estructurados, texto oficial o heurÃ­stica.
  * [x] Separar comportamiento de home y listado frente a detalle: resumen compacto arriba, resoluciÃ³n enriquecida solo al expandir o entrar en ficha.
  * [x] Criterio de cierre del bloque
  * [x] El bloque â€œCÃ³mo llegarâ€ devuelve opciones ricas pero honestas, con cachÃ© estable, sin fan-out externo absurdo y sin motor falso tipo Google.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 4; el principal riesgo es mezclar texto parseado y transporte estructurado en la misma jerarquÃ­a visual.

* [x] Bloque 6. API pÃºblica final y contratos estables

  * [x] Objetivo del bloque
  * [x] Cerrar la API pÃºblica con contratos finales para catÃ¡logo, detalle, filtros y bootstrap.
  * [x] Consolidar `GET /api/public/catalog` con filtros reales, ordenaciÃ³n Ãºtil, resumen compacto de movilidad y ranking explicable.
  * [x] Consolidar `GET /api/public/centers/:slug` con identidad, horario estructurado, flags de calidad, movilidad expandida y datos operativos reales.
  * [x] Consolidar `GET /api/public/filters` con solo filtros realmente soportados por API y contador real de resultados.
  * [x] Exponer bÃºsqueda, cerca de mÃ­, distancia mÃ¡xima, tipo, abierto ahora, accesible, wifi, aforo, distrito, barrio, SER, bici, bus, metro e interurbanos/CRTM.
  * [x] Exponer ordenaciÃ³n final: relevancia, distancia, cierre, aforo y las que queden realmente sostenibles.
  * [x] AÃ±adir headers de cachÃ©, validaciÃ³n de query params, flags de visibilidad y metadatos de procedencia sin inflar payload.
  * [x] Criterio de cierre del bloque
  * [x] La API pÃºblica cubre por completo home, listado, detalle y filtros sin vender precisiÃ³n falsa y sin depender de payloads ambiguos.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende de los Bloques 3, 4 y 5; cierre ejecutado sin reabrir infraestructura de dominio.

  * [x] Bloque 7. UI pÃºblica final, compactaciÃ³n y fidelidad v0

  * [x] Objetivo del bloque
  * [x] Cerrar la app pÃºblica con fidelidad alta a la referencia y una jerarquÃ­a de producto coherente.
  * [x] Rehacer home para que hero, mÃ©tricas, CTAs y top opciones respondan exactamente al producto objetivo.
  * [x] Rehacer listado para que sea compacto, filtrable, claro y sin tarjetas gigantes ni bloques redundantes.
  * [x] Rehacer detalle para dejar de duplicar la `LibraryCard` y pasar a una composiciÃ³n especÃ­fica de ficha.
  * [x] RediseÃ±ar `LibraryCard`, `FiltersPanel` y bloque "CÃ³mo llegar" con densidad, escala, spacing y composiciÃ³n fieles.
  * [x] Ajustar el modal de filtros para que no muestre tabs o controles que no tengan efecto real.
  * [x] Dejar dark mode completo y consistente en home, listado, detalle, cards, transporte, filtros, inputs y CTAs.
  * [x] Dejar la UI preparada para ratings, estados vacÃ­os y CTA de `Opinar`, pero sin activar todavÃ­a la lÃ³gica real de valoraciÃ³n.
  * [x] Validar responsive real en mÃ³vil y escritorio con capturas comparables.
  * [x] Criterio de cierre del bloque
  * [x] La UI pÃºblica queda compacta, profesional, sin duplicidades, con dark mode correcto, con distancia visual baja respecto a `v0` y preparada para activar ratings sin rehacer la interfaz.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 6; no debe maquillarse la UI con datos no disponibles ni mantener componentes gigantes por comodidad.

* [ ] Bloque 8. Valoraciones con Google mÃ­nima y sin red social

  * [ ] Objetivo del bloque
  * [ ] Activar la funcionalidad real de valoraciones con fricciÃ³n baja y sin convertir la app en un sistema de cuentas completo.
  * [ ] Integrar autenticaciÃ³n mÃ­nima con Google Identity Services u OIDC ligero solo para verificar que el usuario es real y permitir votar dentro de nuestra app.
  * [ ] Definir modelo de voto con una nota global de 1 a 5 por centro como v1.
  * [ ] Guardar identidad mÃ­nima seudonimizada, cooldown, seÃ±ales antifraude y trazabilidad bÃ¡sica.
  * [ ] Reutilizar el botÃ³n `Opinar` y los estados visuales ya preparados en UI sin rehacer el frontend pÃºblico.
  * [ ] Calcular agregados visibles, contadores y estados vacÃ­os honestos cuando no haya votos suficientes.
  * [ ] Definir polÃ­tica de ediciÃ³n, duplicado y revoto por usuario.
  * [ ] No integrar reseÃ±as externas de Google ni crear un sistema de cuenta general de usuario.
  * [ ] Criterio de cierre del bloque
  * [ ] El usuario puede dejar valoraciÃ³n global real con Google mÃ­nima, sin perfil pÃºblico ni sistema de cuentas pesado, y la UI refleja agregados fiables.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende del Bloque 7; no se abren subratings en esta versiÃ³n.

* [ ] Bloque 9. Super admin mÃ­nimo operativo

  * [ ] Objetivo del bloque
  * [ ] Crear primero el panel global mÃ­nimo necesario para operar la app sin tocar la base a mano.
  * [ ] Implementar gestiÃ³n global de centros, fuentes, refrescos de ingesta y estado de salud.
  * [ ] Implementar cola de anomalÃ­as de datos y cola de revisiÃ³n manual del parser.
  * [ ] Implementar gestiÃ³n global de incidencias, eventos y moderaciÃ³n mÃ­nima de valoraciones.
  * [ ] Implementar gestiÃ³n de admins de bibliotecas.
  * [ ] Implementar auditorÃ­a de cambios y parÃ¡metros operativos bÃ¡sicos.
  * [ ] Asegurar que el panel solo edita aquello que el sistema debe gobernar centralmente.
  * [ ] Criterio de cierre del bloque
  * [ ] Existe control global suficiente para revisar datos, refrescar fuentes, moderar valoraciones y operar el sistema desde una UI segura.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende de los Bloques 2, 3, 4, 6 y 8; no debe mezclarse con el admin de bibliotecas en el mismo bloque.

* [ ] Bloque 10. Admin de bibliotecas y centros

  * [ ] Objetivo del bloque
  * [ ] Crear despuÃ©s del super admin el panel de centro con acceso corporativo y permisos limitados a datos operativos.
  * [ ] Implementar activaciÃ³n por email corporativo, set de contraseÃ±a inicial y reset.
  * [ ] Implementar login y sesiÃ³n segura para admin de centro.
  * [ ] Implementar ediciÃ³n de horario normalizado, horarios especiales, incidencias, eventos y contacto operativo permitido.
  * [ ] Implementar preview pÃºblica de ficha y trazabilidad de cambios por actor.
  * [ ] Separar con claridad lo editable por centro de lo exclusivo del super admin o del sistema.
  * [ ] Criterio de cierre del bloque
  * [ ] Un centro puede gestionar su operativa bÃ¡sica desde una UI segura, trazable y acotada sin invadir el gobierno global del sistema.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende del Bloque 9 y del proveedor final de email transaccional para activaciÃ³n y reset.

* [ ] Bloque 11. Hardening, observabilidad y calidad final

  * [ ] Objetivo del bloque
  * [ ] Endurecer la app antes de producciÃ³n con pruebas, lÃ­mites, observabilidad y validaciÃ³n visual final.
  * [ ] AÃ±adir tests unitarios de horarios, normalizaciÃ³n, ranking, filtros y clasificaciÃ³n de procedencia.
  * [ ] AÃ±adir tests de contrato para API pÃºblica.
  * [ ] AÃ±adir E2E de home, listado, detalle, filtros, rating y flujos admin crÃ­ticos.
  * [ ] Implementar rate limiting, timeouts sensatos, retries controlados y deduplicaciÃ³n donde aplique.
  * [ ] AÃ±adir correlaciÃ³n de logs, errores tipados, CSP, saneamiento de texto y revisiÃ³n de seguridad bÃ¡sica.
  * [ ] Verificar rendimiento de movilidad y ausencia de N+1 o fan-out excesivo.
  * [ ] Verificar dark mode, consistencia visual final, responsive y ausencia de mezclas de estilos entre claro y oscuro.
  * [ ] Criterio de cierre del bloque
  * [ ] La app queda protegida frente a regresiones obvias, errores silenciosos, degradaciones de rendimiento y desajustes visuales antes de pasar a producciÃ³n.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende de la estabilizaciÃ³n previa de contratos, UI y paneles; testear demasiado pronto generarÃ­a rehacer pruebas continuamente.

* [ ] Bloque 12. ProducciÃ³n, dominio y operaciÃ³n final

  * [x] Subbloque 12.0. ConsolidaciÃ³n Cloudflare previa al corte
  * [x] Inventariar Worker/rutas activos en `alabiblio.org` y aislar runtime ajeno al preview validado.
  * [x] Crear Worker de producciÃ³n dedicado `alabiblio-prod` y mantener `alabiblio-preview` como contingencia.
  * [x] Crear D1 de producciÃ³n convergente `alabiblio-prod` y aplicar migraciones actuales del repositorio.
  * [x] Ejecutar ingesta/regeneraciÃ³n completa de datos y snapshots en `alabiblio-prod`.
  * [x] Validar endpoints de producciÃ³n en workers.dev antes de cortar dominio.
  * [x] Conmutar `alabiblio.org` al Worker correcto y ejecutar smoke tests de dominio final.
  * [x] Retirar recursos D1 obsoletos de Alabiblio (`alabiblio-local-db`, `alabiblio-staging-db`, y `alabiblio-production-db` no convergente) tras validaciÃ³n de datos.
  * [x] Documentar rollback operativo de dominio y datos.

  * [ ] Objetivo del bloque
  * [ ] Cerrar el salto de preview a producciÃ³n sin improvisaciÃ³n y dejar la app lista en `alabiblio.org`.
  * [x] Separar completamente entornos preview y producciÃ³n con D1, bindings y variables de entorno propios.
  * [ ] Preparar migraciones por entorno, seeds iniciales y checklist final de despliegue/operaciÃ³n.
  * [x] Configurar dominio `alabiblio.org`, rutas, cachÃ© y estrategia de rollback.
  * [ ] Documentar refresco de fuentes, runbook fino de operaciÃ³n, proveedor final de email y requisitos de atribuciÃ³n/licencias.
  * [x] Ejecutar verificaciÃ³n final de `/`, `/listado`, `/centros/:slug`, `/api/public/catalog`, `/api/public/filters` y `/api/public/centers/:slug` en producciÃ³n.
  * [x] Ejecutar verificaciÃ³n final tambiÃ©n sobre el dominio real `alabiblio.org` y no solo sobre endpoints tÃ©cnicos.
  * [ ] Promover a producciÃ³n solo si todos los checks de preview, hardening, smoke test y validaciÃ³n visual estÃ¡n superados.
  * [ ] Criterio de cierre del bloque
  * [ ] ProducciÃ³n queda desplegada, verificada, operable y separada de preview, con documentaciÃ³n mÃ­nima suficiente para mantenimiento.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Pendiente de cierre formal integral de operaciÃ³n final tras completar hardening (Bloque 11) y documentaciÃ³n operativa/licencias.
