---
paths:
  - 'apps/bot/src/results/**'
  - 'apps/bot/src/queue/**'
---

# Results (bot, `src/results/`)

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
- **Render** (`render/summary.ts`, pure): the API's summary → text + buttons; the API computed everything (see
  `api-photo-batches.md` for what each field means — don't restate it here) — the bot only words it (web wording for warnings, values `1520,350`). Per DRAFT: «Підтвердити» (only `canConfirm`) +
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
