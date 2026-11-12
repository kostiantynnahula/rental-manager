# apps/bot — Telegram bot (grammY)

NestJS standalone app (`createApplicationContext`, no HTTP server), native ESM — same layout as `apps/worker`.

## Commands (from repo root)

- dev: `pnpm dev:bot` (also part of `pnpm dev`) · build: `pnpm --filter bot build` · lint: `pnpm --filter bot lint`
- API types: `pnpm gen:api` (root) regenerates `src/api/schema.d.ts` (`scripts/gen-api.mjs`, a copy of the worker's:
  only the operations open to API keys). A new endpoint for the bot needs `@Scopes(...)` + `@ApiBearerAuth()` first.

## Setup

- Env (validated in `src/config/env.validation.ts`; names in the root `.env.example`): `TELEGRAM_BOT_TOKEN`
  (BotFather), `TELEGRAM_ALLOWED_USER_IDS` (comma-separated Telegram user ids), `PHOTO_MAX_FILE_SIZE_MB?` (default 15, shared with the API), `API_BASE_URL` (with `/api`),
  `BOT_API_KEY` (the bot's own key; the worker's is `WORKER_API_KEY`). Root `.env`; an optional `apps/bot/.env` wins
  over it.
- Key: `pnpm --filter api apikey:create --service telegram-bot --name "<label>" --scopes photos:upload,photos:read,meters:read,apartments:read,readings:read,readings:confirm,readings:cancel,photos:assign` (at least one scope;
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
  then `bot.start()` **not awaited** (it resolves only when polling stops; a rejection → log + SIGTERM to itself:
  the Ctrl+C path, so `drain()` still runs; exit code 143).
- `onApplicationShutdown` (`enableShutdownHooks`, Ctrl+C / SIGTERM), in this order: `bot.stop()` (only aborts
  `getUpdates`) → await the `start()` promise (the current batch of updates is handled) → `intake.drain()` → `watcher.stop()`
  (polling for results ends, nothing more is sent). Not a
  hook of its own in `PhotoIntakeService`: Nest runs hooks concurrently, and a flush before polling ends can drop a photo.

## Photos (`src/telegram/photo-intake.service.ts`, `src/photos/`)

- Accepted: `message:photo` (the largest size) and `message:document` with an `image/*` MIME (sent as a file =
  original quality). Any other document → «Надішліть фото лічильника». The API decides the real type by content.
- **Upload in the handler, batch only the reply**: `add()` awaits the photo's download + upload, so grammY
  confirms the update to Telegram only after the photo is in the inbox — a crash mid-upload → Telegram redelivers
  it after a restart (a repeat = sha256 duplicate). Never buffer photos in memory before uploading them
  ("Always keep the photo"). Cost: while a photo uploads, other updates wait (grammY runs them one by one).
- **Reply batches**: an album is one update per photo (same `media_group_id`). `PhotoBatcher` collects the upload
  outcomes by `album:<media_group_id>`, else `chat:<chatId>`, and replies after 1.5 s of silence; `hold(key)` stops
  the timer while the next photo uploads (an upload can take longer than that). In memory: a crash loses only the
  reply. Shutdown: `drain()` (after polling stopped) sends the waiting replies.
- Per photo (in the order sent): `getFile` + download (`helpers/download-telegram-file.ts`), then **one `POST /photos` each**
  (inbox, scope `photos:upload`) so one rejected file doesn't fail the album. Over `min(20 MB Bot API download limit,
PHOTO_MAX_FILE_SIZE_MB)` → not downloaded (no `file_size` → checked after the download, before the upload).
  `PHOTO_MAX_FILE_SIZE_MB` = the API's var (same name and default 15, one value in the root `.env`). Outcomes: accepted / duplicate (sha256 — information, not an error) / unsupported (400 `files[i]: …`:
  type / corrupt) / too-large (413 or over the limit) / unauthorized (401/403: key or scope — no "try again") / failed
  (other statuses, network) → **one reply per batch** (`batchReply`, «Прийнято N фото, розпізнаю…»).
- The file download URL (`<apiRoot>/file/bot<token>/…`, root, environment and token taken from the grammY `Api`, never
  hardcoded or read from config) contains the token: its errors are rethrown without URL or cause. `uploadOne`
  never throws (an error = `failed` outcome). The reply runs from a timer, outside the middleware (`bot.catch`
  doesn't see it): if it fails, that is only logged (the photos are already in the inbox).

## Parse results (`src/results/`)

- **Confirming is the owner's tap only**: `readings:confirm` / `readings:cancel` are used only from a result button,
  after the allowlist. Nothing is confirmed automatically (see `api-auth.md`). With a key the API cancels only DRAFTs.
- `ParseWatcherService.watch()` (after the batch reply, not awaited, own tracking + `stop()`): `GET /photos/{id}`
  every 3 s while `PENDING`, ≤ 5 min. Then: the photos with readings → **one summary** (reply to the first photo);
  each `NOT_MATCHED` → a reply with active-apartment buttons; `FAILED` → the `parseNote`; still `PENDING` / API
  unreachable → «перевірте у вебі». Duplicates go the same way (they show their readings' current state).
- Summary (`SummaryService` loads, `helpers/render-summary.ts` renders, pure): readings once each (two photos may share
  one) via `GET /readings/{id}` (values, consumption since the last CONFIRMED), meters via `GET /apartments/{id}/meters`
  (`lastReading` → months), names + `currentLease` via `GET /apartments`. Per zone: value, previous, consumption
  (BigInt thousandths, 3 decimals); warnings from `@rental/shared` `consumptionWarnings` (web wording) and «менше за
  попереднє». Buttons per DRAFT: confirm (not for a partial draft or a lower value) + cancel; «Підтвердити всі» for ≥ 2
  confirmable. Plain text, no parse_mode.
- `callback_data` ≤ 64 bytes: `rc:<readingId>` / `rx:<readingId>` (stateless, survive a restart); confirm-all and
  assign are `a:<token>` → `ResultsStateService` (in memory, 24 h, one-shot). A stale token → «Кнопка застаріла».
- After a tap (`ResultActionsService`): the summary is **re-rendered from the API** (✅ / ❌, finished drafts lose their
  buttons — a button can't be tapped twice) + the result line; API refusals (400/409, the API's message) as text and an
  alert. Without the summary's state (restart): only the tapped reading's row is removed and the result appended.
  `answerCallbackQuery` is always called. Assign: `PATCH /photos/{id}` → message «Квартира: X — розпізнаю…» → watched
  again (re-parse) → a new summary.
- Everything here is in memory: a restart loses waiting results and tokens, never photos or drafts (they are in the API).
