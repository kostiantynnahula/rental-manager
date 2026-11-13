# Rental Manager

## What this is

Pet project (also a learning project for Claude Code). Tracks utility meter
readings for my rental apartments and calculates the monthly utility charge
added to rent.

Flow: tenant sends meter photo (Viber) → I upload it → worker extracts the
reading → I confirm/correct → saved → monthly statement =
consumption × tariff per utility + fixed fees.

## Domain

- **Apartment** — rental apartment. Utilities vary per apartment. Archived via `isActive`, never deleted.
- **Tenant** — a person renting; can appear in many leases over time.
- **Lease** — an Apartment rented to one or more Tenants for a date range (open-ended allowed), with monthly rent.
  Exactly one PRIMARY tenant per lease; others are CONTACTs. Leases of one apartment never overlap.
- **Meter** — metered utility in an Apartment: ELECTRICITY, COLD_WATER, HOT_WATER, GAS.
  An apartment may have several meters of one utility (e.g. "kitchen" / "bathroom" water). Active from
  `installedAt` until `removedAt` (null = still installed).
  - Zone scheme: SINGLE → one TOTAL register; DAY_NIGHT → DAY + NIGHT registers (two-zone electricity).
  - Water: cold+hot, or cold only (boiler), or none (building-level bill → fixed fee).
  - Gas: every apartment.
- **Fixed fee** — monthly charge without a meter: waste removal (all),
  elevator (some), intercom (optional), building-level water.
- **Reading** — one value per zone of a meter.
  - `period` = the month the reading is for (always stored as its 1st day); `readingDate` = when the meter was
    actually read (e.g. 2026-10-28 for period 2026-10).
  - `kind`: REGULAR (monthly), INITIAL (on installation — starts the meter), FINAL (on removal — ends it).
  - `status`: DRAFT (entered or parsed from a photo) → CONFIRMED by me, or CANCELLED. Confirmed readings are never
    edited: a correction = cancel + new reading.
  - `source` (MANUAL or PHOTO) and the photo belong to each **value**: one photo shows one register, so a two-zone
    reading may come from two photos. A DRAFT may hold only some zones (filled zone by zone); confirming needs all.
- **Photo** — a meter photo (the original is kept unchanged forever). Belongs to an Apartment, or is in the **inbox**
  (`apartmentId` null: uploaded without an apartment, e.g. by the bot) until one is assigned. Photos stored by one
  upload request share a `batchId` (a batch); the bot's upload also sets `replyTo` (where to answer, opaque).
- **Meter replacement** — the old meter gets a FINAL reading and `removedAt`; the new one gets `installedAt` and
  an INITIAL reading. That month's consumption = (FINAL old − previous old) + (current new − INITIAL new).
- **Tariff** — price per unit, versioned by effective date.
- **Statement** — monthly calculation per Apartment.

## Rules

- Never use a parsed value until a human confirmed it. Always keep the photo. An API key confirms only on a human
  action (the Telegram bot's button, tapped by an allowlisted user) — never the worker.
- Readings only grow — reject/flag a value lower than the previous one.
- Money: integer kopiyky (or Decimal), never floats. Currency UAH.
- A statement uses the tariff valid for its period.
- Single user (me). Auth exists, but no multi-tenant logic.

## Stack & layout

pnpm workspaces monorepo:

- `apps/api` — NestJS + Prisma + Postgres
- `apps/web` — Next.js
- `apps/worker` — photo parsing (see `apps/worker/CLAUDE.md`). NestJS standalone consumer of BullMQ jobs (Redis)
  that the API enqueues on photo upload; authenticates to the API with an API key. Never touches the DB: it reads
  photos, extracts the values (LangChain.js + Claude vision, `src/extraction/`), matches them to meters (inbox photos: by serial across all active meters) and saves
  them as DRAFT readings over HTTP (`draft-values`).
- `apps/bot` — Telegram bot (see `apps/bot/CLAUDE.md`). NestJS standalone + grammY, long polling, only answers
  allowlisted Telegram users; an HTTP client of the API with its own API key.
- The API is the only way to data and business rules: every other app (web, worker, the Telegram bot, later an
  MCP server) is an HTTP client of it. No second Prisma client or raw SQL outside `apps/api`.
- `packages/shared` — code shared by api and web that isn't part of the API contract (e.g. phone
  normalization), and the BullMQ contract between api and worker (queue/job names, job payloads).
  API request/response types are never put here: the web generates them from OpenAPI.

Infra in Docker Compose: Postgres, MinIO (S3-compatible photo storage;
community `pgsty/minio` image, since official MinIO images are no longer published), Redis (BullMQ queues,
AOF persistence).

## Commands

Node 24 (`.nvmrc`), pnpm via corepack. First run: `cp .env.example .env && pnpm install`.

- infra: `pnpm infra:up` / `pnpm infra:down` / `pnpm infra:logs` (Postgres on :5433, MinIO :9000, console :9001,
  Redis :6379 — inspect jobs with `docker compose exec redis redis-cli KEYS 'bull:*'`)
- dev: `pnpm dev` (shared + api + web + worker + bot), or `pnpm dev:api` (:3001) / `pnpm dev:web` (:3000) / `pnpm dev:worker` / `pnpm dev:bot`
- test: `pnpm test`
- lint: `pnpm lint` · format: `pnpm format` / `pnpm format:check`
- build: `pnpm build`
- API types for the web app: `pnpm gen:api` (after API DTO/controller changes; commit both generated files)

## How to work with me

- Reply in the language I write in (Russian/Ukrainian); code, comments, commits in English.
- Small steps. Run tests/lint before saying a task is done.
- Don't write new tests unless I ask (for now). Still run existing ones; if a change
  breaks one, tell me rather than silently rewriting it.
- Briefly explain non-obvious decisions — I'm learning the workflow.
- Ask before adding dependencies or changing the DB schema.
- App-specific rules live in `apps/*/CLAUDE.md`; detailed docs in `docs/`.
