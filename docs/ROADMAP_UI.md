# ROADMAP UI

- [x] Objetivo
  - [x] Integrar solo el diseño visual del listado del ZIP de v0 dentro de la app actual.
  - [x] Mantener intactas la lógica, la navegación, los contratos API y la arquitectura existente.
  - [x] Reutilizar únicamente ideas visuales y composición de UI, nunca la infraestructura del demo.

- [x] Reglas de integración
  - [x] No copiar el demo entero ni importar páginas `app/*` del ZIP.
  - [x] No importar infraestructura `Next`, `Tailwind`, `shadcn`, `Radix` ni `next-themes`.
  - [x] No añadir dependencias del ZIP salvo necesidad extrema y justificada.
  - [x] No crear rutas paralelas, pantallas `V2` ni componentes duplicados.
  - [x] No mantener mocks, `console.log`, `sample data` ni utilidades duplicadas.
  - [x] No tocar backend, scopes ni contratos API por un rediseño visual.
  - [x] No meter estilos globales del ZIP dentro de la app actual.

- [x] Fuentes del ZIP que si sirven
  - [x] `tmp/v0-import/extracted/app/listado/page.tsx` como referencia de jerarquía visual del listado.
  - [x] `tmp/v0-import/extracted/components/library-card.tsx` como referencia de composición de cards.
  - [x] `tmp/v0-import/extracted/components/filters-panel.tsx` como referencia de estructura interna del panel de filtros.
  - [x] `tmp/v0-import/extracted/components/background-illustration.tsx` solo como referencia ornamental.
  - [x] `tmp/v0-import/extracted/app/globals.css` solo como referencia de paleta, contraste y radios.

- [x] Fuentes del ZIP prohibidas
  - [x] `tmp/v0-import/extracted/app/page.tsx`
  - [x] `tmp/v0-import/extracted/app/layout.tsx`
  - [x] `tmp/v0-import/extracted/components/theme-provider.tsx`
  - [x] `tmp/v0-import/extracted/components/ui/*`
  - [x] `tmp/v0-import/extracted/hooks/*`
  - [x] `tmp/v0-import/extracted/lib/utils.ts`
  - [x] `tmp/v0-import/extracted/public/placeholder*`
  - [x] `tmp/v0-import/extracted/package.json`

- [x] Fase 1 - Preparacion
  - [x] Mantener el ZIP en `tmp/v0-import/` fuera de `src`.
  - [x] Usar el ZIP solo como referencia de composición y estilo.
  - [x] Confirmar que los puntos de entrada reales siguen siendo `CatalogScreen.tsx`, `CenterCard.tsx`, `CenterRowItem.tsx` y `FilterDrawer.tsx`.

- [x] Fase 2 - CatalogScreen
  - [x] Reordenar la jerarquía visual del listado inspirándose en `app/listado/page.tsx`.
  - [x] Mantener `useCatalogScreen` como única fuente de lógica.
  - [x] Reusar `SearchField`, `FilterDrawer`, navegación y estados existentes.
  - [x] Eliminar UI técnica o redundante si estorba al nuevo layout del listado.

- [x] Fase 3 - CenterCard y CenterRowItem
  - [x] Adaptar composición visual y densidad desde `components/library-card.tsx`.
  - [x] Mantener datos reales, scopes y copy honesto de la app actual.
  - [x] No introducir tipos de dominio del ZIP.
  - [x] No introducir expansiones, reviews ni bloques no soportados por el contrato real.

- [x] Fase 4 - FilterDrawer
  - [x] Adaptar estructura visual usando referencias de `components/filters-panel.tsx`.
  - [x] Mantener filtros, orden y semántica reales del catálogo base.
  - [x] No convertir el drawer en un sistema Radix/shadcn paralelo.

- [x] Fase 5 - Tokens y estilos
  - [x] Llevar solo decisiones visuales útiles a `tokens.css`, `product.css` o CSS local existente.
  - [x] No importar `globals.css` del ZIP.
  - [x] Mantener el sistema de tema actual con `data-theme`.
  - [x] Evitar CSS global agresivo que rompa top, detalle o shell.

- [x] Fase 6 - Validacion
  - [x] `typecheck`
  - [x] `lint`
  - [x] `test`
  - [x] `build`
  - [x] Verificar que no hay imports del ZIP en runtime.
  - [x] Verificar que no entran mocks, rutas paralelas ni dependencias nuevas.
  - [x] Verificar que listado sigue respetando `base_exploration`.

- [x] Fase 7 - Handoff
  - [x] Dejar constancia de qué partes del ZIP ya se absorbieron visualmente.
  - [x] Dejar pendientes explícitos antes de tocar Top o Detalle.
  - [x] Decidir si el fondo ornamental del ZIP entra también en listado o si se mantiene `DotGrid` como base.
  - [x] Decidir si la vista filas debe converger más hacia la card del ZIP o mantenerse más compacta.
  - [x] Registrar cualquier decisión aplazada sobre densidad, iconografía o tokens.
  - [ ] Revisar visualmente producción contra el ZIP y corregir diferencias residuales de layout.
  - [ ] No tocar Top ni Detalle hasta validar formalmente el listado en producción.
