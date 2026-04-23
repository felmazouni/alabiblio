# AUDITORÍA INTEGRAL DEL PROYECTO

## VEREDICTO RÁPIDO
- ¿El proyecto está listo para enseñarse? `Con condiciones`
- ¿La información mostrada es robusta? `Media-baja`
- ¿Qué 5 cosas me pueden hundir la demo o la defensa?
  - Los filtros de `Días` y `Franja horaria` no existen en API, se aplican solo en cliente, usan una codificación de weekday incompatible con backend y además ignoran overrides. Evidencia: `workers/edge/src/http/query.ts:82`, `apps/web/src/lib/publicCatalog.ts:216`, `apps/web/src/lib/publicCatalog.ts:575`, `apps/web/src/routes/PublicCatalogRoute.tsx:80`.
  - La feature de ratings está ya viva en producción y preview aunque `ROADMAP.md` mantiene el bloque 8 abierto; además preview y producción divergen para el mismo centro. Evidencia: `ROADMAP.md:297`, `workers/edge/src/http/routes/publicRatings.ts:149`, `database/migrations/0007_center_attribute_ratings.sql:1`, observación runtime 2026-04-23.
  - La ordenación por distancia se ofrece siempre, pero sin ubicación real se comporta igual que relevancia. Evidencia: `packages/infrastructure/src/catalogStore.ts:2299`, `packages/infrastructure/src/catalogStore.ts:2301`, `packages/infrastructure/src/catalogStore.ts:2821`, observación runtime 2026-04-23.
  - El producto vende una sensación de realtime más amplia de la que realmente existe. La home dice “actualizadas en tiempo real”, pero el catálogo no expone opciones `realtime`; el único realtime comprobado es BiciMAD on-demand. Evidencia: `apps/web/src/routes/HomeRoute.tsx:320`, `packages/infrastructure/src/catalogStore.ts:1058`, observación runtime 2026-04-23.
  - La regeneración de snapshots de transporte puede degradar silenciosamente todos los centros si una fuente falla, porque primero borra y luego reconstruye con datasets que pueden venir vacíos sin abortar. Evidencia: `packages/infrastructure/src/catalogStore.ts:1675`, `packages/infrastructure/src/transportData.ts:410`.
- ¿Qué 5 cosas salvan el proyecto y conviene destacar?
  - Hay catálogo real persistido en D1 con 115 centros y endpoints públicos operativos en producción.
  - La separación conceptual `contracts/domain/application/infrastructure` existe y `typecheck` + `build` pasan.
  - Se persisten `raw_json`, rechazos de ingesta y `transport_source_runs`, lo que da una base razonable para trazabilidad.
  - El enfoque de movilidad no intenta simular Google Maps; en coche ya se etiqueta como `heuristic`.
  - BiciMAD realtime oficial on-demand funciona en producción y está razonablemente aislado del resto.

## METODOLOGÍA
- Hecho observado:
  - lectura completa de `ROADMAP.md`, `AGENTS.md`, `README.md`, arquitectura, migraciones, contracts, domain, application, infrastructure, worker, UI, scripts y configuración.
  - verificación local de `typecheck` y `build`.
  - comprobación runtime el `2026-04-23` contra `https://alabiblio.org` y `https://alabiblio-preview.ttefmb.workers.dev`.
- Hecho observado:
  - `typecheck` pasa.
  - `build` pasa fuera del sandbox.
  - producción responde en `/api/health`, `/api/public/catalog`, `/api/public/filters`, `/api/public/auth/google/config`, `/api/public/centers/:slug/ratings` y `/api/public/transport/bicimad/availability`.
- Hecho observado:
  - no he encontrado tests unitarios, de integración ni E2E en el repo.
  - no existe carpeta `.github` ni CI visible.
- Inferencia:
  - cuando un riesgo no se puede demostrar solo con una llamada runtime, lo marco apoyado en código concreto y explico por qué el comportamiento es estructural.

## 1. Resumen ejecutivo
El proyecto no está en un estado “roto”; está en un estado más peligroso: parece bastante terminado, compila, tiene datos reales, rutas visibles y producción activa, pero mezcla varias piezas sólidas con varias zonas que hoy no son defendibles como producto serio y fiable sin recortes.

Mi veredicto es este: hoy sí puede enseñarse como demo controlada del catálogo y del detalle, pero no debería defenderse todavía como sistema robusto y “fiable” sin rebajar claims, quitar o esconder funciones débiles y corregir varios problemas de semántica, trazabilidad y honestidad funcional. El mayor riesgo no es una caída técnica inmediata; es vender precisión o cobertura que el sistema no puede garantizar consistentemente.

Fortalezas reales:
- catálogo público real y persistido.
- snapshots de movilidad precomputados.
- separación de entornos preview/producción.
- TypeScript estricto y build limpio.
- criterio razonable de no fingir routing multimodal.

Riesgos principales:
- filtros de horarios no fiables.
- ratings activados antes de tiempo y con deriva entre entornos.
- trazabilidad de origen incompleta y en varios casos mal clasificada.
- degradación silenciosa posible en regeneración de transporte.
- varios claims de UX y ordenación más fuertes que la realidad operativa.

## 2. Inventario auditado
Módulos revisados:
- `apps/web`
- `workers/edge`
- `packages/contracts`
- `packages/domain`
- `packages/application`
- `packages/infrastructure`
- `database/migrations`
- `scripts`
- `docs`
- configuración raíz (`package.json`, `tsconfig*`, `wrangler*.jsonc`, `.gitignore`)

Rutas críticas revisadas:
- `/`
- `/listado`
- `/centros/:slug`
- `/admin/centro`
- `/admin/global`
- `/api/health`
- `/api/public/catalog`
- `/api/public/filters`
- `/api/public/centers/:slug`
- `/api/public/centers/:slug/ratings`
- `/api/public/transport/bicimad/availability`
- `/api/public/callejero/autocomplete`

Componentes y módulos clave:
- `apps/web/src/components/LibraryCard.tsx`
- `apps/web/src/components/FiltersPanel.tsx`
- `apps/web/src/routes/HomeRoute.tsx`
- `apps/web/src/routes/PublicCatalogRoute.tsx`
- `apps/web/src/routes/CenterDetailRoute.tsx`
- `apps/web/src/lib/publicCatalog.ts`
- `workers/edge/src/http/app.ts`
- `workers/edge/src/http/query.ts`
- `workers/edge/src/http/routes/public*.ts`
- `packages/infrastructure/src/catalogStore.ts`
- `packages/infrastructure/src/transportData.ts`
- `packages/infrastructure/src/ratingsStore.ts`
- `packages/domain/src/schedule.ts`
- `packages/domain/src/transport.ts`
- `packages/domain/src/text.ts`

Fuentes y servicios detectados:
- Ayuntamiento de Madrid: bibliotecas y salas de estudio.
- EMT: paradas y OpenAPI BiciMAD.
- GBFS BiciMAD.
- CRTM ArcGIS/FeatureServer para metro, cercanías e interurbanos.
- SER Geoportal.
- Nominatim para autocompletado de callejero.
- Google Identity `tokeninfo` para ratings.
- Google Maps `dir` para enlace de coche.

## 3. Diagnóstico técnico por capas

### 3.1 Frontend
Estado real:
- La UI pública está bastante trabajada y no parece un MVP tosco.
- La app, sin embargo, no es un “visor tonto”; reinterpreta datos críticos en cliente, especialmente horarios.

Hallazgos:
- `apps/web/src/lib/publicCatalog.ts` tiene 904 líneas y reimplementa lógica semántica de horario y validación visual. Esto reduce mantenibilidad y duplica responsabilidad que ya existe en backend.
- Los filtros `Días` y `Franja horaria` no están soportados por API. Se aplican solo sobre `items` ya recibidos en cliente. Evidencia: `workers/edge/src/http/query.ts:82`, `apps/web/src/lib/publicCatalog.ts:216`, `apps/web/src/routes/PublicCatalogRoute.tsx:80`.
- Hay un bug semántico fuerte de weekday:
  - backend usa `0=domingo` en `packages/domain/src/schedule.ts:4`, `packages/domain/src/schedule.ts:14`, `packages/domain/src/schedule.ts:461`.
  - frontend usa `0=lunes` en `apps/web/src/lib/publicCatalog.ts:575` y `apps/web/src/components/FiltersPanel.tsx:863`.
  - Resultado: seleccionar `Lunes` en UI compara contra `weekday===0`, que para backend es domingo.
- Además, esos filtros miran solo `schedule.rules` y no `schedule.overrides`. Evidencia: `apps/web/src/routes/PublicCatalogRoute.tsx:83`, `apps/web/src/routes/PublicCatalogRoute.tsx:89`.
- La home promete “actualizadas en tiempo real” en `apps/web/src/routes/HomeRoute.tsx:320`; el producto no sostiene ese claim de forma global.
- Las rutas admin existen públicamente pero son placeholders. Evidencia: `apps/web/src/app/router.tsx:28`, `apps/web/src/routes/GlobalAdminRoute.tsx:1`, `apps/web/src/routes/CenterAdminRoute.tsx:1`.

Conclusión:
- La UI pública es presentable.
- La UX funcional todavía no es plenamente honesta: hay controles, labels y claims que sugieren más precisión o madurez de la que realmente existe.

### 3.2 API / Worker
Estado real:
- La API pública principal funciona y sirve JSON coherente a nivel sintáctico.
- El worker tiene manejo básico de errores y logging estructurado, pero muy poco hardening operativo.

Hallazgos:
- `/api/health` no verifica D1, fuentes ni dependencias; devuelve `ok` estático desde `env`. Evidencia: `workers/edge/src/http/routes/health.ts:3`.
- Los endpoints públicos cachean 5 minutos (`catalog`, `filters`, `detail`) sin invalidación más fina. Evidencia: `workers/edge/src/http/routes/publicCatalog.ts:24`, `workers/edge/src/http/routes/publicFilters.ts:14`, `workers/edge/src/http/routes/publicCenterDetail.ts:23`.
- No hay rate limiting, ni límites explícitos de abuso, ni CSP visible, ni cabeceras de seguridad observables en producción.
- La verificación de token Google usa `tokeninfo` remoto sin timeout explícito. Evidencia: `workers/edge/src/http/routes/publicRatings.ts:29`.
- El bootstrap público sigue diciendo que `ratings` está pendiente aunque la feature está activa. Evidencia: `workers/edge/src/http/routes/public.ts:4`.

Conclusión:
- La API es operativa.
- No es todavía una superficie endurecida ni una API “lista para producción seria”.

### 3.3 Dominio
Estado real:
- Existen módulos de dominio puros (`catalog`, `schedule`, `transport`, `text`, `geo`).
- Lo mejor del diseño está aquí, pero no todo el comportamiento importante vive aquí.

Hallazgos:
- El parser de horarios es ambicioso, pero mete en el mismo flujo horario del centro y “horario de secretaría”, con riesgo de contaminar el estado abierto/cerrado. Evidencia: `packages/domain/src/schedule.ts:392`, `packages/domain/src/schedule.ts:532`.
- El parser de transporte textual es frágil. `parseLines()` captura números muy libres y termina interpretando “20 minutos a pie” como línea `L20`. Evidencia: `packages/domain/src/transport.ts:24`, `packages/domain/src/transport.ts:28`.
- Caso observado en producción 2026-04-23:
  - `Sala de estudio Montecarmelo` devuelve `Metro 2 · L20` a partir de `Metro: Montecarmelo (línea 10) (20 minutos a pie)`.

Conclusión:
- Hay esfuerzo real de dominio.
- Todavía hay heurísticas demasiado abiertas para poder defender exactitud alta en horarios y transporte parseado.

### 3.4 Infraestructura / persistencia
Estado real:
- `catalogStore.ts` concentra casi todo: esquema runtime, ingesta, normalización, persistencia, snapshots, ranking, exposición y fallback live.

Hallazgos:
- `packages/infrastructure/src/catalogStore.ts` tiene 2599 líneas y mezcla capas.
- El runtime sigue ejecutando `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE` desde aplicación. Evidencia: `packages/infrastructure/src/catalogStore.ts:279`, `packages/infrastructure/src/catalogStore.ts:805`.
- La persistencia de origen por campo no existe como dato explícito en D1. En `centers` no hay columnas `*_origin`; luego se reconstruyen al leer. Evidencia: `database/migrations/0001_initial.sql`, `packages/infrastructure/src/catalogStore.ts:2151`, `packages/infrastructure/src/catalogStore.ts:2153`, `packages/infrastructure/src/catalogStore.ts:2156`.
- `replaceCatalog()` borra tablas completas antes de reinsertar; si falla a mitad, deja el estado parcialmente rehecho. Evidencia: `packages/infrastructure/src/catalogStore.ts:830`.
- `replaceTransportSnapshots()` borra primero y reconstruye después con datasets que pueden venir vacíos. Evidencia: `packages/infrastructure/src/catalogStore.ts:1675`.
- Las cargas de transporte convierten error en `[]` y continúan. Evidencia: `packages/infrastructure/src/transportData.ts:410`, `packages/infrastructure/src/transportData.ts:433`, `packages/infrastructure/src/transportData.ts:447`, `packages/infrastructure/src/transportData.ts:461`, `packages/infrastructure/src/transportData.ts:476`, `packages/infrastructure/src/transportData.ts:491`.

Conclusión:
- La persistencia existe y es útil.
- La robustez transaccional y la trazabilidad fina están por debajo de lo que exigiría una defensa seria.

### 3.5 Ingesta y normalización
Estado real:
- Hay ingesta real desde fuentes oficiales.
- Hay exclusión de espacios al aire libre y persistencia de rechazos.

Hallazgos:
- La exclusión de open air se apoya en términos simples (`parque`, `bibliopiscina`, `espacio abierto`). Evidencia: `packages/domain/src/catalog.ts:3`.
- `district` y `neighborhood` se extraen tomando el último segmento del `@id`, sin tabla robusta de normalización. Evidencia: `packages/infrastructure/src/catalogStore.ts:681`.
- El resultado real en producción muestra etiquetas pobres o dudosas:
  - distrito `Distrito`
  - barrios como `CascoHBarajas`, `VillaverdeAltoCH`, `CascoHVicalvaro`
- `wifi` se infiere buscando texto libre; `capacity` se saca por regex de `aforo`. Evidencia: `packages/infrastructure/src/catalogStore.ts:617`, `packages/infrastructure/src/catalogStore.ts:622`.

Conclusión:
- La ingesta funciona.
- La normalización de zonas, features derivadas y transporte textual sigue siendo frágil.

### 3.6 Configuración y despliegue
Estado real:
- Preview y producción están separadas en `wrangler.jsonc` y `wrangler.prod.jsonc`.
- `typecheck` y `build` pasan con el Node portable del repo.

Hallazgos:
- El repo depende de `tools/node` para ejecutar `pnpm` en este entorno; sin ese PATH los scripts fallan. No es grave, pero sí una fricción operativa.
- `workers/edge/wrangler.prod.jsonc` activa Google en producción; preview no. Evidencia: `workers/edge/wrangler.prod.jsonc:23`, `workers/edge/wrangler.jsonc:21`.
- Se observa deriva real preview/prod en ratings para el mismo centro, luego la separación de entornos existe pero no está gobernada con runbook fino ni políticas claras de datos.
- No hay CI visible.
- `.gitignore` ignora `pnpm-lock.yaml`, pero el lockfile está versionado; la política de repo aquí es inconsistente. Evidencia: `.gitignore:11`.

Conclusión:
- El despliegue actual es funcional.
- La operación reproducible todavía depende demasiado de conocimiento implícito y de comandos manuales.

## 4. Auditoría de robustez del dato

### Cadena de confianza fuente → ingesta → normalización → persistencia → API → UI

### 4.1 Fuentes
Evaluación:
- Centros:
  - Ayuntamiento de Madrid.
  - confianza: `alta` para identidad base; `media` para horarios y features embebidas en texto libre.
- Transporte:
  - EMT / CRTM / BiciMAD / SER oficiales.
  - confianza: `alta` para nodos y geometrías; `media` para su traducción a “opciones útiles por centro”.
- Ratings:
  - internos de la app, no oficiales.
  - confianza actual: `baja` por tamaño muestral y por activación prematura.
- Callejero:
  - Nominatim.
  - confianza: `media`, útil para UX, no para claims fuertes.

### 4.2 Ingesta
Hallazgos:
- Hay timeouts básicos para datasets oficiales (`fetchOfficialDataset`, `fetchWithFallback`).
- No hay validación fuerte de esquema de payloads upstream; el código asume forma razonable y cae a campos opcionales.
- Si una fuente de transporte falla, la carga no se aborta: devuelve `[]` y el sistema sigue. Eso evita caída, pero puede degradar silenciosamente el producto.

### 4.3 Normalización
Hallazgos:
- `wifi` y `capacity` son inferencias sobre texto libre, no datos estructurados.
- La normalización de zonas no es aún defendible del todo. Hoy la UI compensa con `normalizeZoneLabel()`, pero el backend sigue emitiendo etiquetas crudas.
- El parser de transporte textual tiene falsos positivos comprobados.
- El parser de horarios es útil, pero todavía simplifica realidades como secretaría vs uso efectivo del centro.

### 4.4 Persistencia
Hallazgos:
- Se guarda `raw_json` del centro y se guardan rechazos de ingesta. Bien.
- Se persisten reglas y overrides de horario. Bien.
- No se persiste de forma explícita el origen por campo visible; se reconstruye a demanda.
- No se persiste una explicación de transformación por campo. Hoy puedes reconstruir parte del porqué, pero no auditarlo completamente.

### 4.5 Exposición en API
Hallazgos:
- Hay taxonomía de origen en contrato. Bien.
- Pero la taxonomía se viola en varios sitios:
  - `ratingOrigin` se marca como `official_structured` aunque las valoraciones son internas. Evidencia: `packages/infrastructure/src/catalogStore.ts:2212`.
  - `distanceOrigin` se marca como `official_structured` aunque la distancia es un cálculo Haversine sobre coordenadas, no un dato oficial estructurado. Evidencia: `packages/infrastructure/src/catalogStore.ts:2225`.
  - el ranking interno llama `aforo_oficial` a cualquier aforo presente aunque venga de texto parseado. Evidencia: `packages/infrastructure/src/catalogStore.ts:2045`.
- Falta metadata de freshness por feature visible. El catálogo no expone `last_updated` por centro ni por bloque de dato.

### 4.6 Representación en frontend
Hallazgos:
- La UI muestra `Aforo · No disponible` de forma honesta. Eso está bien.
- La home generaliza “tiempo real”, lo cual sobrepromete.
- El transporte visible en card y detalle oculta opciones a más de 500 m, pero los filtros de transporte se calculan sobre cualquier opción del backend. Resultado: un centro puede entrar por filtro y luego no enseñar ese modo. Evidencia: `packages/infrastructure/src/catalogStore.ts:2286`, `apps/web/src/components/LibraryCard.tsx:186`, `apps/web/src/routes/CenterDetailRoute.tsx:696`.
- La ordenación por distancia se ofrece sin ubicación aunque no tenga efecto real.

## 5. Matriz de fiabilidad de la información mostrada

| Feature | Fuente real | Tipo de procesamiento | Riesgo principal | Nivel de confianza | ¿Es defendible en producción? | Recomendación concreta |
|---|---|---|---|---|---|---|
| Catálogo público base | D1 con centros ingestados desde fuentes oficiales municipales | Normalización + ranking | mezcla de datos fuertes con ranking heurístico | Medio | Sí, con condiciones | presentarlo como catálogo curado, no como “verdad operativa total” |
| Identidad del centro | Ayuntamiento de Madrid | limpieza de texto y slug | normalización de distrito/barrio pobre en algunos casos | Alto-medio | Sí | revisar labels de zonas y casos anómalos (`Distrito`, `CascoHBarajas`, etc.) |
| Horario visible | texto oficial parseado | parser + overrides + cálculo open/close | secretaría y horarios operativos pueden contaminarse; 26 centros sin reglas base | Medio-bajo | Con condiciones | etiquetar claramente baja confianza y retirar filtros de horario hasta corregirlos |
| `Abierta/Cerrada ahora` | reglas y overrides calculados | motor operativo | 9 centros abiertos ahora con `low/needs_manual_review` observados en producción | Medio-bajo | Con condiciones | degradar el claim cuando `confidence` no sea `high/medium` fiable |
| `Próximo cambio` | cálculo derivado de horario | heurística sobre reglas/overrides | parece preciso aunque parte de un parser no siempre robusto | Medio-bajo | Con condiciones | mostrarlo solo cuando confianza sea suficiente |
| Aforo | texto libre oficial, regex `aforo` | parse textual | cobertura bajísima: 6/115 | Medio | Sí | mantenerlo visible solo como dato puntual, no como eje del producto |
| Ratings | votos internos app | agregación D1 + login Google | activación prematura, muy poca muestra, deriva preview/prod, origen mal clasificado | Bajo | No | congelar o esconder hasta cerrar bloque 8 y sanear taxonomía |
| Transporte por modo | EMT/CRTM/BiciMAD/SER oficiales + distancia al centro | snapshot precomputado + cortes por distancia | filtros cuentan opciones que luego la UI oculta; parsing textual erróneo en casos reales | Medio | Con condiciones | alinear filtro con visibilidad y corregir parser textual |
| BiciMAD disponibilidad | EMT OpenAPI o GBFS oficial | consulta on-demand | depende de terceros en tiempo real | Medio-alto | Sí | destacarlo como único realtime oficial comprobado |
| SER / coche | SER oficial + enlace Google Maps | cobertura binaria + heurística | todos los centros tienen opción “coche”; filtro poco útil | Medio-bajo | Con condiciones | quitarlo como filtro destacado; dejarlo como información secundaria |
| Filtros de horario (`Días`, `Franja`) | cliente sobre `schedule.rules` | filtrado local | no existe en API, weekday mal alineado, ignora overrides | Bajo | No | desactivar ya |
| Ordenación por distancia sin ubicación | catálogo ya cargado | fallback silencioso a relevancia | promete una ordenación que no está ocurriendo | Bajo | No | ocultarla si no hay ubicación |
| Badges de origen (`OFICIAL`, `TEXTO`, `ESTIMADO`) | taxonomía interna | presentación UI | taxonomía mal aplicada en ratings y distancia | Medio-bajo | Con condiciones | corregir clasificación antes de usarla como argumento de fiabilidad |

## 6. Riesgos priorizados

### Críticos

#### R1. Filtros de horario incorrectos y no defendibles
- Descripción: `Días` y `Franja horaria` no están soportados por API, se aplican solo en cliente, usan weekday incompatible con backend e ignoran overrides.
- Impacto: alto. Puede devolver resultados objetivamente erróneos.
- Probabilidad: alta. Es estructural.
- Evidencia concreta:
  - `workers/edge/src/http/query.ts:82`
  - `apps/web/src/lib/publicCatalog.ts:216`
  - `apps/web/src/lib/publicCatalog.ts:575`
  - `apps/web/src/routes/PublicCatalogRoute.tsx:80`
  - observación runtime: filtro “lunes” en cliente equivale a `weekday=0`; backend usa `0=domingo`.
- Recomendación:
  - desactivar esos filtros ya.
  - reintroducirlos solo cuando backend soporte `days/time_slot` con semántica única.

#### R2. Ratings activados fuera de plan y con gobernanza débil
- Descripción: ratings ya están en producción y preview aunque el roadmap los declara pendientes; no hay cooldown, ni antifraude real, ni pseudonimización, ni control operativo.
- Impacto: alto técnico y reputacional.
- Probabilidad: alta.
- Evidencia concreta:
  - `ROADMAP.md:297`
  - `workers/edge/src/http/routes/publicRatings.ts:149`
  - `packages/infrastructure/src/ratingsStore.ts:231`
  - `database/migrations/0007_center_attribute_ratings.sql:1`
  - observación runtime 2026-04-23: mismo centro con rating distinto en preview y producción.
- Recomendación:
  - o se congela/oculta ya,
  - o se cierra de verdad el bloque 8 antes de volver a enseñarlo.

#### R3. Degradación silenciosa de transporte ante fallo de fuente
- Descripción: los loaders de transporte devuelven `[]` en fallo y `replaceTransportSnapshots()` borra primero y reconstruye después.
- Impacto: alto. Puede degradar masivamente la calidad visible sin tumbar la app.
- Probabilidad: media-alta.
- Evidencia concreta:
  - `packages/infrastructure/src/transportData.ts:410`
  - `packages/infrastructure/src/transportData.ts:433`
  - `packages/infrastructure/src/catalogStore.ts:1675`
- Recomendación:
  - abortar regeneración si faltan datasets críticos.
  - usar snapshot anterior como fallback.
  - alertar explícitamente si una fuente cae.

### Altos

#### R4. Taxonomía de procedencia incoherente
- Descripción: la app dice cuidar procedencia, pero marca ratings internos y distancias calculadas como `official_structured`.
- Impacto: alto en defendibilidad.
- Probabilidad: alta.
- Evidencia concreta:
  - `packages/infrastructure/src/catalogStore.ts:2212`
  - `packages/infrastructure/src/catalogStore.ts:2225`
- Recomendación:
  - corregir ya `ratingOrigin` y `distanceOrigin`.
  - revisar todo campo derivado que hoy use `official_structured`.

#### R5. Ordenación por distancia sin ubicación es un no-op
- Descripción: la UI permite ordenar por distancia sin ubicación; el backend cae de facto a relevancia.
- Impacto: alto en honestidad funcional.
- Probabilidad: alta.
- Evidencia concreta:
  - `packages/infrastructure/src/catalogStore.ts:2299`
  - `packages/infrastructure/src/catalogStore.ts:2301`
  - `packages/infrastructure/src/catalogStore.ts:2821`
  - observación runtime 2026-04-23: `sort=relevance` y `sort=distance` devuelven el mismo top 20.
- Recomendación:
  - ocultar `Distancia` si no hay ubicación.

#### R6. Mismatch entre filtro de transporte y transporte visible
- Descripción: backend filtra por cualquier opción; UI enseña solo no-car y <=500 m.
- Impacto: alto en confianza del usuario.
- Probabilidad: alta.
- Evidencia concreta:
  - `packages/infrastructure/src/catalogStore.ts:2286`
  - `apps/web/src/components/LibraryCard.tsx:186`
  - `apps/web/src/routes/CenterDetailRoute.tsx:696`
  - observación runtime 2026-04-23:
    - `cercanias`: 82 centros en backend, solo 17 visibles en UI.
    - `interurban_bus`: 106 en backend, solo 49 visibles en UI.
- Recomendación:
  - o bien filtrar por “visible en UI”,
  - o bien mostrar el modo filtrado aunque quede >500 m.

#### R7. Salud engañosa
- Descripción: `/api/health` no comprueba D1, ingesta, snapshots ni fuentes.
- Impacto: alto operativo.
- Probabilidad: alta.
- Evidencia concreta:
  - `workers/edge/src/http/routes/health.ts:3`
- Recomendación:
  - convertirlo en health real con chequeo de DB, recuentos mínimos, snapshot version y freshness.

### Medios

#### R8. Normalización de zonas insuficiente
- Descripción: distrito/barrio llegan en formas poco presentables o dudosas.
- Impacto: medio.
- Probabilidad: media-alta.
- Evidencia concreta:
  - `packages/infrastructure/src/catalogStore.ts:681`
  - observación runtime 2026-04-23 en `/api/public/filters`.
- Recomendación:
  - introducir tabla canónica de zonas y mapeos explícitos.

#### R9. Parser de transporte textual con falsos positivos
- Descripción: extrae líneas donde no debe.
- Impacto: medio.
- Probabilidad: media.
- Evidencia concreta:
  - `packages/domain/src/transport.ts:24`
  - `packages/domain/src/transport.ts:28`
  - caso observado: Montecarmelo `Metro 2 · L20`.
- Recomendación:
  - bloquear captura de números que no vengan etiquetados como línea real.

#### R10. Trazabilidad de campo insuficiente
- Descripción: se guarda raw center pero no el origen persistido por campo ni el razonamiento de transformación.
- Impacto: medio.
- Probabilidad: alta.
- Evidencia concreta:
  - `database/migrations/0001_initial.sql`
  - `packages/infrastructure/src/catalogStore.ts:2151`
- Recomendación:
  - persistir `*_origin` y, para campos críticos, `*_source_detail`.

#### R11. Seguridad y abuso todavía muy verdes
- Descripción: sin rate limit, sin antifraude de ratings, sin CSP/HSTS observados.
- Impacto: medio.
- Probabilidad: media.
- Evidencia concreta:
  - ausencia de implementación específica en repo.
  - observación runtime 2026-04-23 de headers HTTP.
- Recomendación:
  - añadir rate limit mínimo, CSP, `X-Content-Type-Options`, política de abuso de ratings.

### Bajos

#### R12. Artefactos y utilidades muertas ensucian la operación
- Descripción: hay scripts y artefactos que no sostienen flujo real.
- Impacto: bajo, pero empeora mantenibilidad.
- Probabilidad: alta.
- Evidencia concreta:
  - `scripts/regenerate-transport-snapshots.mjs:3`
  - `scripts/regenerate-transport-snapshots.mjs:22`
  - `tmp_block_2_5_diff.txt` versionado
  - `scripts/audit-operational-state.mjs:1` fijado a preview
- Recomendación:
  - limpiar lo muerto y documentar el flujo operativo real.

## 7. Gaps de trazabilidad y defendibilidad
Hoy no podemos defender bien estas afirmaciones:
- “las valoraciones están integradas de forma robusta”:
  - no. Están vivas, pero aún no están gobernadas como bloque cerrado.
- “la taxonomía de procedencia está completamente respetada”:
  - no. Ratings y distancia están mal clasificados.
- “los filtros de horario funcionan extremo a extremo”:
  - no.
- “ordenar por distancia siempre ordena por distancia”:
  - no.
- “el health refleja salud operativa real”:
  - no.
- “si una fuente cae lo detectamos y degradamos de forma segura”:
  - no con suficiente confianza.

Claims que no deberías hacer hoy:
- “actualizado en tiempo real” como claim general del producto.
- “horarios verificados” sin matiz.
- “transporte exacto” o “cómo llegar” en sentido fuerte.
- “sistema de valoraciones ya operativo y fiable”.
- “producción completamente endurecida”.

Datos que necesitan downgrade o etiquetado más honesto:
- `distance`
- `ratingOrigin`
- `sort=distance` sin ubicación
- filtros de horario
- modos de transporte filtrados pero ocultos en UI

## 8. Plan de choque

### En 24 horas
- Desactivar en UI `Días` y `Franja horaria`.
- Ocultar `Distancia` como ordenación si no hay ubicación.
- Rebajar copy de home: quitar “actualizadas en tiempo real”.
- Corregir taxonomía de `ratingOrigin` y `distanceOrigin`.
- Congelar u ocultar ratings si no se va a cerrar bloque 8 ya.
- Añadir aviso interno de demo: solo catálogo + detalle + BiciMAD on-demand como realtime real.

### En 3 días
- Corregir codificación única de weekday entre frontend y backend.
- Pasar filtros de horario a backend o eliminarlos.
- Alinear filtro de transporte con lo que la UI enseña realmente.
- Corregir parser textual de transporte para evitar falsos positivos como `L20`.
- Añadir health real con DB y freshness básica.
- Bloquear regeneración de snapshots si faltan fuentes críticas.

### En 1 semana
- Persistir origen por campo y detalle de transformación para horario/aforo/wifi/transporte.
- Introducir test suite mínima de:
  - parser de horarios
  - parser de transporte textual
  - filtros y ordenaciones
  - ratings
  - paridad catálogo/detalle
- Limpiar normalización de distritos y barrios con mapping canónico.
- Añadir rate limiting y cabeceras de seguridad.

### Puede esperar
- panel admin real.
- refinado visual adicional.
- automatización completa de runbooks si antes se estabiliza semántica y fiabilidad.

## 9. Anexo técnico

### Archivos especialmente relevantes
- `packages/infrastructure/src/catalogStore.ts`
- `packages/infrastructure/src/transportData.ts`
- `packages/infrastructure/src/ratingsStore.ts`
- `packages/domain/src/schedule.ts`
- `packages/domain/src/transport.ts`
- `apps/web/src/lib/publicCatalog.ts`
- `apps/web/src/routes/PublicCatalogRoute.tsx`
- `apps/web/src/routes/HomeRoute.tsx`
- `apps/web/src/components/LibraryCard.tsx`
- `workers/edge/src/http/query.ts`
- `workers/edge/src/http/routes/publicRatings.ts`
- `workers/edge/src/http/routes/health.ts`

### Inconsistencias concretas detectadas
- `ROADMAP.md` mantiene bloque 8 abierto, pero ratings ya están desplegados.
- `/api/public/bootstrap` marca `ratings` como pendiente aunque ya existen endpoints y datos.
- preview y producción divergen en ratings del mismo centro.
- el repo no tiene tests, pero el roadmap habla de hardening posterior.

### Cobertura real de pruebas
- Tests automáticos encontrados: `ninguno`.
- Verificación local ejecutada:
  - `typecheck`: pasa.
  - `build`: pasa.
- Scripts de auditoría:
  - `scripts/audit-operational-state.mjs` existe, pero está fijado a preview y no sustituye una suite de tests.

### Observaciones runtime verificadas el 2026-04-23
- Producción:
  - `GET /api/public/catalog?limit=500` → `115` centros.
  - `26` centros con `low` o `needs_manual_review`.
  - `9` centros marcados `isOpenNow=true` con confianza baja o revisión.
  - `6` centros con aforo conocido.
  - `2` centros con ratings.
  - `115/115` con opción `car`.
  - `115/115` con `emt_bus`.
  - `115/115` con `serZoneLabel`.
- Transporte filtrable pero no visible por corte UI:
  - `metro`: 106 backend / 76 visibles.
  - `cercanias`: 82 backend / 17 visibles.
  - `interurban_bus`: 106 backend / 49 visibles.
- Realtime:
  - `catalog.dataQuality.hasRealtimeTransport` observado: `0`.
  - endpoint BiciMAD on-demand comprobado: responde `realtime`.

### Preguntas abiertas
- ¿Quieres realmente mantener ratings ya visibles o prefieres retirarlos hasta cerrar bloque 8 con gobernanza mínima?
- ¿La defensa del proyecto va a centrarse en “producto serio listo para producción” o en “base sólida ya operativa pero aún endureciéndose”? La narrativa correcta cambia bastante qué conviene enseñar.
