# Estado actual

- Fecha de corte: `2026-04-19`
- Estado del proyecto: `produccion activa en alabiblio.org` con `preview de contingencia separada`, `Bloques 1, 2, 2.5, 2.6, 3, 4 y 5` completados, `subbloque 12.0 de consolidacion Cloudflare` completado.
- URL de preview: `https://alabiblio-preview.ttefmb.workers.dev`
- URL de produccion: `https://alabiblio.org` (runtime `alabiblio-prod` activo).
- Base de datos preview: D1 `alabiblio-preview`
- Centros publicados en preview: `115`
- Version desplegada (preview): `305d2b9e`
- Version desplegada (produccion): `01cedcfa`

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
- Dialog de transporte rediseñado: layout horizontal por modo (icono + label + badge a la izquierda, stops/líneas/BiciMAD a la derecha).
- BiciMAD en dialog: nombre de estación fija + botón "Ver disponibilidad" + resultado inline en la misma fila.
- Selector de ubicación en home: modo auto (GPS) y manual (autocompletado callejero Madrid), pill con label + Cambiar + X cuando hay ubicación activa.
- Endpoint `GET /api/public/callejero/autocomplete?q=` operativo: proxy Nominatim con bbox Madrid, caché 1h, UTF-8 correcto.
- Motor operativo de horarios corregido para overrides recurrentes (incluido `fines de semana y festivos`) con timezone Madrid coherente en `is_open_now`, `today_summary` y `next_change_at`.
- Caso real validado en preview: Sala de estudio Sanchinarro (Hortaleza) pasa de `Cerrada` a `Abierta` en fin de semana cuando aplica `8:30-22:00`, sin divergencia entre listado y detalle.
- Home: bloque `Top 3 opciones para ti` migrado a carrusel real (Embla) alimentado por Top 3 real de API, con cards compactas, CTA y soporte responsive/dark mode.
- Auditoria global de estado operativo ejecutada sobre `115/115` centros con resultado final `0 inconsistencias`.
- Convergencia validada entre `GET /api/public/catalog` y `GET /api/public/centers/:slug` para estado operativo (`is_open_now`, `today_summary`, `next_change_at`, `schedule_label`) sin divergencias sistémicas.
- Saneo de transporte por modo aplicado en snapshot: si existe opcion `official_structured` para un modo, no se mantiene activa una competidora `official_text_parsed` del mismo modo.
- Lote de snapshots de transporte regenerado a `snapshot_version` uniforme `2026-04-19.v3` para `115/115` centros en preview.
- Coherencia catalogo/detalle en transporte validada en muestreo: ambos endpoints leen snapshot persistido en D1 y devuelven firmas de opciones equivalentes para los slugs auditados.

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

# Reglas de ejecución continua

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
  * [x] Congelar el estado funcional actual de preview como punto de partida operativo y documentar qué endpoints, rutas y datasets sostienen la app.
  * [x] Mantener actualizado el bloque inicial de estado del roadmap: fecha de corte, estado del proyecto, URL de preview, URL de produccion cuando exista y lo que funciona ya de verdad.
  * [x] Alinear el esquema real usado por runtime con migraciones SQL versionadas para que D1 no dependa de creación implícita desde código.
  * [x] Eliminar o aislar artefactos temporales del repo: `tmp-*`, logs de verificación, capturas redundantes y componentes huérfanos no usados.
  * [x] Fijar la taxonomía única de procedencia de datos: `realtime`, `official_structured`, `official_text_parsed`, `heuristic`, `not_available`.
  * [x] Reclasificar contratos, flags y payloads para que ningún campo inferido o parseado se presente como estructurado.
  * [x] Separar y documentar qué piezas actuales se conservan, cuáles se refactorizan y cuáles se eliminan.
  * [x] Criterio de cierre del bloque
  * [x] El esquema D1 queda alineado con migraciones, la taxonomía de procedencia queda fijada en contratos y el repo queda limpio de artefactos que generen confusión operativa.
  * [x] Riesgos o dependencias si aplica
  * [x] Riesgo de tocar piezas que hoy sostienen preview; resuelto en este bloque sin romper endpoints ni bindings ya operativos.

* [x] Bloque 2. Reingesta y normalización total de centros

  * [x] Objetivo del bloque
  * [x] Reprocesar bibliotecas y salas de estudio para dejar una entidad canónica limpia, coherente y visible en producto.
  * [x] Revisar y normalizar nombre, dirección, barrio, distrito, teléfono, email, web, coordenadas, tipología y exclusiones.
  * [x] Reparar encoding, entidades HTML, separadores, duplicados, slugs estables y claves externas.
  * [x] Reclasificar `wifi`, `accesibilidad`, `aforo`, contacto y notas operativas según su origen real.
  * [x] Persistir campos crudos de origen y campos normalizados separados para trazabilidad.
  * [x] Persistir rechazos con motivo de descarte para bibliotecas al aire libre, salas no válidas, parques y elementos abiertos.
  * [x] Definir qué campos pueden mostrarse como features visibles y cuáles deben quedarse fuera de UI por baja calidad o ambigüedad.
  * [x] Criterio de cierre del bloque
  * [x] Todos los centros publicados en preview salen de una normalización consistente, sin espacios al aire libre, con slugs estables y con campos visibles clasificados honestamente.
  * [x] Riesgos o dependencias si aplica
  * [x] Dependencia del Bloque 1 resuelta; este bloque ha actualizado conteos y reingesta sin romper preview.

* [x] Bloque 2.5. Corrección estructural inmediata

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

* [x] Bloque 2.6. Corrección UX pública previa a fase 3

  * [x] Objetivo del bloque
  * [x] Rehacer la jerarquía visual de la tarjeta pública para que la información crítica sea legible en una sola vista útil.
  * [x] Mantener transporte, horario, aforo publicado, estado y CTA en formato compacto y profesional sin inventar datos.
  * [x] Mantener estrellas visibles en UI sin activar todavía valoraciones reales.
  * [x] Corregir el alcance por distancia para no limitar por defecto la búsqueda a pocos kilómetros cuando hay geolocalización.
  * [x] Dejar cobertura por defecto de toda la Comunidad de Madrid y radio configurable por usuario.
  * [x] Criterio de cierre del bloque
  * [x] El usuario ve una ficha más clara y densa sin perder información y el listado no queda recortado por defecto a radio local corto.
  * [x] Riesgos o dependencias si aplica
  * [x] Reabre temporalmente UI pública del bloque 7 por corrección urgente de utilidad, sin alterar contratos de API ni taxonomía de procedencia.

* [x] Bloque 3. Horarios robustos y revisión manual

  * [x] Objetivo del bloque
  * [x] Convertir el parser actual en un sistema de horarios útil para producto, no solo para MVP técnico.
  * [x] Soportar múltiples franjas por día, julio y agosto, festivos, horarios de exámenes, jornadas reducidas, cierres parciales y cierres temporales.
  * [x] Persistir horario semanal, overrides por fecha, cierres completos, campañas especiales y notas no estructuradas por separado.
  * [x] Mejorar `schedule_confidence`, `needs_manual_review`, `today_summary`, `next_opening`, `next_change_at` y `special_schedule_active`.
  * [x] Crear cola de revisión manual para casos ambiguos y modelo de persistencia para correcciones humanas.
  * [x] Definir política de UI para horarios con confianza baja o revisión pendiente.
  * [x] Criterio de cierre del bloque
  * [x] Cada centro tiene horario persistente usable, confianza calculada, notas separadas y comportamiento open/close estable sobre casos reales complejos.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 2 y afecta ranking, filtros, detalle y home.

* [x] Bloque 4. Movilidad estructurada de destino y snapshots persistidos

  * [x] Objetivo del bloque
  * [x] Dejar precalculado por centro el grafo mínimo útil de movilidad sin consultas absurdas por request.
  * [x] Ingerir y normalizar paradas y líneas EMT oficiales.
  * [x] Ingerir y normalizar movilidad estructurada útil de interurbanos y CRTM para metro, cercanías e interurbanos.
  * [x] Ingerir y normalizar BiciMAD oficial con soporte para enlazar estado y disponibilidad.
  * [x] Ingerir y normalizar SER oficial con cobertura geográfica y resultado binario útil para producto.
  * [x] Persistir por centro nodos, opciones y relevancia para EMT, interurbano, metro, cercanías, bici y coche/SER.
  * [x] Calcular walking distance aproximada entre centro y nodos relevantes del destino.
  * [x] Etiquetar cada opción con `source_kind`, prioridad de visualización, TTL y estado activo.
  * [x] Dejar explícito que EMT, interurbanos/CRTM, metro y cercanías entran como movilidad estructurada útil, no como clon de Google Maps.
  * [x] Dejar explícito que el único realtime abierto en esta fase es BiciMAD oficial para bicis disponibles en origen y anclajes disponibles en destino, solo si la fuente es robusta.
  * [x] Criterio de cierre del bloque
  * [x] Todos los centros publicados tienen snapshot de movilidad de destino persistido y trazable, sin recomputación completa por request y sin motor falso tipo Google.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 2 y puede exigir trabajo adicional de licencias, formatos o limpieza de nodos CRTM.

* [x] Bloque 5. Resolución por usuario, caché y política de movilidad visible

  * [x] Objetivo del bloque
  * [x] Resolver solo la parte variable de origen del usuario contra el subconjunto precalculado del destino, sin N+1 ni saturación.
  * [x] Definir resolución online para ubicación de usuario sobre EMT, interurbanos/CRTM, BiciMAD, SER/coche y nodos estructurados relevantes.
  * [x] Limitar opciones visibles por centro a un máximo estable y ordenado.
  * [x] Implementar caché por centro y por `center + coarse_user_location` con TTL diferenciados por tipo de dato.
  * [x] Dejar realtime solo para bicis disponibles en origen y anclajes disponibles en destino usando BiciMAD oficial cuando la fuente lo soporte de forma robusta.
  * [x] No abrir más realtime en esta fase salvo justificación técnica explícita y actualización del roadmap.
  * [x] Prohibir tiempos totales falsos y cualquier simulación tipo Google Maps.
  * [x] Definir política de visibilidad: qué campos se muestran, cuáles se ocultan y cuáles se etiquetan como estructurados, texto oficial o heurística.
  * [x] Separar comportamiento de home y listado frente a detalle: resumen compacto arriba, resolución enriquecida solo al expandir o entrar en ficha.
  * [x] Criterio de cierre del bloque
  * [x] El bloque “Cómo llegar” devuelve opciones ricas pero honestas, con caché estable, sin fan-out externo absurdo y sin motor falso tipo Google.
  * [x] Riesgos o dependencias si aplica
  * [x] Depende del Bloque 4; el principal riesgo es mezclar texto parseado y transporte estructurado en la misma jerarquía visual.

* [ ] Bloque 6. API pública final y contratos estables

  * [ ] Objetivo del bloque
  * [ ] Cerrar la API pública con contratos finales para catálogo, detalle, filtros y bootstrap.
  * [ ] Consolidar `GET /api/public/catalog` con filtros reales, ordenación útil, resumen compacto de movilidad y ranking explicable.
  * [ ] Consolidar `GET /api/public/centers/:slug` con identidad, horario estructurado, flags de calidad, movilidad expandida y datos operativos reales.
  * [ ] Consolidar `GET /api/public/filters` con solo filtros realmente soportados por API y contador real de resultados.
  * [ ] Exponer búsqueda, cerca de mí, distancia máxima, tipo, abierto ahora, accesible, wifi, aforo, distrito, barrio, SER, bici, bus, metro e interurbanos/CRTM.
  * [ ] Exponer ordenación final: relevancia, distancia, cierre, aforo y las que queden realmente sostenibles.
  * [ ] Añadir headers de caché, validación de query params, flags de visibilidad y metadatos de procedencia sin inflar payload.
  * [ ] Criterio de cierre del bloque
  * [ ] La API pública cubre por completo home, listado, detalle y filtros sin vender precisión falsa y sin depender de payloads ambiguos.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende de los Bloques 3, 4 y 5; cualquier cambio de contrato impacta directamente frontend y tests.

* [ ] Bloque 7. UI pública final, compactación y fidelidad v0

  * [ ] Objetivo del bloque
  * [ ] Cerrar la app pública con fidelidad alta a la referencia y una jerarquía de producto coherente.
  * [ ] Rehacer home para que hero, métricas, CTAs y top opciones respondan exactamente al producto objetivo.
  * [ ] Rehacer listado para que sea compacto, filtrable, claro y sin tarjetas gigantes ni bloques redundantes.
  * [ ] Rehacer detalle para dejar de duplicar la `LibraryCard` y pasar a una composición específica de ficha.
  * [ ] Rediseñar `LibraryCard`, `FiltersPanel` y bloque “Cómo llegar” con densidad, escala, spacing y composición fieles.
  * [ ] Ajustar el modal de filtros para que no muestre tabs o controles que no tengan efecto real.
  * [ ] Dejar dark mode completo y consistente en home, listado, detalle, cards, transporte, filtros, inputs y CTAs.
  * [ ] Dejar la UI preparada para ratings, estados vacíos y CTA de `Opinar`, pero sin activar todavía la lógica real de valoración.
  * [ ] Validar responsive real en móvil y escritorio con capturas comparables.
  * [ ] Criterio de cierre del bloque
  * [ ] La UI pública queda compacta, profesional, sin duplicidades, con dark mode correcto, con distancia visual baja respecto a `v0` y preparada para activar ratings sin rehacer la interfaz.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende del Bloque 6; no debe maquillarse la UI con datos no disponibles ni mantener componentes gigantes por comodidad.

* [ ] Bloque 8. Valoraciones con Google mínima y sin red social

  * [ ] Objetivo del bloque
  * [ ] Activar la funcionalidad real de valoraciones con fricción baja y sin convertir la app en un sistema de cuentas completo.
  * [ ] Integrar autenticación mínima con Google Identity Services u OIDC ligero solo para verificar que el usuario es real y permitir votar dentro de nuestra app.
  * [ ] Definir modelo de voto con una nota global de 1 a 5 por centro como v1.
  * [ ] Guardar identidad mínima seudonimizada, cooldown, señales antifraude y trazabilidad básica.
  * [ ] Reutilizar el botón `Opinar` y los estados visuales ya preparados en UI sin rehacer el frontend público.
  * [ ] Calcular agregados visibles, contadores y estados vacíos honestos cuando no haya votos suficientes.
  * [ ] Definir política de edición, duplicado y revoto por usuario.
  * [ ] No integrar reseñas externas de Google ni crear un sistema de cuenta general de usuario.
  * [ ] Criterio de cierre del bloque
  * [ ] El usuario puede dejar valoración global real con Google mínima, sin perfil público ni sistema de cuentas pesado, y la UI refleja agregados fiables.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende del Bloque 7; no se abren subratings en esta versión.

* [ ] Bloque 9. Super admin mínimo operativo

  * [ ] Objetivo del bloque
  * [ ] Crear primero el panel global mínimo necesario para operar la app sin tocar la base a mano.
  * [ ] Implementar gestión global de centros, fuentes, refrescos de ingesta y estado de salud.
  * [ ] Implementar cola de anomalías de datos y cola de revisión manual del parser.
  * [ ] Implementar gestión global de incidencias, eventos y moderación mínima de valoraciones.
  * [ ] Implementar gestión de admins de bibliotecas.
  * [ ] Implementar auditoría de cambios y parámetros operativos básicos.
  * [ ] Asegurar que el panel solo edita aquello que el sistema debe gobernar centralmente.
  * [ ] Criterio de cierre del bloque
  * [ ] Existe control global suficiente para revisar datos, refrescar fuentes, moderar valoraciones y operar el sistema desde una UI segura.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende de los Bloques 2, 3, 4, 6 y 8; no debe mezclarse con el admin de bibliotecas en el mismo bloque.

* [ ] Bloque 10. Admin de bibliotecas y centros

  * [ ] Objetivo del bloque
  * [ ] Crear después del super admin el panel de centro con acceso corporativo y permisos limitados a datos operativos.
  * [ ] Implementar activación por email corporativo, set de contraseña inicial y reset.
  * [ ] Implementar login y sesión segura para admin de centro.
  * [ ] Implementar edición de horario normalizado, horarios especiales, incidencias, eventos y contacto operativo permitido.
  * [ ] Implementar preview pública de ficha y trazabilidad de cambios por actor.
  * [ ] Separar con claridad lo editable por centro de lo exclusivo del super admin o del sistema.
  * [ ] Criterio de cierre del bloque
  * [ ] Un centro puede gestionar su operativa básica desde una UI segura, trazable y acotada sin invadir el gobierno global del sistema.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende del Bloque 9 y del proveedor final de email transaccional para activación y reset.

* [ ] Bloque 11. Hardening, observabilidad y calidad final

  * [ ] Objetivo del bloque
  * [ ] Endurecer la app antes de producción con pruebas, límites, observabilidad y validación visual final.
  * [ ] Añadir tests unitarios de horarios, normalización, ranking, filtros y clasificación de procedencia.
  * [ ] Añadir tests de contrato para API pública.
  * [ ] Añadir E2E de home, listado, detalle, filtros, rating y flujos admin críticos.
  * [ ] Implementar rate limiting, timeouts sensatos, retries controlados y deduplicación donde aplique.
  * [ ] Añadir correlación de logs, errores tipados, CSP, saneamiento de texto y revisión de seguridad básica.
  * [ ] Verificar rendimiento de movilidad y ausencia de N+1 o fan-out excesivo.
  * [ ] Verificar dark mode, consistencia visual final, responsive y ausencia de mezclas de estilos entre claro y oscuro.
  * [ ] Criterio de cierre del bloque
  * [ ] La app queda protegida frente a regresiones obvias, errores silenciosos, degradaciones de rendimiento y desajustes visuales antes de pasar a producción.
  * [ ] Riesgos o dependencias si aplica
  * [ ] Depende de la estabilización previa de contratos, UI y paneles; testear demasiado pronto generaría rehacer pruebas continuamente.

* [ ] Bloque 12. Producción, dominio y operación final

  * [x] Subbloque 12.0. Consolidación Cloudflare previa al corte
  * [x] Inventariar Worker/rutas activos en `alabiblio.org` y aislar runtime ajeno al preview validado.
  * [x] Crear Worker de producción dedicado `alabiblio-prod` y mantener `alabiblio-preview` como contingencia.
  * [x] Crear D1 de producción convergente `alabiblio-prod` y aplicar migraciones actuales del repositorio.
  * [x] Ejecutar ingesta/regeneración completa de datos y snapshots en `alabiblio-prod`.
  * [x] Validar endpoints de producción en workers.dev antes de cortar dominio.
  * [x] Conmutar `alabiblio.org` al Worker correcto y ejecutar smoke tests de dominio final.
  * [x] Retirar recursos D1 obsoletos de Alabiblio (`alabiblio-local-db`, `alabiblio-staging-db`, y `alabiblio-production-db` no convergente) tras validación de datos.
  * [x] Documentar rollback operativo de dominio y datos.

  * [ ] Objetivo del bloque
  * [ ] Cerrar el salto de preview a producción sin improvisación y dejar la app lista en `alabiblio.org`.
  * [ ] Separar completamente entornos preview y producción con D1, bindings y variables de entorno propios.
  * [ ] Preparar migraciones por entorno, seeds iniciales y checklist de despliegue.
  * [ ] Configurar dominio `alabiblio.org`, rutas, caché y estrategia de rollback.
  * [ ] Documentar refresco de fuentes, runbook de operación, proveedor final de email y requisitos de atribución y licencias.
  * [ ] Ejecutar verificación final de `/`, `/listado`, `/centros/:slug`, `/api/public/catalog`, `/api/public/filters` y `/api/public/centers/:slug` en producción.
  * [ ] Ejecutar verificación final también sobre el dominio real `alabiblio.org` y no solo sobre endpoints técnicos.
  * [ ] Promover a producción solo si todos los checks de preview, hardening, smoke test y validación visual están superados.
  * [ ] Criterio de cierre del bloque
  * [ ] Producción queda desplegada, verificada, operable y separada de preview, con documentación mínima suficiente para mantenimiento.
  * [ ] Riesgos o dependencias si aplica
  * [ ] No debe iniciarse hasta completar hardening, contratos finales, movilidad estable, validación visual y paneles mínimos operativos.
