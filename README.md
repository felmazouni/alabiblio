# alabiblio

Base limpia de reconstruccion para `alabiblio.org`, orientada a Cloudflare.

## Estado actual

- Codigo heredado eliminado del arbol operativo.
- ZIP exportado desde `v0.app` preservado en `references/v0/`.
- Documento maestro de ejecucion en `ROADMAP.md`.
- Scaffold nuevo listo en `apps/web`, `workers/edge`, `packages/*` y `database/*`.

## Stack objetivo

- Frontend: React + Vite + Tailwind CSS
- Backend: Cloudflare Workers
- Static assets: servidos por el Worker
- Base de datos: D1
- Validacion y contratos: TypeScript estricto y modulos separados por capas

## Estructura

- `apps/web`: interfaz publica y paneles admin
- `workers/edge`: API HTTP, auth adapters y serving de assets
- `packages/contracts`: tipos compartidos
- `packages/domain`: reglas puras de negocio
- `packages/application`: casos de uso
- `packages/infrastructure`: adapters de D1, datasets oficiales, email y observabilidad
- `database`: migraciones y seeds
- `references/v0`: material de referencia procedente de `v0.app`

## Comandos previstos

- `pnpm install`
- `pnpm build`
- `pnpm typecheck`
- `pnpm dev:web`
- `pnpm dev:edge`

## Notas operativas

- Esta sesion no tiene `node`, `npm` ni `pnpm` disponibles en `PATH`, por lo que el scaffold queda preparado pero sin lockfile regenerado ni dependencias instaladas desde este terminal.
- La decision sobre emails de activacion y reset esta documentada en `docs/PLATFORM-CONSTRAINTS.md`.
