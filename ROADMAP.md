# Estado actual

- Fecha de corte: `2026-04-18`
- Estado del proyecto: `preview funcional`, no produccion.
- URL de preview: `https://alabiblio-preview.ttefmb.workers.dev`
- Base de datos preview: D1 `alabiblio-preview`
- Centros publicados en preview: `115`

# Lo que funciona ya de verdad

- Worker de Cloudflare desplegado en preview con assets del frontend y API basica.
- D1 de preview provisionada y conectada al Worker.
- `install`, `typecheck`, `build` y `wrangler deploy` ya ejecutados con exito.
- `GET /api/health` operativo.
- `GET /api/public/catalog` operativo y devolviendo datos reales.
- Ingesta minima real desde fuentes oficiales de bibliotecas y salas de estudio del Ayuntamiento.
- Exclusiones estrictas activas para espacios al aire libre y elementos no validos para estudio interior.
- Normalizacion persistente basica de horarios con `rules`, `schedule_confidence`, `notes_unparsed`, `is_open_now` y `next_change_at`.
- Home, listado, detalle basico y modal de filtros ya visibles en preview.
- Port visual parcial desde `v0.app` ya integrado sobre React + Vite + Tailwind.
- Logging estructurado basico en Worker e ingesta.

# Lo que NO esta terminado todavia

- Port visual cerrado al nivel de fidelidad final respecto a `v0`.
- `GET /api/public/centers/:slug`.
- `GET /api/public/filters`.
- Filtros y ordenacion obligatorios completos.
- Enriquecimiento oficial de transporte EMT, BiciMAD, SER y CRTM.
- Ratings reales 1-5 con antifraude.
- Auth de admins de centro y panel admin global.
- Esquema D1 completo por bounded context.
- Tests automaticos serios, hardening y runbook de produccion.
- Entorno de produccion separado y conexion final con `alabiblio.org`.

# Auditoria rapida

## Solido

- Arquitectura base del repo ya reconstruida y orientada a Cloudflare.
- Preview Cloudflare real funcionando con D1 real y datos reales.
- Ingesta minima de centros, exclusiones de aire libre y catalogo publico basico.
- Build, typecheck y deploy repetibles en el estado actual.

## A medio hacer

- Esquema D1: existe base util, pero faltan bounded contexts completos.
- Horarios: el parser ya sirve para un MVP tecnico, pero no cubre casos complejos.
- UI publica: ya no es una pantalla tecnica, pero todavia no esta cerrada con fidelidad baja frente a `v0`.
- API publica: existe base valida, pero aun no cubre detalle, filtros ni ordenacion final.

## Tecnico vs visual

- Tecnico ya resuelto en base: deploy preview, D1 preview, ingesta minima, endpoint de catalogo, salud y logging basico.
- Visual aun en ajuste: spacing, densidad, composicion fina de cards, transporte y modal de filtros.

## Riesgos actuales

- Riesgo de sobrevalorar la UI actual: funcionalmente ya sirve para validar direccion, pero no para dar por cerrado el port visual.
- Riesgo de parser de horarios: hay casos ambiguos no cubiertos todavia por overrides, examenes, festivos y cierres.
- Riesgo de precision visual en transporte: lo visible hoy mezcla estructura real con placeholders y heuristicas.
- Riesgo de produccion: no existe aun separacion completa preview/produccion ni endurecimiento operativo.

# Siguiente bloque inmediato al retomar

1. Cerrar el port visual literal de `app/page.tsx`, `app/listado/page.tsx`, `components/library-card.tsx` y `components/filters-panel.tsx` hasta llevar la distancia con `v0` de `media-baja` a `baja`.
2. Rematar la composicion exacta de la card principal y del listado sin introducir datos falsos.
3. Implementar `GET /api/public/centers/:slug` para dejar de depender del payload del catalogo en el detalle.
4. Endurecer el parser de horarios con overrides, festivos, examenes y casos ambiguos reales.
5. Empezar el bloque de filtros y ordenacion reales sobre API, sin abrir aun transporte oficial avanzado ni admin.

- [x] Fase 0. Auditoria y limpieza controlada
    - [x] Inventariar el repo heredado por capas: UI, worker, dominio, ingestion, transporte, SQL, tests y docs.
    - [x] Clasificar cada bloque como reutilizable conceptualmente, archivable por referencia o eliminable.
    - [x] Analizar el ZIP de `v0.app` y documentar piezas reutilizables, piezas a portar y piezas a descartar.
    - [x] Mover el ZIP de `v0.app` a una ruta estable de referencia dentro del repo.
    - [x] Eliminar artefactos temporales, logs, previews, dependencias instaladas y documentacion obsoleta.
    - [x] Eliminar codigo heredado operativo que arrastre contratos, rutas, componentes o esquemas viejos.
    - [x] Dependencia: acceso local al repo y al ZIP exportado.
    - [x] Criterio de aceptacion: el arbol operativo queda reducido al scaffold nuevo, `references/v0` y documentacion vigente.
- [ ] Fase 1. Arquitectura objetivo y decisiones de plataforma (en curso)
    - [x] Cerrar la topologia final `apps/web` + `workers/edge` + `packages/*` + `database/*`.
    - [x] Definir fronteras entre `contracts`, `domain`, `application` e `infrastructure`.
    - [x] Fijar que el Worker sirva tanto API como assets compilados del frontend.
    - [x] Definir politicas base de validacion, timeouts, retries, logging estructurado y saneamiento de texto.
    - [x] Definir la abstraccion `EmailSender` para desacoplar Cloudflare Email Service y alternativa externa minima.
    - [ ] Definir la abstraccion `DatasetClient` para Madrid, EMT, BiciMAD, SER y CRTM. (parcial)
    - [x] Dependencia: Fase 0.
    - [x] Criterio de aceptacion: arquitectura documentada y scaffold de carpetas alineado con esa arquitectura.
- [ ] Fase 2. Setup Cloudflare y entornos (en curso)
    - [x] Configurar `wrangler.jsonc` base para `alabiblio`.
    - [x] Preparar bindings de D1 y assets del frontend.
    - [ ] Definir variables de entorno minimas para local, preview y produccion. (parcial)
    - [ ] Definir nombres y convenciones de recursos Cloudflare. (parcial)
    - [ ] Preparar compatibilidad con `alabiblio.org`. (parcial)
    - [x] Documentar limites operativos del plan gratuito de Workers y D1.
    - [x] Dependencia: Fase 1.
    - [x] Criterio de aceptacion: configuracion base de Worker lista para conectarse a D1 y servir assets.
- [ ] Fase 3. Esquema D1 base (en curso)
    - [ ] Modelar tablas de fuentes, ejecuciones de ingesta y salud de fuentes. (parcial)
    - [ ] Modelar tablas de centros, aliases, enlaces a fuentes y revisiones manuales. (parcial)
    - [ ] Modelar tablas de horarios normalizados, reglas semanales, overrides, cierres, notas y confianza. (parcial)
    - [ ] Modelar tablas de incidencias, eventos y trazabilidad de cambios. (parcial)
    - [ ] Modelar tablas de ratings agregados, votos individuales y senales antifraude. (parcial)
    - [ ] Modelar tablas de admins de centro, activaciones, resets, sesiones y auditoria. (parcial)
    - [ ] Modelar tablas de admin global, parametros operativos y cola de anomalias.
    - [ ] Modelar tablas de nodos de transporte, enlaces centro-transporte y fiabilidad por dato.
    - [ ] Modelar tablas de cobertura SER y callejero auxiliar.
    - [ ] Crear migraciones SQL iniciales separadas por bounded context. (parcial)
    - [x] Dependencia: Fase 2.
    - [ ] Criterio de aceptacion: esquema D1 versionado y coherente con los casos de uso publicos y admin.
- [ ] Fase 4. Ingesta oficial de centros (en curso)
    - [x] Implementar cliente de descarga para salas de estudio del Ayuntamiento.
    - [x] Implementar cliente de descarga para bibliotecas y bibliobuses del Ayuntamiento.
    - [ ] Normalizar encoding, entidades HTML, separadores, numericos y coordenadas. (parcial)
    - [x] Aplicar reglas estrictas para excluir bibliotecas al aire libre, salas al aire libre, parques y espacios abiertos.
    - [x] Unificar tipologia minima `library` y `study_room`.
    - [ ] Resolver duplicados, slugs estables y claves externas. (parcial)
    - [x] Extraer campos operativos base: telefono, direccion, distrito, barrio, aforo, accesibilidad y notas.
    - [ ] Marcar features inferidas solo cuando el origen o la evidencia lo permitan de forma explicita. (parcial)
    - [ ] Persistir rechazos y motivos de descarte para auditoria.
    - [x] Dependencia: Fase 3.
    - [x] Criterio de aceptacion: la base contiene solo equipamientos interiores validos para estudio.
- [ ] Fase 5. Parser y normalizacion de horarios (en curso)
    - [x] Definir el modelo persistente de horario semanal, multiples franjas y cierres completos.
    - [ ] Implementar segmentacion de bloques por audiencia y etiquetas de horario.
    - [x] Implementar extraccion de reglas semanales por dia de semana.
    - [ ] Implementar extraccion de cierres festivos y overrides parciales por fecha.
    - [ ] Implementar deteccion de horarios especiales de examenes y jornadas reducidas.
    - [x] Persistir `schedule_source`, `schedule_confidence`, `notes_unparsed` y `needs_manual_review`. (base minima)
    - [ ] Implementar cola de revision manual para casos ambiguos.
    - [ ] Construir golden fixtures con formatos reales heterogeneos.
    - [x] Dependencia: Fase 4.
    - [ ] Criterio de aceptacion: cada centro tiene horario persistente usable, confianza calculada y notas no estructuradas separadas.
- [ ] Fase 6. Motor operativo open/close (en curso)
    - [x] Implementar calculo de `is_open_now`.
    - [x] Implementar calculo de `next_change_at`.
    - [ ] Implementar calculo de `special_schedule_active`.
    - [ ] Implementar calculo de `today_summary` y `next_opening`.
    - [x] Resolver timezone local de Madrid en todos los calculos.
    - [ ] Definir politica para horarios sin confianza suficiente. (parcial)
    - [ ] Exponer etiquetas de estado: abierta, cerrada y proximo cambio. (parcial)
    - [x] Dependencia: Fase 5.
    - [ ] Criterio de aceptacion: listado y detalle pueden resolver estado operativo sin texto libre ambiguo.
- [ ] Fase 7. Enriquecimiento de transporte y movilidad
    - [ ] Ingerir lineas y paradas EMT oficiales.
    - [ ] Integrar disponibilidad BiciMAD oficial.
    - [ ] Integrar cobertura SER desde Geoportal y callejero.
    - [ ] Integrar datos oficiales CRTM necesarios para metro, cercanias e interurbanos.
    - [ ] Etiquetar cada dato de movilidad con `realtime`, `static_estimate` o `heuristic`.
    - [ ] Resolver parada EMT y estacion BiciMAD mas utiles por centro.
    - [ ] Resolver nodos CRTM razonables por centro para usuarios fuera del municipio.
    - [ ] Disenar heuristica minima para tiempo estimado en coche y tiempo total compuesto.
    - [ ] Persistir enlaces centro-transporte y refrescos incrementales.
    - [x] Dependencia: Fase 4.
    - [ ] Criterio de aceptacion: cada centro puede mostrar transporte util, accionable y con fiabilidad trazable.
- [ ] Fase 8. API publica (en curso)
    - [ ] Definir contratos JSON de catalogo, detalle, filtros, ordenacion y bootstrap. (parcial)
    - [x] Implementar `GET /api/public/catalog`.
    - [ ] Implementar `GET /api/public/centers/:slug`.
    - [ ] Implementar `GET /api/public/filters`.
    - [x] Implementar `GET /api/health`.
    - [ ] Aplicar validacion de query params y saneamiento de entrada. (parcial)
    - [ ] Exponer filtros obligatorios: abierto ahora, abre pronto, 24h, wifi, enchufes, accesible, aforo, plazas disponibles, distrito, barrio, tipo, incidencias, eventos, BiciMAD, EMT y CRTM.
    - [ ] Exponer ordenacion obligatoria: distancia, tiempo estimado total, valoracion, disponibilidad, cierre y relevancia compuesta.
    - [ ] Incorporar headers de cache y metadatos de fiabilidad. (parcial)
    - [x] Dependencia: Fases 6 y 7.
    - [ ] Criterio de aceptacion: la API publica cubre el concepto de pantalla sin vender precision falsa.
- [ ] Fase 9. Ratings sin red social
    - [ ] Definir modelo de voto numerico 1 a 5 sin comentarios. (parcial)
    - [ ] Integrar Cloudflare Turnstile en el flujo de voto.
    - [ ] Disenar limitacion antiabuso por hash de IP, huella ligera y ventana temporal.
    - [ ] Definir politica de reintento y cooldown por centro.
    - [ ] Calcular agregados visibles y contadores fiables. (parcial)
    - [ ] Exponer herramientas minimas de moderacion para admin global.
    - [x] Dependencia: Fase 8.
    - [ ] Criterio de aceptacion: los usuarios pueden valorar con friccion minima y fraude basico contenido sin cuentas sociales.
- [ ] Fase 10. Auth y panel admin de centros
    - [ ] Modelar admins de centro vinculados a email corporativo. (parcial)
    - [ ] Implementar flujo de activacion por email corporativo.
    - [ ] Implementar flujo de set de contrasena inicial.
    - [ ] Implementar flujo de login con sesion segura.
    - [ ] Implementar flujo de reset de contrasena.
    - [ ] Implementar pantalla de edicion de horario normalizado.
    - [ ] Implementar gestion de horarios especiales, incidencias y eventos.
    - [ ] Implementar edicion controlada de telefono y datos operativos permitidos.
    - [ ] Implementar preview publico de la ficha.
    - [ ] Persistir trazabilidad de cambios por actor. (parcial)
    - [x] Dependencia: Fases 5, 6 y 8.
    - [ ] Criterio de aceptacion: un centro puede gestionar su ficha con control simple y trazable.
- [ ] Fase 11. Admin global
    - [ ] Implementar gestion global de centros.
    - [ ] Implementar gestion global de incidencias y eventos.
    - [ ] Implementar gestion de admins de centro.
    - [ ] Implementar cola de revisiones manuales del parser de horarios.
    - [ ] Implementar cola de anomalias de datos y salud de fuentes.
    - [ ] Implementar disparadores manuales de ingesta y refresco.
    - [ ] Implementar vista de auditoria de cambios.
    - [ ] Implementar herramientas de moderacion de ratings si son necesarias.
    - [ ] Implementar parametros operativos basicos.
    - [x] Dependencia: Fases 4, 5, 8, 9 y 10.
    - [ ] Criterio de aceptacion: existe control global suficiente para operar la app sin tocar base de datos manualmente.
- [ ] Fase 12. Frontend publico y port de UI desde v0 (en curso)
    - [x] Rehacer layout y tokens del frontend sobre React + Vite + Tailwind.
    - [ ] Portar de `v0.app` solo las piezas visuales utiles para home, listado, ficha y filtros. (parcial)
    - [x] Eliminar del port todo componente generico de `shadcn` que no se use de verdad.
    - [ ] Adaptar tarjetas, filtros y bloques de transporte a los contratos nuevos de la API. (parcial)
    - [ ] Rehacer el modal de rating para ajustarlo a voto numerico puro.
    - [ ] Crear vistas publicas para home, listado, detalle y estado vacio. (parcial)
    - [ ] Crear vistas admin de centro y admin global sobre la misma base visual.
    - [ ] Garantizar rendimiento y claridad visual en movil y escritorio. (parcial)
    - [x] Dependencia: Fases 8, 9, 10 y 11.
    - [ ] Criterio de aceptacion: la UI final usa la referencia de `v0.app` sin heredar su arquitectura ni su deuda.
- [ ] Fase 13. Observabilidad, tests y hardening (en curso)
    - [ ] Implementar logging estructurado por request, job y actor. (parcial)
    - [ ] Anadir identificadores de correlacion y errores tipados.
    - [ ] Cubrir dominio con pruebas unitarias de horarios, filtros, ordenacion y fiabilidad.
    - [ ] Cubrir ingestion con fixtures reales y golden tests.
    - [ ] Cubrir API con tests de contrato.
    - [ ] Cubrir flujos criticos con E2E: catalogo, detalle, rating, activacion, reset y admin.
    - [ ] Aplicar rate limiting y timeouts sensatos en endpoints sensibles.
    - [ ] Revisar CSP, cookies, headers y saneamiento de HTML/texto.
    - [x] Dependencia: Fases 4 a 12.
    - [ ] Criterio de aceptacion: la app queda protegida frente a regresiones obvias y fallos de terceros previsibles.
- [ ] Fase 14. Despliegue, operacion y documentacion minima (en curso)
    - [ ] Configurar despliegue preview y produccion para `alabiblio.org`. (parcial)
    - [ ] Preparar migraciones D1 por entorno. (parcial)
    - [ ] Definir estrategia de seeds y datos de arranque. (parcial)
    - [ ] Documentar runbook minimo de deploy y rollback.
    - [ ] Documentar procedimiento de refresco de fuentes y revision manual.
    - [ ] Documentar decision final de proveedor de email transaccional. (parcial)
    - [ ] Verificar requisitos de atribucion y licencia para CRTM y demas fuentes.
    - [x] Dependencia: Fases 2 a 13.
    - [ ] Criterio de aceptacion: el proyecto puede desplegarse, operarse y mantenerse sin conocimiento tribal.
