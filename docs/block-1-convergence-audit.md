# Bloque 1. Convergencia de base, esquema y verdad de datos

## Conservar

- `workers/edge` como punto único de serving de assets y API.
- `packages/contracts` como contrato compartido de frontend y backend.
- `packages/domain` como base de reglas puras reutilizables.
- `packages/infrastructure/src/catalogStore.ts` como implementación vigente mientras se divide por bounded contexts.
- `apps/web/src/lib/publicCatalog.ts` y `apps/web/src/lib/theme.tsx` como base estable de consumo público y tema.
- `references/v0` y `references/ui` como material de referencia visual.

## Refactorizar

- `packages/infrastructure/src/catalogStore.ts`: dividir en esquema, ingesta, catálogo, detalle, filtros y movilidad.
- `apps/web/src/components/LibraryCard.tsx`: separar composición de resumen, transporte, estado y CTA.
- `apps/web/src/routes/CenterDetailRoute.tsx`: eliminar duplicidad de información respecto a la card.
- Contratos de features visibles para reflejar procedencia real de `wifi`, `aforo`, movilidad y estados de dato.
- Migraciones D1 para que reflejen el esquema realmente usado por runtime.

## Eliminar o aislar

- `apps/web/src/components/CatalogCard.tsx`: componente huérfano fuera del flujo público actual.
- Artefactos temporales en raíz del repo con prefijo `tmp-`.
- Logs temporales de verificación local y salidas de comando no necesarias para operación estable.

## Resultado esperado del bloque

- El repo deja de depender de artefactos temporales y de un esquema implícito.
- La clasificación de procedencia de datos queda alineada con contratos y UI.
- Queda documentado qué se mantiene y qué se reestructura en los bloques siguientes.
