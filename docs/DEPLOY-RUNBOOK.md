# DEPLOY RUNBOOK

Fecha: 2026-04-04

## Objetivo

Dejar un flujo unico y determinista para:

1. instalar
2. construir
3. levantar local
4. desplegar

## Precondiciones

- Node 22 instalado y disponible en `PATH`
- Corepack disponible
- `pnpm` 10.11.0 activado
- Wrangler autenticado
- proyecto Cloudflare y bases D1 ya creados
- secrets EMT cargados por entorno

## Flujo canonico

### 1. Clonar e instalar

```powershell
git clone https://github.com/felmazouni/alabiblio.git
cd alabiblio
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install
```

### 2. Configurar variables

#### Local

Crear `apps/web/.dev.vars` a partir de `apps/web/.dev.vars.example`.

Claves obligatorias:

- `EMT_CLIENT_ID`
- `EMT_PASS_KEY`
- `EMT_EMAIL`
- `EMT_PASSWORD`

#### Staging

```powershell
pnpm --dir apps/web exec wrangler secret put EMT_CLIENT_ID --env staging
pnpm --dir apps/web exec wrangler secret put EMT_PASS_KEY --env staging
pnpm --dir apps/web exec wrangler secret put EMT_EMAIL --env staging
pnpm --dir apps/web exec wrangler secret put EMT_PASSWORD --env staging
```

#### Production

```powershell
pnpm --dir apps/web exec wrangler secret put EMT_CLIENT_ID --env production
pnpm --dir apps/web exec wrangler secret put EMT_PASS_KEY --env production
pnpm --dir apps/web exec wrangler secret put EMT_EMAIL --env production
pnpm --dir apps/web exec wrangler secret put EMT_PASSWORD --env production
```

### 3. Preparar datos

```powershell
pnpm db:migrate:local
pnpm db:seed:local
pnpm ingest:centers:local
pnpm sync:mobility:local
pnpm sync:ser:local
pnpm ingest:callejero:local
```

Para remoto, repetir la misma secuencia con `:staging` o `:production`.

### 4. Verificar build

```powershell
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

### 5. Levantar local

```powershell
pnpm dev
```

### 6. Desplegar

#### Staging

```powershell
pnpm build
pnpm deploy:staging
```

#### Production

```powershell
pnpm build
pnpm deploy:production
```

## Regla operativa cerrada

El deploy valido es solo este:

- scripts root
- scripts de `apps/web`
- `wrangler deploy --config wrangler.jsonc --env <target>`

No usar:

- `CLOUDFLARE_ENV`
- `dist/alabiblio_api/wrangler.json`
- `pnpm deploy` (colisiona con el subcomando nativo de pnpm)

## Verificacion final

Tras desplegar:

```powershell
pnpm smoke:staging
pnpm smoke:production
```

Estado validado en takeover Fase 2:

- `build`: OK
- `typecheck`: OK
- `lint`: OK
- `test`: OK
- `wrangler deploy --config wrangler.jsonc --env staging --dry-run`: OK
- `wrangler deploy --config wrangler.jsonc --env production --dry-run`: OK
- `smoke:staging`: OK
- `smoke:production`: OK

Limitacion conocida del terminal de auditoria:

- `wrangler d1 execute --local` queda colgado en este entorno concreto, incluso para `select 1`
- no se ha detectado el mismo problema en deploy ni en smoke remoto
