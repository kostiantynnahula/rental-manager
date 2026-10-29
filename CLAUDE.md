# Rental Manager

## What this is

Pet project (also a learning project for Claude Code). Tracks utility meter
readings for my rental apartments and calculates the monthly utility charge
added to rent.

Flow: tenant sends meter photo (Viber) → I upload it → worker extracts the
reading → I confirm/correct → saved → monthly statement =
consumption × tariff per utility + fixed fees.

## Domain

- **Property** — rental apartment. Utilities vary per property.
- **Meter** — metered utility in a Property; may have several registers.
  - Electricity: single-zone or day/night (2 registers).
  - Water: cold+hot, or cold only (boiler), or none (building-level bill → fixed fee).
  - Gas: every property.
- **Fixed fee** — monthly charge without a meter: waste removal (all),
  elevator (some), intercom (optional), building-level water.
- **Reading** — value per register + date + photo + status (`parsed` → `confirmed`).
- **Tariff** — price per unit, versioned by effective date.
- **Statement** — monthly calculation per Property.

## Rules

- Never use a parsed value until a human confirmed it. Always keep the photo.
- Readings only grow — reject/flag a value lower than the previous one.
- Money: integer kopiyky (or Decimal), never floats. Currency UAH.
- A statement uses the tariff valid for its period.
- Single user (me). Auth exists, but no multi-tenant logic.

## Stack & layout

pnpm workspaces monorepo:

- `apps/api` — NestJS + Prisma + Postgres
- `apps/web` — Next.js
- `apps/worker` — image parsing with LangChain (later)
- `packages/shared` — shared types

Infra in Docker Compose: Postgres, MinIO (S3-compatible photo storage;
community `pgsty/minio` image, since official MinIO images are no longer published).

## Commands

Node 24 (`.nvmrc`), pnpm via corepack. First run: `cp .env.example .env && pnpm install`.

- infra: `pnpm infra:up` / `pnpm infra:down` / `pnpm infra:logs` (Postgres on :5433, MinIO :9000, console :9001)
- dev: `pnpm dev` (shared + api + web), or `pnpm dev:api` (:3001) / `pnpm dev:web` (:3000)
- test: `pnpm test`
- lint: `pnpm lint` · format: `pnpm format` / `pnpm format:check`
- build: `pnpm build`

## How to work with me

- Reply in the language I write in (Russian/Ukrainian); code, comments, commits in English.
- Small steps. Run tests/lint before saying a task is done.
- Briefly explain non-obvious decisions — I'm learning the workflow.
- Ask before adding dependencies or changing the DB schema.
- App-specific rules live in `apps/*/CLAUDE.md`; detailed docs in `docs/`.
