# ROADMAP UI

- [x] Objetivo
  - [x] Integrar solo el diseño visual del listado del ZIP de v0 dentro de la app actual.
  - [x] Mantener intactas la lógica, la navegación, los contratos API y la arquitectura existente.
  - [x] Reutilizar composición, jerarquía y estilo visual del ZIP hasta el máximo posible dentro de datos y alcance reales.
  - Evidencia:
    - referencia ZIP: `tmp/v0-import/extracted/app/listado/page.tsx`, `tmp/v0-import/extracted/components/library-card.tsx`, `tmp/v0-import/extracted/components/filters-panel.tsx`, `tmp/v0-import/extracted/components/background-illustration.tsx`
    - integración real: `apps/web/src/features/centers/screens/CatalogScreen.tsx`, `apps/web/src/features/centers/components/CenterCard.tsx`, `apps/web/src/features/centers/components/CenterRowItem.tsx`, `apps/web/src/features/ui/FilterDrawer.tsx`, `apps/web/src/styles/product.css`

- [x] Reglas de integración
  - [x] No copiar el demo entero ni importar páginas `app/*` del ZIP.
  - [x] No importar infraestructura `Next`, `Tailwind`, `shadcn`, `Radix` ni `next-themes`.
  - [x] No añadir dependencias del ZIP salvo necesidad extrema y justificada.
  - [x] No crear rutas paralelas, pantallas `V2` ni componentes duplicados.
  - [x] No mantener mocks, `console.log`, `sample data` ni utilidades duplicadas.
  - [x] No tocar backend, scopes ni contratos API por un rediseño visual.
  - [x] No meter estilos globales del ZIP dentro de la app actual.
  - Evidencia:
    - `package.json` sin dependencias nuevas del ZIP
    - `apps/web/src` sin imports de `tmp/v0-import/*`

- [x] Fuentes del ZIP que sí sirven
  - [x] `tmp/v0-import/extracted/app/listado/page.tsx`
  - [x] `tmp/v0-import/extracted/components/library-card.tsx`
  - [x] `tmp/v0-import/extracted/components/filters-panel.tsx`
  - [x] `tmp/v0-import/extracted/components/background-illustration.tsx`
  - [x] `tmp/v0-import/extracted/app/globals.css`
  - Evidencia:
    - usadas como referencia visual directa para `CatalogScreen`, `CenterCard`, `CenterRowItem`, `FilterDrawer` y `BackgroundIllustration`

- [x] Fuentes del ZIP prohibidas
  - [x] `tmp/v0-import/extracted/app/page.tsx`
  - [x] `tmp/v0-import/extracted/app/layout.tsx`
  - [x] `tmp/v0-import/extracted/components/theme-provider.tsx`
  - [x] `tmp/v0-import/extracted/components/ui/*`
  - [x] `tmp/v0-import/extracted/hooks/*`
  - [x] `tmp/v0-import/extracted/lib/utils.ts`
  - [x] `tmp/v0-import/extracted/public/placeholder*`
  - [x] `tmp/v0-import/extracted/package.json`
  - Evidencia:
    - no integrados en runtime ni en la arquitectura actual

- [x] Fase 1 - Preparación
  - [x] Mantener el ZIP en `tmp/v0-import/` fuera de `src`.
  - [x] Usar el ZIP solo como referencia de composición y estilo.
  - [x] Confirmar que los puntos de entrada reales siguen siendo `CatalogScreen.tsx`, `CenterCard.tsx`, `CenterRowItem.tsx` y `FilterDrawer.tsx`.
  - Evidencia:
    - ZIP: `tmp/v0-import/v0-export.zip`
    - entrypoints reales: [CatalogScreen.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/screens/CatalogScreen.tsx), [CenterCard.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterCard.tsx), [CenterRowItem.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterRowItem.tsx), [FilterDrawer.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/ui/FilterDrawer.tsx)

- [x] Fase 2 - CatalogScreen
  - [x] Reordenar la jerarquía visual del listado inspirándose en `app/listado/page.tsx`.
  - [x] Mantener `useCatalogScreen` como única fuente de lógica.
  - [x] Reusar `SearchField`, `FilterDrawer`, navegación y estados existentes.
  - [x] Eliminar UI técnica o redundante que estorbaba al layout del listado.
  - Evidencia:
    - archivos: [CatalogScreen.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/screens/CatalogScreen.tsx), [product.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/styles/product.css)
    - commits: `e983df2b92e3b0207ad456c86dc418fda8416e79`, `a35da8231814cf633c4a081b1cd3c3952d7c799c`
    - producción: `https://alabiblio.org/listado`
    - cierre: cerrada dentro del alcance de listado

- [x] Fase 3 - CenterCard y CenterRowItem
  - [x] Adaptar composición visual y densidad desde `components/library-card.tsx`.
  - [x] Mantener datos reales, scopes y copy honesto de la app actual.
  - [x] No introducir tipos de dominio del ZIP.
  - [x] No introducir expansiones, reviews ni bloques no soportados por el contrato real.
  - Evidencia:
    - archivos: [CenterCard.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterCard.tsx), [CenterCard.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterCard.css), [CenterRowItem.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterRowItem.tsx)
    - commits: `e983df2b92e3b0207ad456c86dc418fda8416e79`, `a35da8231814cf633c4a081b1cd3c3952d7c799c`
    - cierre: cerrada dentro del alcance de listado

- [x] Fase 4 - FilterDrawer
  - [x] Adaptar estructura visual usando referencias de `components/filters-panel.tsx`.
  - [x] Mantener filtros, orden y semántica reales del catálogo base.
  - [x] No convertir el drawer en un sistema paralelo.
  - Evidencia:
    - archivos: [FilterDrawer.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/ui/FilterDrawer.tsx), [product.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/styles/product.css)
    - commits: `e983df2b92e3b0207ad456c86dc418fda8416e79`, `a35da8231814cf633c4a081b1cd3c3952d7c799c`, `29ebfe3e6be5e2cf05d5795447ea4bbe3fbeea90`
    - producción verificada: [listado-production-final.png](C:/Users/ttefm/OneDrive/Documents/alabiblio/.tmp-visual/catalog-v0-prod-iter2/listado-production-final.png)
    - cierre: cerrada dentro del alcance de listado

- [x] Fase 5 - Tokens y estilos
  - [x] Llevar solo decisiones visuales útiles a `product.css` y CSS local existente.
  - [x] No importar `globals.css` del ZIP.
  - [x] Mantener el sistema de tema actual con `data-theme`.
  - [x] Evitar CSS global agresivo que rompa Top, Detalle o shell.
  - Evidencia:
    - estilos en [product.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/styles/product.css) y [CenterCard.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterCard.css)
    - commit final de refinado: `4f0648a3a9989462e996af52c6905b85fb8bd389`
    - cierre: cerrada dentro del alcance de listado

- [x] Fase 6 - Validación
  - [x] `typecheck`
  - [x] `lint`
  - [x] `test`
  - [x] `build`
  - [x] Verificar que no hay imports del ZIP en runtime.
  - [x] Verificar que no entran mocks, rutas paralelas ni dependencias nuevas.
  - [x] Verificar que listado sigue respetando `base_exploration`.
  - Evidencia:
    - binario usado: `C:\Users\ttefm\OneDrive\Documents\node-v22.22.1-win-x64\pnpm.cmd`
    - resultado: `test` 86/86, `build` OK, `smoke:production` OK
    - producción actual: `https://alabiblio.org/listado` sirve `index-Dmxej4c2.js` y `index-DFaa33Zb.css`
    - cierre: validación completa ejecutada

- [x] Fase 7 - Integración visual de listado
  - [x] Compactar hero, búsqueda y controles para eliminar paneles vacíos y acercar la composición al ZIP.
  - [x] Rehacer la fila base y la card base con jerarquía y badges más cercanos a `library-card.tsx`.
  - [x] Recentrar visualmente el panel de filtros hacia el look de `filters-panel.tsx` sin cambiar su lógica real.
  - [x] Completar la ilustración de fondo y ajustar el light mode del listado para mejorar fidelidad visual.
  - Evidencia:
    - archivos: [CatalogScreen.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/screens/CatalogScreen.tsx), [CenterRowItem.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterRowItem.tsx), [CenterCard.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/centers/components/CenterCard.css), [BackgroundIllustration.tsx](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/features/ui/BackgroundIllustration.tsx), [product.css](C:/Users/ttefm/OneDrive/Documents/alabiblio/apps/web/src/styles/product.css)
    - commits: `a35da8231814cf633c4a081b1cd3c3952d7c799c`, `29ebfe3e6be5e2cf05d5795447ea4bbe3fbeea90`, `4f0648a3a9989462e996af52c6905b85fb8bd389`
    - producción: `https://alabiblio.org/listado`
    - captura final: [listado-production-final.png](C:/Users/ttefm/OneDrive/Documents/alabiblio/.tmp-visual/catalog-v0-prod-iter2/listado-production-final.png)
    - cierre: cerrada dentro del alcance de listado

- [x] Fase 8 - Handoff
  - [x] Dejar constancia de qué partes del ZIP ya se absorbieron visualmente.
  - [x] Registrar que el listado quedó cerrado dentro del alcance definido.
  - [x] No tocar Top ni Detalle dentro de esta migración visual.
  - Evidencia:
    - producción contrastada: `https://alabiblio.org/listado`
    - versión desplegada: `73e8f103-d9db-4ba0-9904-14e86c3fcbc7`
    - captura final: `C:\Users\ttefm\OneDrive\Documents\alabiblio\.tmp-visual\catalog-v0-prod-iter2\listado-production-final.png`

- [x] Estado real al cierre de esta sesión
  - [x] Hay una integración visual funcional y desplegada del listado.
  - [x] El listado respeta lógica, datos reales y contratos existentes.
  - [x] Producción está actualizada y verificada.
  - [x] El listado queda cerrado dentro del alcance definido.
  - [x] Las diferencias restantes frente al ZIP quedan registradas como limitaciones reales aceptadas.
  - Evidencia:
    - producción actual: `https://alabiblio.org/listado`
    - versión desplegada: `73e8f103-d9db-4ba0-9904-14e86c3fcbc7`
    - commits relevantes: `e983df2b92e3b0207ad456c86dc418fda8416e79`, `a35da8231814cf633c4a081b1cd3c3952d7c799c`, `29ebfe3e6be5e2cf05d5795447ea4bbe3fbeea90`, `4f0648a3a9989462e996af52c6905b85fb8bd389`

- [x] Limitaciones reales aceptadas
  - [x] El listado base no muestra ratings ni reviews del demo porque el contrato real no los expone en este scope.
  - [x] El listado base no clona transporte enriquecido del demo porque eso pertenece a contexto `origin_enriched`, no a `base_exploration`.
  - [x] La shell global superior no replica literalmente la del demo porque queda fuera del alcance de “solo listado”.
  - [x] El resultado final prioriza fidelidad visual máxima compatible con datos y semántica reales, no clonación fake del demo.

- [ ] Próxima pantalla - Top
  - [x] Mapear referencia visual del ZIP para Top contra `TopPicksScreen` y `TopMobilityCard`.
  - [x] Rehacer `TopMobilityCard.tsx` desde la estructura visual de `components/library-card.tsx` para eliminar mezcla con estilos heredados.
  - [x] Ejecutar una segunda iteración visual de Top sobre `TopPicksScreen.tsx`, `TopMobilityCard.tsx`, `TopMobilityCard.css` y `product.css`.
  - [x] Corregir anchura, densidad y superficies de la card de Top para acercarla al bloque visual del demo y eliminar el look sobredimensionado de producción.
  - [x] Validar y desplegar la reescritura de Top sin romper listado ya cerrado.
  - [ ] Cerrar Top dentro del alcance real de la pantalla.
  - Evidencia:
    - referencia ZIP: `tmp/v0-import/extracted/app/page.tsx`, `tmp/v0-import/extracted/components/library-card.tsx`, `tmp/v0-import/extracted/components/background-illustration.tsx`
    - archivos tocados: `apps/web/src/features/centers/screens/TopPicksScreen.tsx`, `apps/web/src/features/centers/components/TopMobilityCard.tsx`, `apps/web/src/features/centers/components/TopMobilityCard.css`, `apps/web/src/styles/product.css`
    - evidencias visuales: `.tmp-visual/top-local-check-2/top-dark.png`, `.tmp-visual/top-local-check-2/top-light.png`, `.tmp-visual/top-production-final-pass/top-dark.png`, `.tmp-visual/top-production-final-pass/top-light.png`
    - commit actual: `9e43565`
    - producción actual: `https://alabiblio.org/` · versión `b9efca96-d59a-49ab-999c-e6b828d5eebc`
    - estado actual: hero y cards rehechos; la card ya replica mucho mejor la estructura del demo y elimina la mezcla rota anterior, pero Top sigue abierto hasta decidir si esta fidelidad ya es suficiente dentro del alcance real
    - limitaciones previsibles: no se clonan ratings, reviews ni occupancy fake del demo porque el dominio real de `top-mobility` no los soporta
