# apps/api — NestJS

## Commands (from repo root)

- dev: `pnpm dev:api` → http://localhost:3001/api (global `/api` prefix), Swagger UI at `/docs` (off in production)
- test: `pnpm --filter api test` · e2e: `pnpm --filter api test:e2e`
- lint: `pnpm --filter api lint` · build: `pnpm --filter api build`
- generate code: `pnpm --filter api exec nest g <schematic> <name>`
- OpenAPI: `pnpm --filter api openapi:export` → `openapi.json` (committed; root `pnpm gen:api` also regenerates the
  web types). Builds first and creates the app without `init()`, so no DB is needed (only a valid `.env`). Paths
  are written without `/api`; the prefix is in `servers` (matches the web client's `baseUrl: '/api'`).
  Swagger config lives in `src/openapi/swagger-config.ts`, shared with `main.ts`.

## Conventions

- Nest 12, native ESM (`"type": "module"`): relative imports need the `.js` extension.
- Tests: vitest (globals on). Unit `*.spec.ts` next to the code; e2e in `test/*.e2e-spec.ts`.
- One Nest module per domain area (apartments, tenants, leases, meters, readings, tariffs, statements, photos,
  photo-batches, condition-photos, api-keys); infra modules: auth, users, prisma, storage, queue, embeddings (the only code that knows the
  embedding model), health, cli.
  `src/images/` = shared image-upload helpers (no module).
- Shared types come from `@rental/shared` (built to `dist/`; root `dev`/`test`/`lint` build it first).
- Env: read via `ConfigService<Env, true>`, never `process.env`. New vars → `src/config/env.validation.ts` + root `.env.example`.
- Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) and Swagger are set up in `src/main.ts`; e2e tests repeat the pipe options — keep them in sync.
- DTOs: class-validator decorators + explicit `@ApiProperty` (no Swagger CLI plugin).
- One class per file; custom error classes go in `src/<feature>/errors/<name>.error.ts`.
- Interfaces go in `src/<feature>/interfaces/<name>.interface.ts` (one per file), imported with `import type`.
- Pure helper functions go in `src/<feature>/helpers/` (one file per topic), not at the top/bottom of class files. Anything that needs DI stays a method/provider.

## Domain & API conventions

Always loaded with this file (imports); split out only to keep this file short.

@docs/domain.md
@docs/api-conventions.md

## More

- Feature details — path-scoped rules, loaded when a file of that area is opened:
  - Auth, sessions, service users, API keys and scopes (`src/{auth,users,api-keys,cli}/`): `.claude/rules/api-auth.md`
  - Apartments, tenants, leases (`src/{apartments,tenants,leases}/`): `.claude/rules/api-leases.md`
  - Prisma schema, migrations, client (`prisma/`, `src/prisma/`): `.claude/rules/api-database.md`
  - Photos, storage (MinIO), inbox, parse queue, shared image code (`src/{photos,storage,queue,images}/`): `.claude/rules/api-photos.md`
  - Photo batches — summary, confirm by batch (`src/photo-batches/`): `.claude/rules/api-photo-batches.md`
  - Condition photos — check-in/check-out/change history, embeddings, semantic search (`src/{condition-photos,embeddings}/`): `.claude/rules/api-condition-photos.md`
  - Readings and meters (`src/{readings,meters}/`): `.claude/rules/api-readings.md`
  - Statements (`src/statements/`): `.claude/rules/api-statements.md`
  - Tariffs (`src/tariffs/`): `.claude/rules/api-tariffs.md`
- Billing reuses the `reading_consumption` view and `priceForPeriod` — never re-implement.
- Project rules override advice from skills.
