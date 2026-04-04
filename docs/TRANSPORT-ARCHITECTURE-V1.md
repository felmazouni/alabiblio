# TRANSPORT ARCHITECTURE V1

Fecha: 2026-04-04

## Objetivo

Cerrar el diseño técnico del sistema de transporte para que la siguiente ejecución implemente sobre una arquitectura fija y no sobre heurísticas cambiantes.

## Principios

1. Separación estricta entre:
   - datos estáticos por centro
   - datos dependientes del origen
   - realtime
2. El explorador no hace realtime masivo para todos los centros.
3. El detalle sí puede pedir cálculo completo.
4. Cada campo pertenece a una sola capa.
5. Cuando un upstream falla, el sistema degrada por modo, no colapsa toda la movilidad.

## Capas canónicas

### A. `STATIC_CENTER`

Datos precalculables y persistibles por centro. Viven en D1 y se recomputan en sync batch.

Campos canónicos:

- `center_id`
- `ser_zone`
- `ser_enabled`
- `ser_distance_m`
- `car_access_flags`
- `emt_destination_stops[]`
- `emt_destination_stop_walk_distance_m`
- `metro_destination_stations[]`
- `metro_destination_walk_distance_m`
- `bicimad_destination_station`
- `bicimad_destination_walk_distance_m`
- `parking_candidates[]`
- `static_freshness.updated_at`

Fuentes:

- `center_ser_coverage`
- `center_transport_links`
- `transport_nodes`

Regla:

- ningún dato de esta capa depende del origen del usuario ni del reloj realtime.

### B. `ORIGIN_DEPENDENT`

Datos calculados por request o cache corto a partir del origen activo.

Campos canónicos:

- `origin.kind`
- `origin.label`
- `origin.coordinates`
- `origin_emt_stops[]`
- `origin_emt_stop_walk_distance_m`
- `origin_metro_station`
- `origin_metro_walk_distance_m`
- `origin_bicimad_station`
- `origin_bicimad_walk_distance_m`
- `estimated_car_eta_min`
- `walking_eta_min`

Regla:

- no persiste como dato maestro de centro
- no modifica el modelo estático
- se invalida al cambiar `origin`

### C. `REALTIME`

Datos efímeros con TTL corto y estado de degradación explícito.

Campos canónicos:

- `emt_next_arrivals`
- `emt_realtime_status`
- `emt_realtime_fetched_at`
- `bicimad_bikes_available`
- `bicimad_docks_available`
- `bicimad_realtime_status`
- `bicimad_realtime_fetched_at`
- `metro_realtime_status`
- `degraded_modes[]`

Regla:

- no se persiste en D1 como verdad histórica del centro
- se cachea con TTL corto
- no se consulta para todos los centros del explorador

## Modelo de composición

### Static anchors

Cada centro expone anchors de destino ya resueltos:

- `emt_destination_stops`
- `metro_destination_stations`
- `bicimad_destination_station`
- `parking_candidates`

### Origin anchors

Cada request con origen expone anchors de origen:

- `origin_emt_stops`
- `origin_metro_station`
- `origin_bicimad_station`

### Runtime composition

Con ambos lados disponibles:

1. coche:
   - `estimated_car_eta_min` + SER
2. EMT:
   - parada origen seleccionada
   - línea útil seleccionada
   - próxima llegada realtime
   - parada destino y distancia final
3. BiciMAD:
   - estación origen
   - bicis disponibles
   - estación destino
   - anclajes disponibles
   - tiempo total estimado
4. Metro:
   - estación origen
   - líneas
   - estación destino
   - tiempo total estimado

## Frontera entre explorador y detalle

### Explorador

Solo calcula completo para:

- tarjeta principal
- primera ventana visible

Para el resto:

- usa resumen estático
- usa walking fallback
- difiere realtime

### Detalle

Puede calcular:

- todos los modos
- ranking completo
- realtime del modo seleccionado
- mapa con anchors

## Algoritmo de ranking V1

Orden de decisión:

1. coche con ETA fiable
2. EMT con llegada realtime y línea útil
3. BiciMAD con origen/destino válidos
4. Metro con anchors válidos
5. walking fallback

Score conceptual:

- `total_eta_min`
- penalización por acceso largo
- penalización por degradación
- bonus por realtime válido
- bonus por centro abierto ahora

## Selección EMT V1

Hasta cerrar rutas/sentidos formales, la definición de línea útil queda fijada así:

1. tomar hasta `N=6` paradas EMT de origen
2. tomar hasta `M=4` paradas EMT de destino del centro
3. cruzar por `line_code` compartido
4. elegir la parada origen con:
   - menor distancia
   - y al menos una llegada realtime útil
5. si no hay llegada útil:
   - mantener mejor parada origen
   - degradar estado EMT

Queda explícitamente fuera de V1:

- secuencia formal de route stops
- directionality fuerte
- travel plan EMT

## Estados de degradación

Por modo:

- `ok`
- `partial`
- `degraded_upstream`
- `degraded_missing_anchor`
- `unavailable`

Regla:

- la degradación es por módulo
- nunca se responde con un único “modo no disponible” global si hay otros módulos útiles

## Decisiones cerradas

- `transport_routes` no forma parte de V1
- KV y R2 no forman parte de V1
- Metro realtime no forma parte de V1
- BiciMAD realtime sí forma parte de V1
- EMT realtime sí forma parte de V1
- el explorador usa visible-first como restricción obligatoria
