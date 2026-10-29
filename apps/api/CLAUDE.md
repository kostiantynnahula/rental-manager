# apps/api — NestJS

## Commands (from repo root)

- dev: `pnpm dev:api` → http://localhost:3001, Swagger UI at `/docs` (off in production)
- test: `pnpm --filter api test` · e2e: `pnpm --filter api test:e2e`
- lint: `pnpm --filter api lint` · build: `pnpm --filter api build`
- generate code: `pnpm --filter api exec nest g <schematic> <name>`

## Conventions

- Nest 12, native ESM (`"type": "module"`): relative imports need the `.js` extension.
- Tests: vitest (globals on). Unit `*.spec.ts` next to the code; e2e in `test/*.e2e-spec.ts`.
- One Nest module per domain area (properties, meters, readings, tariffs, statements).
- Shared types come from `@rental/shared` (built to `dist/`; root `dev`/`test`/`lint` build it first).
- Env: read via `ConfigService<Env, true>`, never `process.env`. New vars → `src/config/env.validation.ts` + root `.env.example`.
- Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) and Swagger are set up in `src/main.ts`; e2e tests repeat the pipe options — keep them in sync.
- DTOs: class-validator decorators + explicit `@ApiProperty` (no Swagger CLI plugin).

## Database (Prisma 7)

- Schema: `prisma/schema.prisma`; CLI config (URL, migrations path, seed): `prisma.config.ts`; migrations: `prisma/migrations/`.
- Client is generated into `src/generated/prisma/` (gitignored; `pnpm install` regenerates it). Import from `../generated/prisma/client.js`.
- Use the global `PrismaService` (`src/prisma/`); the app gets `DATABASE_URL` from `ConfigService`.
- Expected Prisma errors (P2002/P2003 → 409, P2025 → 404, P2000 → 400) are mapped by `PrismaExceptionFilter`; don't catch them in services. Business rules (e.g. readings only grow) are still checked explicitly in services.
- After a schema change: `pnpm --filter api db:migrate --name <change>` (creates + applies a migration), then `db:generate`.
- Other: `db:migrate:deploy` (apply pending, prod/CI), `db:studio` (or root `pnpm prisma:studio`).
- Never edit an applied migration — always create a new one. Ask before changing the schema.

### Seeding users

- Users come only from the seed (no sign-up). Data: `prisma/seed-users.json` — **gitignored**, holds real passwords.
  Start from the committed `prisma/seed-users.example.json` (fake data): `cp prisma/seed-users.example.json prisma/seed-users.json`.
- Format: `[{ "email": "...", "password": "...", "name": "..." }]` (`name` optional). Validated before touching the DB:
  valid email, password ≥ 12 chars, no duplicate emails; on error the seed exits 1 and lists every problem.
- Run: `pnpm --filter api seed` (alias `db:seed`; runs `prisma/seed.ts` via `prisma.config.ts`).
  Idempotent: upsert by email; updates `name`, but never an existing password unless run with
  `pnpm --filter api seed -- --reset-passwords`.
- The seed never logs passwords or hashes — keep it that way.
- Emails are stored lowercase + trimmed: always pass them through `normalizeEmail` (`src/users/`); a DB CHECK constraint is the backstop.
- Password hashing (argon2id): `PasswordService` in `src/users/` (exported by `UsersModule`, which auth will import).
