- [x] *Lote 1 - Integridad de ranking y contrato de listado*
	- [x] *Lote 1A - Contrato semantico y scopes*
	- [x] Definir formalmente `base_exploration` y `origin_enriched`
	- [x] Decidir que campos existen en cada scope
	- [x] Prohibir campos ambiguos en el scope base si no tienen soporte contextual real
	- [x] Documentar la semantica exacta de `recommended`, `arrival`, `distance`, `open_now`
	- [x] Decidir que endpoints usan scope base y cuales scope enriquecido
	- [x] *Lote 1B - Correccion de endpoints y payloads*
	- [x] Aplicar los scopes a `GET /api/centers`
	- [x] Aplicar los scopes a `GET /api/centers/top-mobility`
	- [x] Aplicar los scopes a `GET /api/centers/:slug`
	- [x] Separar payload base de payload enriquecido sin mezclar naming enganoso
	- [x] Alinear `open_count`, `total`, `next_offset` y paginacion con la realidad operativa del endpoint
	- [x] *Lote 1C - Consumo frontend y eliminacion de doble verdad*
	- [x] Hacer que la UI consuma los scopes correctamente
	- [x] Eliminar recomputaciones de contexto de decision en cliente
	- [x] Sacar de `App.tsx` la logica minima necesaria para evitar otra vez mezcla entre Top/List/Detail
	- [x] Asegurar que la UI no vende como "mejor opcion" lo que es solo exploracion base
	- [x] *Lote 1D - Proteccion minima de regresion*
	- [x] Anadir pruebas de contrato para `GET /api/centers`
	- [x] Anadir pruebas de contrato para `GET /api/centers/top-mobility`
	- [x] Anadir pruebas de contrato para `GET /api/centers/:slug`
	- [x] Comparar el mismo centro entre listado, top y detalle con el mismo origen
	- [x] Dejar fixtures/golden minimos que congelen la semantica nueva

- [x] *Lote 2 - Observabilidad y depuracion operativa*
	- [x] Introducir `request_id` en todas las respuestas `/api/*`
	- [x] Anadir logs estructurados con `route`, `request_id`, `cache_status`, `upstream_status`, `duration_ms` y `data_version`
	- [x] Exponer headers de depuracion para distinguir `HIT`, `MISS`, `BYPASS`, `fallback` y `realtime`
	- [x] Registrar errores de upstream con causa tipada y sin texto ambiguo
	- [x] Anadir smoke checks con timeout y validacion de headers operativos

- [ ] *Lote 3 - Frontend shell y reduccion de regresiones en `App.tsx`*
	- [ ] Extraer `TopPicksScreen` a modulo propio
	- [ ] Extraer `CatalogScreen` a modulo propio
	- [ ] Extraer `CenterDetailRoute` a modulo propio
	- [ ] Centralizar estado de origen, filtros y carga remota fuera del entrypoint
	- [ ] Reducir `apps/web/src/App.tsx` a composicion y routing

- [ ] *Lote 4 - Backend de centros y query layer*
	- [ ] Dividir `apps/web/worker/routes/centers.ts` en handlers por endpoint
	- [ ] Separar parsing, caching, conteo, ranking y serializacion en modulos dedicados
	- [ ] Eliminar escaneos repetidos de horarios para `open_count` y `closed_count`
	- [ ] Introducir fixtures de payload para listado, top y detalle
	- [ ] Anadir pruebas unitarias e integracion para la capa `centersQuery` y serializacion

- [ ] *Lote 5 - Honestidad de movilidad y dominio*
	- [ ] Declarar de forma explicita `realtime`, `estimado`, `frecuencia` y `heuristica` en contratos de movilidad
	- [ ] Sustituir constantes heuristicas opacas por configuracion nombrada y documentada
	- [ ] Revisar scoring de coche, EMT, BiciMAD y metro para evitar precision falsa
	- [ ] Alinear copy UI con el nivel real de confianza del dominio
	- [ ] Anadir golden tests de decisiones de movilidad y ordenacion

- [ ] *Lote 6 - Encoding y texto end-to-end*
	- [ ] Unificar normalizacion de texto entre ingesta, worker y cliente
	- [ ] Eliminar reparaciones redundantes en runtime cuando el dato ya llega saneado
	- [ ] Corregir mojibake persistente en docs y comentarios del repo
	- [ ] Anadir fixtures de entidades HTML, UTF-8 roto y dobles decodificaciones
	- [ ] Verificar que detalle, listado, geocode y nodos de movilidad no reintroducen texto corrupto

- [ ] *Lote 7 - Testing que proteja de verdad*
	- [ ] Crear pruebas de integracion HTTP para `health`, `centers`, `top-mobility`, `detail`, `mobility`, `geocode` y `origin/presets`
	- [ ] Crear E2E de Top, Listado, Detalle, Filtros y cambio de origen
	- [ ] Anadir snapshots o golden tests de payload para contratos criticos
	- [ ] Cubrir regresiones de timeout, cancelacion y estados vacios
	- [ ] Hacer fallar CI si faltan pruebas de contrato en endpoints criticos

- [ ] *Lote 8 - Performance y bundles*
	- [ ] Aplicar code splitting por ruta y por mapa
	- [ ] Lazy-load de MapLibre y aislamiento de CSS pesada del mapa
	- [ ] Revisar impacto real de `gsap`, `framer-motion` y componentes ReactBits
	- [ ] Eliminar componentes no usados y dependencias fantasmas
	- [ ] Reducir bundle cliente inicial por debajo del umbral operativo acordado

- [ ] *Lote 9 - UX operativa y accesibilidad basica*
	- [ ] Anadir foco gestionado y trap real en drawers y sheets
	- [ ] Anadir labels accesibles y semantica de lista sugerida en el selector de origen
	- [ ] Revisar promesas de copy para no vender precision superior a la real
	- [ ] Unificar estados de error, stale y fallback entre top, listado y detalle
	- [ ] Resolver incoherencias entre CTA, rutas visibles y rutas redirigidas

- [ ] *Lote 10 - Documentacion, deploy y seguridad operativa*
	- [ ] Alinear `README.md` con bindings y runtime reales
	- [ ] Corregir deriva documental en `ARCHITECTURE-CURRENT.md` y `API-CONTRACTS-V1.md`
	- [ ] Documentar entorno local minimo para `node`, `pnpm` y `wrangler`
	- [ ] Revisar rate limiting, timeout y tolerancia a fallos de upstream publico
	- [ ] Anadir checklist de release y rollback por entorno Cloudflare
