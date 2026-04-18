## Estado real del port visual de v0

### Componentes del ZIP portados casi 1:1
- `app/page.tsx`
  - Portado como estructura de landing en `apps/web/src/routes/HomeRoute.tsx`.
  - Se mantiene la jerarquia `header -> hero -> metricas -> CTAs -> Top 3`.
- `app/listado/page.tsx`
  - Portado como estructura de listado en `apps/web/src/routes/PublicCatalogRoute.tsx`.
  - Se mantiene la separacion `toolbar -> contador de resultados -> cards`.
- `components/background-illustration.tsx`
  - Portado de forma muy cercana en `apps/web/src/components/BackgroundIllustration.tsx`.
  - Mantiene composicion wireframe, grid y fondos suaves.

### Componentes reescritos
- `components/library-card.tsx`
  - Reescrito en `apps/web/src/components/LibraryCard.tsx`.
  - Motivo: el export original dependia de datos mock, tipos locales, componentes `ui/*` y bloques de movilidad/opiniones con datos ficticios.
- `components/filters-panel.tsx`
  - Reescrito en `apps/web/src/components/FiltersPanel.tsx`.
  - Motivo: el export original dependia de primitives de `shadcn/ui` y de un estado local no alineado con la API real.
- `review-modal.tsx`
  - No portado como tal.
  - Motivo: el producto final no admite comentarios de texto ni flujo social de opiniones como en el mock.

### Cambios respecto al ZIP original
- Se sustituyo `Next.js App Router` por `React + Vite + react-router-dom`.
- Se eliminaron primitives `components/ui/*` del ZIP y se rehicieron controles solo con HTML + Tailwind utilitario.
- Se cambiaron algunos espaciados y densidad para adaptarlos rapidamente a datos reales.
- Se simplifico el bloque de movilidad.
- Se simplifico el bloque de ratings cuando no existen datos reales.
- Se separaron rutas reales:
  - `/`
  - `/top`
  - `/listado`
  - `/centros/:slug`

### Assets del ZIP no usados ahora mismo
- Todo `components/ui/*`
- `components/theme-provider.tsx`
- `components/review-modal.tsx`
- `hooks/*`
- `lib/utils.ts`
- `public/apple-icon.png`
- `public/icon-dark-32x32.png`
- `public/icon-light-32x32.png`
- `public/placeholder*`
- `styles/globals.css`
- `app/layout.tsx`

### Lo que falta para fidelidad visual maxima
- Igualar spacing exacto entre hero, metricas y cards.
- Igualar tamaños exactos de tipografia y pesos visuales.
- Igualar composicion de la card en modo `card` y en modo `list`.
- Igualar el acordeon de `Como llegar` con el mismo ritmo visual del ZIP.
- Igualar mejor el modal de filtros por tabs, separadores, paddings y controles.
- Igualar CTAs, iconografia y jerarquia microvisual con menos reinterpretacion.

### Dependencias de datos que impiden identidad total hoy
- No existen ratings reales agregados ni subratings reales por centro.
- No existen opciones reales de movilidad enriquecida con la misma riqueza del mock.
- No existe distancia real al usuario sin geolocalizacion activa.
- No existe ocupacion en tiempo real para la mayoria de centros.

### Distancia real actual entre preview y referencia v0
- Media

### Motivo para seguir en preview
- El port visual aun no es de fidelidad maxima respecto al ZIP.
- La app publica aun no tiene:
  - ratings reales
  - detalle dedicado por endpoint
  - transporte enriquecido real
  - geolocalizacion y ranking final
  - filtros finales
  - auth/admin listos para produccion
  - dominio de produccion y D1 de produccion separados

### Bloqueo sobre las capturas adjuntas del hilo
- Los adjuntos visuales del hilo son referencia obligatoria.
- Desde este entorno no puedo exportarlos directamente a archivos binarios dentro del repo.
- Como sustituto operativo, se mantienen capturas verificadas del preview actual en `references/ui/*.png` y este manifiesto como fuente de verdad para el siguiente bloque de port fiel.
