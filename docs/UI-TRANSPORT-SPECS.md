# UI TRANSPORT SPECS

Fecha: 2026-04-04

## Objetivo

Fijar la composición exacta de transporte para:

1. tarjeta principal del explorador
2. cards secundarias
3. detalle

Sin ambigüedad visual ni textual.

## 1. Tarjeta principal

### Bloque: `LLEGAR AHORA`

Debe contener exactamente 4 módulos, en este orden:

1. `COCHE`
2. `BUS EMT`
3. `BICIMAD`
4. `METRO`

Debajo:

- una sola línea de motivo de recomendación

## 2. Especificación exacta del bloque principal

### 2.1 Coche

Campos, en orden:

- `estimated_car_eta_min`
- `ser.enabled`
- `ser.zone_name`

Render compacto:

`Coche 12 min · SER verde`

Fallback:

- si no hay origen:
  - `Coche sin origen`
- si no hay SER:
  - `Coche 12 min · SER sin dato`

### 2.2 Bus EMT

Campos, en orden:

- línea seleccionada
- parada origen
- distancia a parada origen
- próxima llegada
- parada destino
- distancia final al centro

Render estructurado:

`[132] Moncloa · YO Moncloa 140m · 3 min · DEST Princesa 210m`

Fallbacks:

- sin realtime:
  - mantener línea y anchors
  - `sin realtime`
- sin línea útil:
  - `Sin línea útil`
  - mostrar distancia a parada origen si existe

### 2.3 BiciMAD

Campos, en orden:

- tiempo total estimado
- estación origen
- distancia origen
- bicis disponibles
- estación destino
- distancia destino
- anclajes disponibles

Render estructurado:

`Bici 11 min · YO 57 80m ×6 · DEST 129 35m P×4`

Fallbacks:

- sin realtime:
  - mantener estaciones y distancias
  - cifras `×-` / `P-`
- sin origen:
  - `Bici sin origen`

### 2.4 Metro

Campos, en orden:

- tiempo total estimado
- estación origen
- líneas origen
- distancia origen
- estación destino
- líneas destino
- distancia destino

Render estructurado:

`Metro 14 min · YO L6 Moncloa 180m · DEST L3 Callao 220m`

Fallbacks:

- si no hay destino:
  - `Metro · DEST sin dato`
- si no hay ETA fiable:
  - se mantiene anchor + líneas
  - se omite tiempo total

## 3. Motivo de recomendación

Una sola línea, después de los cuatro módulos.

Ejemplos válidos:

- `Recomendado por menor tiempo total y centro abierto`
- `Recomendado por EMT con llegada inmediata`
- `Recomendado por BiciMAD con stock y anclaje`

Prohibido:

- párrafos
- explicación larga
- repetir datos visibles en módulos

## 4. Cards secundarias

Regla:

- solo dos highlights de movilidad
- no duplicar detalle

### Campos permitidos

- mejor modo
- segundo mejor modo
- SER solo si el mejor modo es coche
- línea EMT solo si el mejor modo es bus
- tiempo total o próxima llegada

Ejemplos:

- `Coche 10 min · SER verde`
- `Bus 132 · 3 min`
- `Bici 11 min · ×6`
- `Metro · Moncloa -> Callao`

### Campos prohibidos

- lista de cuatro módulos
- anchors completos de origen y destino
- explicación larga

## 5. Detalle

### Cabecera

Orden:

1. nombre
2. estado
3. horario hoy
4. capacidad
5. mejor modo
6. confidence solo si aporta

### Bloque `Cómo llegar`

Debe reutilizar la misma semántica de los cuatro módulos:

- coche
- EMT
- BiciMAD
- Metro

Pero con más detalle por módulo:

- opción primaria
- opción secundaria si existe
- estado de degradación

### Mapa

Debe mostrar:

- origen
- centro
- parada EMT origen seleccionada
- parada EMT destino seleccionada
- estación BiciMAD origen
- estación BiciMAD destino
- estación Metro origen
- estación Metro destino

## 6. Degradación y fallbacks

### EMT realtime caído

Mostrar:

- línea útil si existe
- parada origen
- parada destino
- badge `sin realtime`

### BiciMAD realtime caído

Mostrar:

- estaciones origen y destino
- distancias
- badge `sin realtime`

### Origen no disponible

Mostrar:

- coche sin origen
- EMT sin origen
- Bici sin origen
- Metro sin origen

### Geolocalización denegada

Mostrar:

- mismo comportamiento que sin origen
- texto superior de origen:
  - `Permiso denegado`

### Centro sin anchor útil en un modo

Mostrar:

- fallback por módulo:
  - `DEST sin dato`
  - `Sin línea útil`
  - `Sin estación útil`

Prohibido:

- `Modo no disponible` genérico como única explicación

## 7. Reglas visuales cerradas

- sin prosa larga
- una línea por módulo en card principal
- misma retícula para los 4 módulos
- SER en primer nivel dentro del módulo coche
- color solo para:
  - ETA
  - disponibilidad
  - SER
- iconografía:
  - coche
  - bus
  - bike
  - metro
  - users
  - map-pin
  - clock

## 8. Frontera UI entre principal y secundarias

### Tarjeta principal

- siempre 4 módulos
- siempre motivo

### Cards secundarias

- máximo 2 highlights
- sin motivo
- sin detalle completo
