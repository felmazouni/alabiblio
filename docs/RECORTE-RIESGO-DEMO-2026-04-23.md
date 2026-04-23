# RECORTE RIESGO DEMO 2026-04-23

## Resumen
Se ha aplicado un recorte de riesgo centrado en honestidad funcional, robustez mínima y ratings defendibles sin ocultar la feature. El trabajo deja corregidos varios puntos estructurales en repo y alinea preview con producción en los datos visibles de ratings.

Estado actual tras este pase:
- `typecheck` limpio.
- `test` limpio.
- `build` limpio.
- Preview y producción devuelven ya los mismos ratings públicos para los dos centros con votos.
- No se ha desplegado este código todavía; por tanto, varias mejoras del repo no están aún reflejadas en los runtimes remotos.

## Cambios aplicados

### 1. Ratings endurecidos sin ocultarlos
- Se han añadido metadatos explícitos de ratings en contratos:
  - `ratingSource`
  - `ratingSourceLabel`
  - `ratingSampleState`
  - `ratingSampleLabel`
- Se ha formalizado la semántica de muestra:
  - `initial` para muestras iniciales
  - `limited` para muestras todavía pequeñas
  - `established` para muestra suficiente
- Se ha corregido la taxonomía:
  - `ratingOrigin` deja de tratarse como `official_structured`
  - pasa a clasificarse como `heuristic` cuando existen votos
  - `not_available` cuando no hay votos
- Se ha reforzado la honestidad visible en UI:
  - listado y detalle muestran que son `Valoraciones internas de AlaBiblio`
  - se añade etiqueta de muestra (`Muestra inicial`, `Muestra limitada`, etc.)
  - el CTA pasa de `Valorar con Google` a `Valorar en AlaBiblio`
  - el modal aclara que Google solo se usa para verificar identidad y no para importar reseñas
- Se ha reducido persistencia innecesaria del token de Google en cliente:
  - se migra de `localStorage` a `sessionStorage`

### 2. Consistencia ratings preview / producción
- Se ha eliminado el seed falso de preview.
- Se han insertado en preview los dos votos reales hoy presentes en producción:
  - `study_rooms:1958`
  - `study_rooms:4815493`
- Se han recalculado `rating_average` y `rating_count` en preview para esos centros.
- Verificación runtime 2026-04-23:
  - producción y preview devuelven `2.7 / 1` para San Juan Bautista
  - producción y preview devuelven `2.3 / 1` para Pilares

### 3. Consistencia catálogo / detalle / endpoint de ratings
- La infraestructura ahora calcula `rating_average` y `rating_count` desde `center_attribute_votes` al leer centros, en lugar de confiar ciegamente en el resumen persistido en `centers`.
- Se preservan los votos existentes al rehacer catálogo:
  - `replaceCatalog()` ya no implica perder ratings por borrar y recrear centros
  - se hace backup y restauración controlada de `center_attribute_votes`

### 4. Filtros de horario desactivados
- Se han retirado `Días` y `Franja horaria` de la UI.
- Se ha eliminado el filtrado cliente asociado en listado.
- La URL deja de reescribir esos parámetros como filtros activos.
- Se mantiene `Abierta ahora`, que sí está soportado extremo a extremo.

### 5. Distancia y ordenación más honestas
- `distanceOrigin` pasa a `heuristic`.
- La UI muestra `Aprox.` en la distancia cuando procede.
- El backend normaliza `sort=distance` a `relevance` si no hay ubicación real.
- El endpoint de filtros deja de ofrecer `Distancia` como ordenación disponible cuando no hay ubicación.

### 6. Transporte alineado con lo que la UI enseña
- `car` deja de ser modo filtrable público.
- Los filtros de transporte cuentan y filtran solo modos realmente visibles al usuario:
  - sin `car`
  - y dentro del umbral visible actual de `<= 500 m`

### 7. Regeneración de snapshots endurecida
- `replaceTransportSnapshots()` ya no borra primero y reza después.
- Ahora carga datasets, valida mínimos y aborta la regeneración si una fuente crítica llega vacía.
- Con esto se evita degradación silenciosa masiva por `[]` en fuentes críticas.

### 8. Parser textual de transporte corregido
- Se ha corregido el caso real de Montecarmelo:
  - ya no debe convertir `20 minutos a pie` en una falsa línea `L20`
- Se han añadido tests específicos para este fallo.

### 9. Health mínimo real en código
- `/api/health` en repo deja de ser un `ok` estático.
- Ahora consulta:
  - presencia de DB
  - número de centros
  - número de snapshots
  - número de votos
  - freshness de `transport_source_runs`
- Devuelve `ok` o `degraded` según estado real mínimo.

### 10. Bootstrap público corregido
- `ratings` deja de figurar como módulo pendiente en `/api/public/bootstrap`.

## Archivos tocados
- `apps/web/src/components/FiltersPanel.tsx`
- `apps/web/src/components/LibraryCard.tsx`
- `apps/web/src/lib/publicCatalog.ts`
- `apps/web/src/routes/CenterDetailRoute.tsx`
- `apps/web/src/routes/HomeRoute.tsx`
- `apps/web/src/routes/PublicCatalogRoute.tsx`
- `package.json`
- `pnpm-lock.yaml`
- `packages/contracts/src/index.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/ratings.ts`
- `packages/domain/src/ratings.test.ts`
- `packages/domain/src/transport.ts`
- `packages/domain/src/transport.test.ts`
- `packages/infrastructure/src/catalogStore.ts`
- `packages/infrastructure/src/ratingsStore.ts`
- `workers/edge/src/http/app.ts`
- `workers/edge/src/http/query.ts`
- `workers/edge/src/http/routes/health.ts`
- `workers/edge/src/http/routes/public.ts`
- `workers/edge/src/http/routes/publicRatings.ts`
- `workers/edge/wrangler.jsonc`

## Riesgos mitigados
- Ratings ya no se presentan semánticamente como dato oficial.
- Preview deja de enseñar ratings inventados o divergentes respecto a producción.
- Catálogo, detalle y endpoint de ratings quedan más consistentes.
- Los filtros de horario incorrectos dejan de inducir error.
- La ordenación por distancia sin ubicación deja de sobreprometer.
- El filtro de transporte deja de prometer modos que luego la UI oculta.
- La regeneración de snapshots deja de poder vaciar transporte de forma silenciosa por fuente caída.
- El parser textual elimina un falso positivo ya observado en producción.

## Riesgos abiertos
- No se ha desplegado este cambio todavía.
  - Consecuencia:
    - producción sigue respondiendo con el `/api/health` antiguo
    - preview sigue devolviendo `enabled=false` en `/api/public/auth/google/config`
    - las nuevas etiquetas de ratings y taxonomía no están aún activas en runtime remoto
- La pseudonimización por hash del `sub` de Google está implementada en código, pero no se ha migrado producción para no romper el runtime actual antes del despliegue.
- Sigue habiendo muestra muy pequeña:
  - hoy solo hay `2` centros con ratings
  - ambos con `1` voto
- No hay aún antifraude serio, cooldown operativo ni moderación.
- No hay despliegue ni smoke runtime de esta nueva versión.

## Qué queda ya defendible para enseñar
- Catálogo público base.
- Detalle de centro.
- Ratings como feature viva, interna y honesta:
  - visibles
  - no maquillados como oficiales
  - con muestra explícita
  - sin confundir Google login con Google reviews
- Transporte visible filtrado con semántica más coherente.
- BiciMAD realtime on-demand como único realtime realmente defendible.

## Estado final de ratings

### Problemas que tenían
- Preview y producción divergían por un seed falso en preview.
- `ratingOrigin` estaba mal clasificado como `official_structured`.
- La UI podía inducir a pensar en “reviews de Google” por el copy `Valorar con Google`.
- No había metadata explícita sobre el origen real del rating ni sobre el tamaño de muestra.
- Existía riesgo de perder votos al rehacer catálogo.
- Se persistía el token de Google demasiado tiempo en cliente.

### Qué se corrigió
- Preview se ha alineado con producción en datos reales visibles.
- Se ha añadido taxonomía explícita y honesta para ratings.
- La UI aclara:
  - que las valoraciones son internas de AlaBiblio
  - que Google solo autentica
  - que la muestra puede ser todavía inicial o limitada
- Se preservan votos en reingesta de catálogo.
- Se ha reducido la persistencia del token a sesión.
- Se han añadido tests mínimos para la lógica nueva de ratings.

### Qué límites siguen existiendo
- Muestra muy pequeña.
- Sin despliegue, las mejoras no están aún en runtime público.
- Falta antifraude real y moderación mínima.
- Falta migración controlada a `user_id` seudonimizado en producción una vez desplegado el código nuevo.

### Por qué la feature sigue siendo defendible sin ocultarla
- Porque ahora se presenta como lo que realmente es:
  - valoración interna
  - muestra pequeña
  - agregación simple y explicable
  - sin fingir oficialidad ni volumen que no existe
- El problema ya no es “la feature existe”; el problema era venderla como más madura de lo que era. Ese gap semántico queda mucho más reducido.

## Verificación realizada
- Local:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Runtime remoto:
  - comprobación de `/api/public/centers/:slug/ratings` en producción y preview
  - comprobación de `/api/public/auth/google/config` en preview y producción
  - comprobación de `/api/health` en producción

## Siguiente paso recomendado
Hacer un despliegue a preview de esta versión y volver a verificar:
- `/api/health`
- `/api/public/auth/google/config`
- `/api/public/catalog`
- `/api/public/filters`
- `/api/public/centers/:slug`
- `/api/public/centers/:slug/ratings`

Sin ese deploy, el repo ya está mejor; el runtime público todavía no.
