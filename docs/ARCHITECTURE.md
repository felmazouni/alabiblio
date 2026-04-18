# Arquitectura objetivo

## Topologia

- `apps/web`: frontend React + Vite.
- `workers/edge`: API HTTP y serving de assets.
- `packages/contracts`: tipos y contratos compartidos.
- `packages/domain`: reglas puras de negocio.
- `packages/application`: casos de uso.
- `packages/infrastructure`: adapters de D1, datasets oficiales, email, observabilidad y resiliencia.
- `database`: migraciones y seeds.

## Principios

- Un solo despliegue Cloudflare para `alabiblio.org`.
- D1 como fuente principal de verdad.
- Assets del frontend servidos por el Worker.
- Sin KV, R2 o Queues en baseline salvo necesidad demostrada.
- Tipado fuerte, modulos pequenos y contratos claros.
- Validacion de entrada, saneamiento de texto, timeouts y retries desde el inicio.

## Dominio minimo

- Catalogo publico solo para espacios interiores validos de estudio.
- Horarios persistentes y normalizados, nunca solo texto libre.
- Transporte con fiabilidad etiquetada: `realtime`, `static_estimate`, `heuristic`.
- Ratings solo numericos 1-5, sin comentarios ni perfiles sociales.
- Auth separado para admins de centro y admin global.

## Auth y email

- Admin de centro ligado a email corporativo.
- Activacion, reset y sesiones con tokens de un solo uso y trazabilidad.
- Abstraccion `EmailSender` desde el inicio para soportar Cloudflare Email Service o alternativa externa minima.

## Observabilidad

- Logging estructurado por request, job y cambio administrativo.
- Cola de anomalias de datos y revisiones manuales.
- Salud de fuentes oficiales visible en admin global.

