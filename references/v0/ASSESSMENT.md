# Evaluacion del ZIP de v0.app

## Archivos utiles como referencia visual

- `app/page.tsx`
- `app/listado/page.tsx`
- `components/library-card.tsx`
- `components/filters-panel.tsx`
- `components/background-illustration.tsx`

## Archivos que no deben integrarse tal cual

- Todo el scaffold Next.js del ZIP.
- El volcado completo de `components/ui/*`.
- Datos mockeados, estado local acoplado y logica de filtros embebida en pantalla.
- `review-modal.tsx` en su forma actual porque el producto objetivo no admite comentarios de texto ni valoraciones por aspecto como flujo principal.

## Reutilizacion correcta

- Portar composicion visual, jerarquia de bloques y decisiones de densidad.
- Reescribir los componentes sobre contratos nuevos y datos reales.
- Importar solo primitives de UI que se necesiten de verdad.
- Eliminar dependencias y wrappers genericos sobrantes antes de meter la UI en produccion.

## Mapeo al rebuild

- `app/page.tsx` inspira la home publica.
- `app/listado/page.tsx` inspira el catalogo y su shell de filtros.
- `components/library-card.tsx` inspira tarjeta de centro y resumen de movilidad.
- `components/filters-panel.tsx` inspira panel avanzado de filtros.
- `review-modal.tsx` se rehace como modal de rating numerico minimo.
