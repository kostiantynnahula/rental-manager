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
  helpers/         allowlist middleware, user-id parsing
  intake/          photos → the API inbox (one upload per album)
  results/         batch-parsed (BullMQ) → summary; result buttons
  queue/           the Redis connection (bot-notifications only)
```

- **One entry point**: `bot.service.ts` reads as the bot's map — allowlist, `/start`, `/help`, photos → `intake`,
  callbacks → `results`. Every Telegram input is wired there and nowhere else; the BullMQ input is
  `results/notifications.consumer.ts` (a `@Processor` must be its own provider).
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

## Photo intake (`src/intake/`)

- Accepted: `message:photo` (the largest size) and `message:document` with an `image/*` MIME (sent as a file =
  original quality). Any other document → «Надішліть фото лічильника». The API decides the real type by content.
- **Buffer, then one upload**: an album is one update per photo (same `media_group_id`). `AlbumBuffer` (pure class)
  collects them by `album:<media_group_id>`, else `chat:<chatId>`, until 1.5 s of silence or 10 photos (Telegram's
  album maximum = the API's default `PHOTO_MAX_FILES`). Then: download each (`getFile`, over
  `min(20 MB Bot API limit, PHOTO_MAX_FILE_SIZE_MB)` → not downloaded), then **one `POST /photos`** with all files and
  `replyTo = <chatId>:<messageId of the first photo>` → one `batchId` for the album.
- **Relaxed rule** (was "never buffer photos before upload"): the handler returns before the upload, so a crash
  inside the window loses the buffered photos — the user resends; resending is safe (sha256 dedup).
- The API rejects a request with a bad file as a whole (`400 files[i]: …`, nothing stored): the bot drops file `i`
  and sends the rest again. 413 → the rest is "too large"; 401/403 → "no access to the API" (logged: check the key and
  scope); other errors → "try again".
- **One reply** to the first photo: «Прийнято N фото, розпізнаю…», «N фото вже отримано раніше.» (duplicates), one
  line per rejected file — its file name, or «фото N» (position) for a compressed photo. A failed reply is only
  logged (the photos are in the inbox).
- The file download URL (`<apiRoot>/file/bot<token>/…`, root, environment and token taken from the grammY `Api`,
  never hardcoded or read from config) contains the token: its errors are rethrown without URL or cause.

## Results (`src/results/`)

- **Input**: `notifications.consumer.ts` — BullMQ `@Processor` of `bot-notifications` (contract in `@rental/shared`),
  dispatch on the job name: `batch-parsed` (`{ batchId, replyTo }`) → `ResultsSender.send`. A signal only: the
  sender always loads fresh data. Retries are the API's job options (5 attempts, exponential); a failure is logged
  (ids + message). Unknown job name → `UnrecoverableError`.
- **Redis is used only for this** (consuming `bot-notifications`): `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD?`,
  the same names and defaults as the API and the worker (`src/queue/bullmq.config.ts`). The bot never enqueues.
- `ResultsSender` (own grammY `Api` from the token — no dependency on `BotService`):
  - `send(batchId, replyTo)`: `replyTo` = the intake's `<chatId>:<messageId>` (malformed → logged, dropped) →
    `GET /photo-batches/{batchId}` (+ `GET /apartments?active=true` only when a photo is `NOT_MATCHED`) → render →
    reply to the first photo. Batch 404 (photos deleted) → logged, no retry; other API errors / Telegram errors →
    thrown, so BullMQ retries.
  - `refresh(chatId, messageId, batchId)`: the same, as `editMessageText` of the tapped message ("message is not
    modified" ignored).
- **Render** (`render/summary.ts`, pure): the API's summary → text + buttons; the API computed everything (previous
  value, consumption, `lowerThanPrevious`, warnings `{ code, limit, months }`, `missingZones`, `canConfirm`) — the
  bot only words it (web wording for warnings, values `1520,350`). Per DRAFT: «Підтвердити» (only `canConfirm`) +
  «Скасувати»; «Підтвердити всі» for ≥ 2 `canConfirm`. Photos without a reading: `NOT_MATCHED` → one button per
  active apartment, `FAILED` → its `parseNote`, `PENDING` (after assign) → «розпізнаю…». Text cut at 4096.
- **callback_data** (`render/callback-data.ts`, ≤ 64 bytes, UUIDs as base64url = 22 chars):
  `rc:<batch>:<reading>` confirm, `rx:<batch>:<reading>` cancel, `bc:<batch>` confirm all,
  `as:<photo>:<apartment>` assign. The batch is in the reading buttons so the summary can be re-rendered; after
  assign it comes from the PATCH response. Unparseable (e.g. the old bot's `a:<token>`) → «Кнопка застаріла».
- **Buttons** (`buttons.handler.ts`, wired in `bot.service.ts` after the allowlist): `POST /readings/{id}/confirm`,
  `POST /readings/{id}/cancel` (reason «Скасовано в Telegram»; a key cancels only DRAFTs),
  `POST /photo-batches/{batchId}/confirm` (refusals → alert with the reasons), `PATCH /photos/{id}` (re-parse — the
  new summary comes with the next `batch-parsed`, as a new reply). API refusals (400/404/409) → an alert with the
  API's message. Always `answerCallbackQuery` once, then `refresh` (✅ / ❌, finished readings lose their buttons).
- Nothing in memory: a restart loses nothing but a buffered album (see intake); old buttons keep working.
