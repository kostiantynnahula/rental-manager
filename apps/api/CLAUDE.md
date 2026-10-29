# apps/api — NestJS

## Commands (from repo root)

- dev: `pnpm dev:api` → http://localhost:3001 (`PORT` env overrides)
- test: `pnpm --filter api test` · e2e: `pnpm --filter api test:e2e`
- lint: `pnpm --filter api lint` · build: `pnpm --filter api build`
- generate code: `pnpm --filter api exec nest g <schematic> <name>`

## Conventions

- Nest 12, native ESM (`"type": "module"`): relative imports need the `.js` extension.
- Tests: vitest (globals on). Unit `*.spec.ts` next to the code; e2e in `test/*.e2e-spec.ts`.
- One Nest module per domain area (properties, meters, readings, tariffs, statements).
- Shared types come from `@rental/shared` (built to `dist/`; root `dev`/`test`/`lint` build it first).
