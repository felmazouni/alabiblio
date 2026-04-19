# Bloque 2. Auditoría de normalización de centros

## Estado observado en preview tras reingesta

- Centros publicados: `115`
- Slugs duplicados: `0`
- Espacios al aire libre retenidos por error: `0`
- Rechazos persistidos con motivo: `7`
- Centros con teléfono útil en las fuentes actuales: `0`
- Centros con email útil en las fuentes actuales: `0`
- Centros con web/ficha oficial: `115`

## Campos visibles recomendados

- `name`: visible.
- `addressLine`: visible.
- `district`: visible.
- `neighborhood`: visible.
- `websiteUrl`: visible como ficha oficial.
- `schedule`: visible.
- `accessibility`: visible cuando esté indicada.
- `wifi`: visible solo como dato detectado o confirmado según procedencia.
- `capacityValue`: visible solo cuando exista y con procedencia explícita.
- `transportText`: no visible como bloque bruto; se usa para derivación estructurada o textual etiquetada.

## Campos que no deben venderse como completos

- `phone`: no visible como claim estable mientras la fuente actual no lo aporte de forma útil.
- `email`: no visible como claim estable mientras la fuente actual no lo aporte de forma útil.
- `wifi`: no puede presentarse como dato estructurado si proviene de texto oficial.
- `capacityValue`: no puede presentarse como aforo estructurado si proviene de texto oficial.

## Rechazos persistidos

Los 7 rechazos actuales corresponden a espacios abiertos o no válidos para estudio interior, principalmente parques, plazas y espacios de lectura al aire libre de `study_rooms`.

## Resultado de este bloque

- La entidad canónica queda reingestada, sin duplicados detectados, sin espacios abiertos retenidos y con procedencia visible más honesta.
- La auditoría deja por escrito qué campos sí se pueden enseñar y cuáles deben seguir ocultos o degradados hasta tener mejor fuente.
