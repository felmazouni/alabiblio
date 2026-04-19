# AI Agent Instructions for Alabiblio

This file is the execution guide for AI coding agents working on **Alabiblio**.
Read this file before changing code.

## Mission

Alabiblio is a public web app for discovering **libraries and study rooms in Madrid**.
It runs on **Cloudflare Workers + D1** and must remain:

- stable
- honest with data provenance
- compact and professional in UI
- production-oriented
- aligned with `ROADMAP.md`

The active execution plan is in [ROADMAP.md](ROADMAP.md).  
Agents must follow that roadmap in order.

---

## Execution Rules

1. **Read `ROADMAP.md` first** and continue from the current active block.
2. **Do not skip blocks** unless the roadmap explicitly requires reopening an earlier one.
3. When a block is completed:
   - update `ROADMAP.md`
   - mark the block/tasks as completed
   - update the status header in `ROADMAP.md`
   - make a clean commit
   - verify preview
   - continue to the next block automatically
4. **Do not promote to production** until the production block is reached and all checks pass.
5. Do not invent data, times, or transport outputs.
6. Do not present parsed text as structured official data.
7. Do not add temporary hacks that bypass architecture or migrations.
8. Prefer completing coherent blocks end-to-end over scattered partial edits.

---

## Current Product Constraints

### Data provenance taxonomy
Every visible or stored field must be classified as one of:

- `realtime`
- `official_structured`
- `official_text_parsed`
- `heuristic`
- `not_available`

This taxonomy must be preserved in:
- contracts
- API payloads
- UI display logic
- admin/review workflows where relevant

### Mobility constraints
The app supports:
- EMT
- interurban buses / CRTM
- metro
- cercanías
- BiciMAD
- SER

Important rules:
- **Do not build a fake Google Maps clone**
- **Do not simulate exact multimodal routing**
- Destination mobility must be **precomputed and persisted**
- User-specific mobility must be resolved only against a **small prefiltered destination subset**
- The **only realtime currently allowed** is:
  - available bikes at origin
  - available docks at destination
  using **official BiciMAD data**, only if robust

### Ratings constraints
Ratings are **internal app ratings**, not imported Google reviews.

Google should only be used for:
- lightweight identity verification for rating submission

Do not build:
- a full user account system
- public user profiles
- imported Google Maps reviews

### Admin constraints
There are two admin roles:
- **Super admin**
- **Library/center admin**

Do not merge them conceptually or in UI scope.

---

## Project Overview

Alabiblio is a public catalog of libraries and study rooms in Madrid, deployed on Cloudflare Workers with D1 database.

Main goals:
- high-quality normalized public data
- useful and honest mobility information
- strong filtering and ranking
- compact polished UI
- stable preview and production deployment
- operational super admin and library admin panels

See [README.md](README.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Build and Test Commands

- `pnpm dev:web` — Start Vite dev server (proxies `/api` to `localhost:8787`)
- `pnpm dev:edge` — Start Wrangler local server
- `pnpm preview:local` — Build web and start edge dev
- `pnpm build` — Build web and edge for production
- `pnpm typecheck` — Type-check all packages

If schema changes are made:
- update migrations under `database/migrations/`
- do not rely on implicit runtime schema creation as the long-term source of truth

---

## Architecture Principles

Strict layering is mandatory:

- **Contracts** → shared types and API contracts
- **Domain** → pure business logic
- **Application** → orchestrated use cases
- **Infrastructure** → adapters, persistence, external data sources

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Layering rules
- Domain must have **zero infrastructure dependencies**
- Infrastructure must not leak raw source mess into domain/UI
- UI should consume stable contracts, not raw persistence shapes
- Large “god files” must be split when they become maintenance bottlenecks

---

## Key Conventions

### TypeScript
- Strict mode is enabled
- `noUncheckedIndexedAccess` is enabled
- Avoid `any`
- Prefer explicit return types on important functions and public module boundaries

### Database
- No implicit schema as final source of truth
- All tables and indexes must exist in migrations
- Preview and production schemas must stay aligned
- Prefer bounded contexts over one giant persistence file

### Text handling
Many source datasets contain mojibake / encoding issues.
Use `repairSourceText()` whenever needed for broken Latin-1 / UTF-8 source text.

### UI
- Keep the UI compact
- Avoid oversized cards and excessive whitespace
- Do not show controls that do nothing
- Do not expose unavailable data as if it were real
- Dark mode must stay consistent across all touched components

### Preview safety
- Do not break preview while advancing roadmap blocks
- Verify key routes after major changes

---

## Product Truth Rules

### Never fake these
Do not invent:
- travel times
- ETA values
- occupancy
- ratings
- incidents
- structured transport links that only exist as parsed text

### If data is missing
Then either:
- hide it
- mark it unavailable
- or label it honestly by provenance

### Parsed vs structured
Examples:
- EMT stop IDs / lines from official machine-readable source → `official_structured`
- Metro mention parsed from center descriptive text → `official_text_parsed`
- Car convenience output without real routing engine → `heuristic`

These are **not equivalent** and must not be rendered as equivalent.

---

## Key Files

- [ROADMAP.md](ROADMAP.md) — current execution status and ordered plan
- [README.md](README.md) — project overview
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture and layering
- `packages/contracts/` — shared contracts
- `packages/domain/` — pure business logic
- `packages/application/` — application services/use cases
- `packages/infrastructure/` — persistence and external source adapters
- `workers/edge/src/http/routes/` — API endpoints
- `database/migrations/` — D1 schema changes

---

## Expected Workflow for Agents

When continuing work:

1. Read `ROADMAP.md`
2. Identify the current active block
3. Implement only what belongs to that block
4. Keep architecture and provenance rules intact
5. Run:
   - `pnpm typecheck`
   - `pnpm build`
6. Verify relevant routes/endpoints
7. Update `ROADMAP.md`
8. Commit cleanly
9. Continue to the next block if the current one is truly complete

---

## Reporting Expectations

When reporting progress, always state:

- current roadmap block
- what was completed
- what remains in the current block
- files changed
- schema changes, if any
- preview verification status
- whether anything was intentionally deferred

Do not claim a block is complete unless its closure criteria are actually met.

---

## Things to Watch Carefully

- schema drift between runtime and migrations
- oversized mixed-responsibility files
- transport saturation / N+1 patterns
- incorrect provenance labeling
- duplicated UI logic between list cards and detail pages
- accidental reintroduction of open-air spaces
- broken Spanish text encoding
- fake “realtime” behavior
- incomplete dark mode states
- unbounded admin scope

---

## Priority of Truth Over Cosmetics

A visually polished screen with fake or misclassified data is worse than a simpler honest screen.

Always prioritize:
1. correctness of data provenance
2. architectural stability
3. honest visibility rules
4. compact and coherent UI
5. production readiness

---

## Final Rule

If there is tension between:
- speed and correctness,
- pretty UI and truthful data,
- patching and proper architecture,

choose the option that keeps the system coherent, truthful, and maintainable.