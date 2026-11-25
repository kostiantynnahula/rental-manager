# apps/bot — Telegram bot (grammY)

NestJS standalone app (`createApplicationContext`, no HTTP server), native ESM — same layout as `apps/worker`.

## Commands (from repo root)

- dev: `pnpm dev:bot` (also part of `pnpm dev`) · build: `pnpm --filter bot build` · lint: `pnpm --filter bot lint`
- API types: `pnpm gen:api` (root) regenerates `src/api/schema.d.ts` (`scripts/gen-api.mjs`, a copy of the worker's:
  only the operations open to API keys). A new endpoint for the bot needs `@Scopes(...)` + `@ApiBearerAuth()` first.

## Setup

- Env (validated in `src/config/env.validation.ts`; names in the root `.env.example`): `TELEGRAM_BOT_TOKEN`
  (BotFather), `TELEGRAM_ALLOWED_USER_IDS` (comma-separated Telegram user ids), `PHOTO_MAX_FILE_SIZE_MB?` (default
  15, shared with the API), `API_BASE_URL` (with `/api`), `BOT_API_KEY` (the bot's own key; the worker's is
  `WORKER_API_KEY`), `REDIS_HOST?` / `REDIS_PORT?` / `REDIS_PASSWORD?` (as the API's). Root `.env`; an optional `apps/bot/.env` wins over it.
- Key: `pnpm --filter api apikey:create --service telegram-bot --name "<label>" --scopes photos:upload,photos:read,apartments:read,readings:read,readings:confirm,readings:cancel,photos:assign`
  (at least one scope; fixed at creation — re-create the key and revoke the old one when the bot needs a new scope)
  → `BOT_API_KEY`.

## Architecture

```
src/
  main.ts          bootstrap (startup errors: name + message only)
  bot.module.ts    config + the feature modules + BotService
  bot.service.ts   THE entry point: the Bot, every handler, polling start/stop
  messages.ts      every user-facing text
  config/  api/    env validation · the typed API client
  telegram/        the grammY Bot (TELEGRAM_BOT) — the process's one Telegram client
  helpers/         allowlist middleware, user-id parsing
  intake/          photos → the API inbox (one upload per album)
  results/         batch-parsed (BullMQ) → summary; result buttons
  queue/           the Redis connection (bot-notifications only)
```

- **One entry point**: `bot.service.ts` reads as the bot's map — allowlist, `/start`, `/help`, photos → `intake`,
  callbacks → `results`. Every Telegram input is wired there and nowhere else; the BullMQ input is
  `results/notifications.consumer.ts` (a `@Processor` must be its own provider).
- **One Telegram client**: the `TELEGRAM_BOT` provider (`telegram/`). Handlers reach Telegram via `ctx.api`, the
  results via `bot.api`; nothing else does `new Bot` / `new Api` — so a test can provide a Bot with a fake transport.
- **Two inputs**: Telegram updates (long polling) and BullMQ `bot-notifications` events from the API (`batch-parsed`,
  a signal only — load fresh data from the API).
- **Features don't call each other** and depend only on `api/` (+ `messages.ts`). Anything that needs two features
  goes through the API (e.g. intake sets `replyTo`; the `batch-parsed` event brings it back to `results`).
- **Render is pure** (data → text + buttons); the API computes everything shown (consumption, warnings,
  `canConfirm`) — the bot never re-implements a business rule.
- **Buttons are stateless**: everything a button needs is in its `callback_data` (≤ 64 bytes), so they survive a
  restart. No in-memory state behind buttons.
- **All texts in `messages.ts`** (Ukrainian, plain text, no `parse_mode`).
- One class/interface per file (`interfaces/`), pure functions in `helpers/` — as in the API.

## Rules

- **Talks to the API only** (HTTP, `API_CLIENT` = openapi-fetch typed by `src/api/schema.d.ts`) — plus consuming
  the API's `bot-notifications` queue (Redis, nothing else there). No DB, no MinIO. Never hand-write API types.
- **Never log the bot token** — it is part of every Bot API URL (`/bot<token>/<method>`) — nor `BOT_API_KEY`, the
  `Authorization` header, the `Bot` / `Api` objects or `ctx` (they carry the token). Log ids, names, messages.
  grammY keeps the token out of its error messages while `sensitiveLogs` is off (the default): keep it off.
- **Long polling** (`bot.start()`), no webhook: Telegram allows **one** `getUpdates` consumer per token — a second
  process (e.g. `pnpm dev` and `pnpm dev:bot` at once, or prod + local with one token) gets `409 Conflict`; the bot
  then logs it and exits. Use a separate BotFather bot for local dev once there is a deployed one.
- **Allowlist first**: the first middleware drops every update whose sender isn't in `TELEGRAM_ALLOWED_USER_IDS`
  (or has no sender) — no reply at all, only the id is logged. Every handler goes after it.
- **Confirming is the owner's tap only**: `readings:confirm` / `readings:cancel` are used only from a button, after
  the allowlist. Nothing is confirmed automatically (see `api-auth.md`).
- Errors: `bot.catch` logs the error's name + message, replies with a generic text and keeps polling. Work started
  from a timer (the intake's flush) is outside the middleware: it never throws, it logs.

## Lifecycle (`bot.service.ts`)

- `onApplicationBootstrap`: `bot.init()` (getMe — a bad token fails startup), `setMyCommands`, then `bot.start()`
  **not awaited** (it resolves only when polling stops; a rejection → log + SIGTERM to itself: the Ctrl+C path, so
  the shutdown below still runs; exit code 143).
- `onApplicationShutdown` (`enableShutdownHooks`), in this order: `bot.stop()` (only aborts `getUpdates`) → await
  the `start()` promise (the current batch of updates is handled) → `intake.flush()`. One hook for everything: Nest
  runs hooks concurrently, and a flush before polling ends could miss a photo.

## Tests

- `pnpm --filter bot test` (Vitest, globals). Specs are colocated (`foo.ts` → `foo.spec.ts`); the bot's own builders
  and fakes live in `src/test/`, kept out of the build (`tsconfig.build.json` excludes it and `**/*spec.ts`).
- **Never Telegram, never the network**: the token is in every Bot API URL. Telegram is `fakeTelegram()`
  (`src/test/fake-telegram.ts`): a real grammY `Bot` whose API transformer records `{ method, payload }` and answers
  from routes (`telegramError()` → a real `GrammyError`; an unknown method fails the test); it also stubs the file
  download (global `fetch`). `contextFor(bot, message)` gives a real `Context`. The API is `fakeApi<paths>(routes)`
  from `@rental/testing` (`packages/testing`; `json()` / `status()` responses; multipart bodies recorded as
  `FormData`; an unknown route fails the test).
- Build services only via `botServices()` (`src/test/bot-services.ts`; one fake API + one `fakeTelegram` for all of
  them; `intakeService()` wraps it) — never `new` them in a spec, so a constructor change touches one file.
- Pipeline tests deliver updates with `bot.handleUpdates([...])` — the polling path (private in grammY's types),
  so `bot.catch` runs as in production; `bot.handleUpdate` would only throw a `BotError`. A button tap:
  `callbackUpdate()` / `callbackContext()`.
- Timers (the album buffer) — Vitest fake timers (`vi.useFakeTimers()`), never real waits.
- A PR that changes behaviour comes with tests for it.

## More

- Feature details — path-scoped rules, loaded when a file of that area is opened:
  - Photo intake (`src/intake/`): `.claude/rules/bot-intake.md`
  - Results, render, buttons, `callback_data` (`src/results/`, `src/queue/`): `.claude/rules/bot-results.md`
- Project rules override advice from skills.
