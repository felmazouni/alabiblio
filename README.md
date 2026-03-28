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
- La migración base de esta fase es `sql/migrations/0001_core_sources_centers.sql`
- Las migraciones se ejecutan completas por entorno con `wrangler d1 execute`
- No se reescribe una migración aplicada; los cambios nuevos salen en ficheros numerados posteriores

## Seeds idempotentes
- Los seeds viven en `sql/seeds`
- El seed base de esta fase es `sql/seeds/0001_sources.sql`
- Los seeds se pueden ejecutar varias veces sin duplicar catálogos
- Los catálogos se mantienen con `ON CONFLICT DO UPDATE`

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
- `pnpm deploy:staging`
- `pnpm deploy:production`

