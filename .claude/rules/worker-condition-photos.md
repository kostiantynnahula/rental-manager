---
paths:
  - 'apps/worker/src/condition-photos/**'
  - 'apps/worker/src/llm/**'
---

# Condition photo descriptions (worker, `src/condition-photos/`)

Epic #125 / #129. The worker is the "eyes" for the condition photo search: photo → structured text. It never
computes embeddings (only the API calls the embedding model, #130).

- Queue `condition-photos`, job `describe-condition-photo` `{ photoId }` (`@rental/shared`; the API enqueues on
  upload, `jobId = photoId`, 5 attempts). Its own queue and processor (`DescribeConditionPhotoProcessor`,
  concurrency 1), so a 40-photo check-in doesn't delay meter parsing.
- `DescribeConditionPhotoService.run(photoId)`: `GET /condition-photos/{id}/file` (scope `condition-photos:read`) →
  `ConditionPhotoDescriber.describe` → `PUT /condition-photos/{id}/description` `{ description }` (scope
  `condition-photos:describe`) → `DESCRIBED`. The PUT is the job's output, so a refused one fails the job
  (400/401/403/404 → `UnrecoverableError`, others retried) — unlike the meter parse result, which is best effort.
- Failure: the processor's `failed` handler, after the last attempt or on an `UnrecoverableError`, sends
  `{ error }` via `ConditionDescriptionReporter` (→ `FAILED` + `indexNote`; best effort, only logged; ≤ 1000).
- Describer: one LangChain vision call, `DESCRIPTION_MODEL` (default `claude-haiku-5-5`), provider + key shared
  with extraction via `chatModel()` (`src/llm/chat-model.ts` — no `effort`, no thinking/temperature). Structured
  output `withStructuredOutput(schema, { method: 'jsonSchema' })`, **never `functionCalling`** (see
  `worker-extraction.md`). Image via `prepareImage` (`extraction/helpers/`). No key → `ExtractionNotConfiguredError`
  → no retry.
- Output (`ConditionPhotoDescriptionDto`, generated): `{ room: KITCHEN|BATHROOM|BEDROOM|LIVING|HALL|BALCONY|OTHER,
items: [{ name, count?, condition? }], summary }`, texts **in Ukrainian**. The schema uses nulls (every field
  present); `normalizeDescription()` (pure) trims, cuts to the API's limits (100 items, name 200, condition 500,
  summary 2000), unknown room → OTHER (the SDK's `enum` is only a hint), count only when > 1, empty summary → throws
  (retried).
- Prompt (`helpers/description-prompt.ts`): every visible item worth recording, plain names a landlord would
  search for; visible damage/wear named explicitly with where it is; never guess what isn't visible, never judge
  whether something works.
- Never log the image or the description texts (room, item count, sizes, ms only).
- Tests: build the services only via `conditionPhotoServices()` (`src/test/condition-photo-services.ts`); the
  describer spec mocks `@langchain/anthropic` — never a real model call.
