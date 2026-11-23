---
paths:
  - 'apps/worker/src/condition-photos/**'
  - 'apps/worker/src/llm/**'
  - 'apps/worker/src/scripts/describe-samples*.ts'
  - 'apps/worker/src/scripts/helpers/{format-description,missing-items,parse-condition-expectations}*.ts'
  - 'apps/worker/src/scripts/interfaces/condition-sample-expectation*.ts'
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
- Prompt (`helpers/description-prompt.ts`): every visible item worth recording, by its everyday Ukrainian name;
  common synonyms in parentheses for items people name differently — «мийка (раковина)», «змішувач (кран)», at most
  2–3, never invented, none for items with one usual name (#146: a query with the other name scored 0.45 vs 0.65); visible damage/wear named explicitly with where it is; never guess what isn't visible, never judge
  whether something works.
- Never log the image or the description texts (room, item count, sizes, ms only).
- Tests: build the services only via `conditionPhotoServices()` (`src/test/condition-photo-services.ts`); the
  describer spec mocks `@langchain/anthropic` — never a real model call.
- Manual check (#144): `pnpm --filter worker describe:samples -- samples/condition` (from the repo root: path relative
  to `apps/worker`). Every photo of the dir → `ConditionPhotoDescriber.describe` → prints room, ms, items
  (`назва ×N — стан`) and the summary; no API, queue or DB (`DescribeSamplesModule`: config + describer only).
  Optional `expected.json` (`{ file, items: string[] }[]`, format: `samples.example/condition/`) → `✗ missing: …`
  per photo (case-insensitive substring of the item names, `missingItems`) and a total; a wrong shape throws
  (`parseConditionExpectations`), an entry with no such photo → `✗ expected.json: no photo …` before the model
  calls. Prints the description texts — a local tool, unlike the job. One paid model call per photo: only when I ask, never in tests or reviews;
  `samples/` is gitignored.
