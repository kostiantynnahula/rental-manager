# apps/bot — Telegram bot (grammY)

NestJS standalone app (`createApplicationContext`, no HTTP server), native ESM — same layout as `apps/worker`.

## Commands (from repo root)

- dev: `pnpm dev:bot` (also part of `pnpm dev`) · build: `pnpm --filter bot build` · lint: `pnpm --filter bot lint`
- API types: `pnpm gen:api` (root) regenerates `src/api/schema.d.ts` (`scripts/gen-api.mjs`, a copy of the worker's:
  only the operations open to API keys). A new endpoint for the bot needs `@Scopes(...)` + `@ApiBearerAuth()` first.

## Setup

- Env (validated in `src/config/env.validation.ts`; names in the root `.env.example`): `TELEGRAM_BOT_TOKEN`
  (BotFather), `TELEGRAM_ALLOWED_USER_IDS` (comma-separated Telegram user ids), `API_BASE_URL` (with `/api`),
  `BOT_API_KEY` (the bot's own key; the worker's is `WORKER_API_KEY`). Root `.env`; an optional `apps/bot/.env` wins
  over it.
- Key: `pnpm --filter api apikey:create --service telegram-bot --name "<label>" --scopes photos:upload` (at least one scope;
  fixed at creation — re-create the key and revoke the old one when the bot needs a new scope) → `BOT_API_KEY`.

## Rules

- **Talks to the API only** (HTTP, `API_CLIENT` = openapi-fetch typed by `src/api/schema.d.ts`). No DB, no MinIO,
  no Redis. Never hand-write API types.
- **Never log the bot token** — it is part of every Bot API URL (`/bot<token>/<method>`) — nor `BOT_API_KEY`, the
  `Authorization` header, the `Bot` / `Api` objects or `ctx` (they carry the token). Log ids, names, messages.
  grammY keeps the token out of its error messages while `sensitiveLogs` is off (the default): keep it off.
- **Long polling** (`bot.start()`), no webhook: Telegram allows **one** `getUpdates` consumer per token — a second
  process (e.g. `pnpm dev` and `pnpm dev:bot` at once, or prod + local with one token) gets `409 Conflict`; the bot
  then logs it and exits. Use a separate BotFather bot for local dev once there is a deployed one.
- **Allowlist first**: the first middleware drops every update whose sender isn't in `TELEGRAM_ALLOWED_USER_IDS`
  (or has no sender) — no reply at all, only the id is logged. Every handler goes after it.
- Startup errors (`main.ts`) are logged as name + message only, then exit 1: a grammY `HttpError`'s cause holds the
  Bot API URL with the token.
- Errors: `bot.catch` logs the error's name + message, replies with a generic text and keeps polling.
- Replies are Ukrainian plain text (`src/telegram/messages.ts`).

## Lifecycle (`src/telegram/telegram-bot.service.ts`)

- `onApplicationBootstrap`: `bot.init()` (getMe — a bad token fails startup), `setMyCommands` (`/start`, `/help`),
  then `bot.start()` **not awaited** (it resolves only when polling stops; a rejection → log + exit 1).
- `onApplicationShutdown` (`enableShutdownHooks`, Ctrl+C / SIGTERM): `bot.stop()`.

## Photos (`src/telegram/photo-intake.service.ts`, `src/photos/`)

- Accepted: `message:photo` (the largest size) and `message:document` with an `image/*` MIME (sent as a file =
  original quality). Any other document → «Надішліть фото лічильника». The API decides the real type by content.
- **Batches**: an album is one update per photo (same `media_group_id`). `PhotoBatcher` buffers by
  `album:<media_group_id>`, else `chat:<chatId>`, and flushes after 1.5 s of silence. In memory (single process);
  shutdown flushes and awaits what's buffered. The handler never awaits the batch (grammY runs updates one by one).
- Per photo, in order: `getFile` + download (`helpers/download-telegram-file.ts`), then **one `POST /photos` each**
  (inbox, scope `photos:upload`) so one rejected file doesn't fail the album. Over 20 MB (Bot API download limit) →
  not downloaded. Outcomes: accepted / duplicate (sha256 — information, not an error) / unsupported (400) /
  too-large (413 or > 20 MB) / failed → **one reply per batch** (`batchReply`, «Прийнято N фото, розпізнаю…»).
- The file download URL contains the token: its errors are rethrown without URL or cause. The batch runs outside
  the middleware (`bot.catch` doesn't see it) and has its own catch (log + `MESSAGES.error`).
