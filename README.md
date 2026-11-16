# Rental Manager

Utility billing for my rental apartments. Tenants send photos of their meters; an LLM worker reads the values, I
confirm them, and the app calculates the monthly utility charge added to the rent.

It is a real tool I use every month and a pet project for learning to build with
[Claude Code](https://claude.com/claude-code): planning, rules and issues for the agent live in this repo too.

## How it works

```mermaid
flowchart LR
  T[Telegram bot] -->|photos| API
  W[Web app] -->|photos, confirm, statements| API
  API -->|parse-photo job| Q[(Redis / BullMQ)]
  Q --> WK[Worker: Claude vision]
  WK -->|draft readings| API
  API -->|batch-parsed event| Q2[(bot-notifications)]
  Q2 --> T
  API --- DB[(Postgres)]
  API --- S3[(MinIO photos)]
```

1. A photo arrives — uploaded in the web app or forwarded to the Telegram bot (an album = one batch).
2. The API stores it and queues a parse job. Photos without an apartment go to the **inbox**: the worker finds the
   apartment by the meter's serial number.
3. The worker reads the values (LangChain.js + Claude vision), matches them to meters and saves them as **drafts**.
4. A human confirms each draft — in the web app or with a button in Telegram. Parsed values are never used before
   that.
5. A monthly **statement** = consumption × the tariff valid for the period, per utility, + fixed fees + rent.

The API is the only way to the data and business rules; the web app, the worker and the bot are its HTTP clients.

## Features

- Apartments, tenants and leases (open-ended allowed; never overlapping)
- Meters: electricity (single or day/night), cold and hot water, gas; replacement with initial/final readings
- Readings: draft → confirmed or cancelled; values only grow; photo kept for every value
- Photo inbox with apartment detection by meter serial number
- Warnings for unusual consumption
- Tariffs with price history, fixed fees, per-apartment overrides, manual amounts
- Monthly statements as snapshots, money in integer kopiyky (UAH)
- Telegram bot: forward photos, get the parse result, confirm with a tap (owner only)

## Stack

| Part                   | Tech                                                      |
| ---------------------- | --------------------------------------------------------- |
| `apps/api`             | NestJS, Prisma, Postgres, MinIO (S3), BullMQ              |
| `apps/web`             | Next.js, React, Tailwind, shadcn/ui                       |
| `apps/worker`          | NestJS standalone, BullMQ, LangChain.js + Claude (vision) |
| `apps/bot`             | NestJS standalone, grammY (long polling), BullMQ          |
| `packages/shared`      | Shared rules and the BullMQ contracts                     |
| Infra (Docker Compose) | Postgres, MinIO, Redis                                    |

pnpm workspaces monorepo, TypeScript everywhere, Node 24.

## Getting started

Requirements: Node 24 (`.nvmrc`), pnpm via corepack, Docker.

```bash
corepack enable
cp .env.example .env          # local defaults; secrets below are optional
pnpm install
pnpm infra:up                 # Postgres :5433, MinIO :9000 (console :9001), Redis :6379

pnpm --filter api db:migrate:deploy
cp apps/api/prisma/seed-users.example.json apps/api/prisma/seed-users.json   # edit: your email + password
pnpm --filter api seed

pnpm dev:api                  # http://localhost:3001/api, Swagger at /docs
pnpm dev:web                  # http://localhost:3000
```

There is no sign-up: users come from the seed file (`seed-users.json` is gitignored).

### Photo parsing (worker)

Needs an Anthropic API key and an API key for the worker's service user:

```bash
pnpm --filter api apikey:create --service worker --name local \
  --scopes photos:read,meters:read,readings:create-draft,photos:parse-result
```

Put the printed key into `WORKER_API_KEY`, set `ANTHROPIC_API_KEY`, then `pnpm dev:worker`.

### Telegram bot (optional)

Create a bot with [@BotFather](https://t.me/BotFather), put its token into `TELEGRAM_BOT_TOKEN` and your Telegram
user id into `TELEGRAM_ALLOWED_USER_IDS` (everyone else is ignored). Then:

```bash
pnpm --filter api apikey:create --service telegram-bot --name local \
  --scopes photos:upload,photos:read,apartments:read,readings:read,readings:confirm,readings:cancel,photos:assign
```

→ `BOT_API_KEY`, then `pnpm dev:bot`. One running process per bot token.

`pnpm dev` starts everything at once.

## Commands

| Command                                               | What                                            |
| ----------------------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                                            | shared + api + web + worker + bot               |
| `pnpm dev:api` / `dev:web` / `dev:worker` / `dev:bot` | one app                                         |
| `pnpm infra:up` / `infra:down` / `infra:logs`         | Docker Compose infra                            |
| `pnpm test` · `pnpm lint` · `pnpm build`              | all workspaces                                  |
| `pnpm format` / `pnpm format:check`                   | Prettier                                        |
| `pnpm gen:api`                                        | OpenAPI → typed clients for web, worker and bot |
| `pnpm --filter api db:migrate`                        | create + apply a migration (dev)                |
| `pnpm prisma:studio`                                  | browse the database                             |

## Repository layout

```
apps/
  api/        NestJS API — the only way to data and business rules
  web/        Next.js UI (mobile-first, Ukrainian)
  worker/     photo parsing (BullMQ consumer)
  bot/        Telegram bot
packages/
  shared/     shared rules (consumption limits, phone normalization) + queue contracts
.claude/
  rules/      path-scoped instructions for Claude Code, per app and area
  skills/     /issue — implement a GitHub issue end to end
CLAUDE.md     project context for Claude Code (domain, rules, commands)
```

## Working with Claude Code

- `CLAUDE.md` (root and per app) is the project context; `.claude/rules/<app>-<area>.md` add details per area and
  load only when files of that area are touched.
- Work is planned as GitHub issues (epics with sub-issues). In Claude Code, `/issue <N>` reads the issue, plans,
  implements on a branch and opens a PR.
- Every change lands through a PR.
