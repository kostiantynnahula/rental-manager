---
paths:
  - 'apps/api/prisma/**'
  - 'apps/api/src/prisma/**'
---

# Database (Prisma 7)

- Schema: `prisma/schema.prisma`; CLI config (URL, migrations path, seed): `prisma.config.ts`; migrations: `prisma/migrations/`.
- Client is generated into `src/generated/prisma/` (gitignored; `pnpm install` regenerates it). Import from `../generated/prisma/client.js`.
- Use the global `PrismaService` (`src/prisma/`); the app gets `DATABASE_URL` from `ConfigService`.
- Expected Prisma errors (P2002/P2003 → 409, P2025 → 404, P2000 → 400) are mapped by `PrismaExceptionFilter`; don't catch them in services. Business rules (e.g. readings only grow) are still checked explicitly in services.
- After a schema change: `pnpm --filter api db:migrate --name <change>` (creates + applies a migration), then `db:generate`.
- Other: `db:migrate:deploy` (apply pending, prod/CI), `db:studio` (or root `pnpm prisma:studio`).
- Never edit an applied migration — always create a new one. Ask before changing the schema.

## Seeding users

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
