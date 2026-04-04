# alabiblio

## Stack
- React + Vite
- Cloudflare Workers
- D1
- KV
- R2
- Turnstile
- MapLibre

## Entornos
- `local`
- `staging`
- `production`

## Recursos Cloudflare
- Worker: `alabiblio-api`
- D1 local: `alabiblio-local-db`
- D1 staging: `alabiblio-staging-db`
- D1 production: `alabiblio-production-db`
- Dominio staging: `https://staging.alabiblio.org`
- Dominio production: `https://alabiblio.org`

## Migraciones D1
- Las migraciones viven en `sql/migrations`
- La migracion base de esta fase es `sql/migrations/0001_core_sources_centers.sql`
- Las migraciones se ejecutan completas por entorno con `wrangler d1 execute`
- No se reescribe una migracion aplicada; los cambios nuevos salen en ficheros numerados posteriores

## Seeds idempotentes
- Los seeds viven en `sql/seeds`
- El seed base de esta fase es `sql/seeds/0001_sources.sql`
- Los seeds se pueden ejecutar varias veces sin duplicar catalogos
- Los catalogos se mantienen con `ON CONFLICT DO UPDATE`

## Movilidad EMT
- Secretos necesarios para realtime EMT:
  - `EMT_CLIENT_ID`
  - `EMT_PASS_KEY`
- Credenciales opcionales de fallback:
  - `EMT_EMAIL`
  - `EMT_PASSWORD`
- En desarrollo local se pueden definir en `apps/web/.dev.vars`
- En Cloudflare se cargan con `wrangler secret put` por entorno
- Comprobacion rapida en Cloudflare:
  - `wrangler secret list --env staging`
  - `wrangler secret list --env production`
- Sin credenciales EMT la app sigue mostrando nodos cercanos desde open data, pero EMT realtime se devuelve como `unconfigured`

## SER
- Fuente oficial usada en esta fase:
  - `https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/MOVILIDAD/ZONA_SER/SHP_ZIP.zip`
- Estrategia aplicada:
  - descarga oficial del Geoportal de Madrid
  - parseo SHP
  - calculo de distancia minima desde cada centro a la banda SER mas cercana
  - cobertura activa cuando la banda mas cercana cae dentro del umbral operativo configurado

## Comandos
- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm db:migrate:local`
- `pnpm db:migrate:staging`
- `pnpm db:migrate:production`
- `pnpm db:seed:local`
- `pnpm db:seed:staging`
- `pnpm db:seed:production`
- `pnpm ingest:centers:local`
- `pnpm ingest:centers:staging`
- `pnpm ingest:centers:production`
- `pnpm sync:mobility:local`
- `pnpm sync:mobility:staging`
- `pnpm sync:mobility:production`
- `pnpm sync:ser:local`
- `pnpm sync:ser:staging`
- `pnpm sync:ser:production`
- `pnpm deploy:staging`
- `pnpm deploy:production`
