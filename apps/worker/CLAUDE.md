# apps/worker — photo parsing (BullMQ consumer)

NestJS standalone app (`createApplicationContext`, no HTTP server), native ESM like the API.

## Commands (from repo root)

- dev: `pnpm dev:worker` (also part of `pnpm dev`) · build: `pnpm --filter worker build` · lint: `pnpm --filter worker lint`
- API types: `pnpm gen:api` (root) regenerates `src/api/schema.d.ts` from `apps/api/openapi.json` (committed).

## Setup

- Env (root `.env`, validated in `src/config/env.validation.ts`): `API_BASE_URL` (with the `/api` prefix, e.g.
  `http://localhost:3001/api`), `API_KEY`, `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD?`.
  Extraction: `ANTHROPIC_API_KEY?` (the worker starts without it; extracting then throws), `EXTRACTION_PROVIDER`
  (`anthropic`), `EXTRACTION_MODEL` (default `claude-sonnet-5-5`; `claude-opus-5-5` if accuracy falls short),
  `EXTRACTION_EFFORT` (`low`…`max`, default `medium`).
- Key: `pnpm --filter api apikey:create --service worker --name "<label>" --scopes photos:read,meters:read,readings:create-draft,photos:parse-result`
  (scopes are fixed at creation — re-create the key when a new one is needed)
  → put the printed key into `API_KEY`. Missing scope → the job fails with a 403 hint, no retry.

## Rules

- **Talks to the API only** (HTTP, `API_CLIENT` = openapi-fetch typed by `src/api/schema.d.ts`). No DB, no MinIO,
  no Prisma, no raw SQL — the API owns data and business rules. Never hand-write API types.
- Never log `API_KEY`, the `Authorization` header or photo bytes (log sizes, ids, meter summaries).
- Queue/job names and payloads come from `@rental/shared` (`PHOTO_QUEUE`, `PARSE_PHOTO_JOB`, `ParsePhotoJobData`);
  the API is the producer (`jobId = photoId`, attempts + backoff set there).
- Never create CONFIRMED readings: parsed values only ever become DRAFTs a human confirms (later, #5).

## Modules

- `WorkerModule` (root) holds only global infra: `ConfigModule` and `BullModule.forRootAsync` (Redis connection).
- One feature module per queue (e.g. `PhotosModule`): it calls `BullModule.registerQueue` for its queue (required,
  or the `@Processor` fails at startup), imports `ApiClientModule` and provides its processor + services.

## Job flow (`src/photos/`)

- `ParsePhotoProcessor` (`@Processor(PHOTO_QUEUE)`, concurrency 1) dispatches on `job.name`; unknown → fails, no retry.
  Keep concurrency 1: the API merges values into drafts without locking (`POST /meters/{meterId}/draft-values`).
- `ParsePhotoService.run(photoId)`: `GET /photos/{id}` → `GET /apartments/{apartmentId}/meters` (installed only, with
  `lastReading`; none → log, done) → `GET /photos/{id}/file` → `PhotoExtractorService.extract` → `matchReadings` →
  one `POST /meters/{meterId}/draft-values` per matched zone (the API picks the draft: 201 new / 200 added or retry
  no-op). `readingDate` = upload day in Kyiv (`createdAt`), `period` = its month. Ends with one summary log line.
- Result (`ParseResultReporter` → `PUT /photos/{id}/parse-result`, shown in the web): `PARSED` if ≥ 1 value was
  posted, else `NOT_MATCHED` with the reasons (the summary lines / photo issues); `FAILED` with the error from the
  processor's `failed` handler after the last attempt. Best effort: a failed report is only logged (never retries the
  job — that would repeat the paid model call).
- Matching (`helpers/match-readings.ts`, pure) — worst case "not recognized", never "wrong meter": a recognized serial
  (≥ 4 digits) decides alone (equal, or prefix/suffix with ≥ 6 digits: cut off / leading year; no match → skip, no
  fallback); no serial → utility + zone must fit exactly one meter. Also skipped: zone not on the meter, value not a
  meter number, the same meter + zone twice in one photo. The model's `meterId` decides nothing (a disagreement is
  logged). Skips are only logged.
- Plausibility (`plausibility-warnings.ts`, BigInt thousandths from `@rental/shared`, never floats) vs `lastReading`:
  a lower value → warning (local check); otherwise the consumption goes through the shared `consumptionWarnings`
  (limits per utility + zone, × months; `hasLease: false` — the worker can't see leases, so no zero check here). Warnings + the model's confidence/issues (when not high) go into the
  draft's `note` (`draft-note.ts`, Ukrainian — shown on the review screen); they never block the draft.
- Expected refusals of `draft-values` are logged, not failures: 409 with `readingId` (zone already filled from another
  photo), 409 "Meter is removed", 400. No `ANTHROPIC_API_KEY` → `UnrecoverableError` (`ExtractionNotConfiguredError`).
  A retry repeats the paid model call; the posts themselves are idempotent per photo + zone.
- Errors (`src/api/helpers/api-error.ts`): 404/400 and 401/403 → `UnrecoverableError` (retrying can't help; 401/403
  hint at the key/scopes); other statuses and network errors → plain `Error`, retried by BullMQ. Failures are
  logged by the processor's `failed` handler.

## Photo extraction (`src/extraction/`)

- `PhotoExtractorService.extract({ image, meters })` → `Extraction` (`readings[]`: `meterId | null`, `serialNumber`,
  `utility`, `zone`, `value` as shown, `confidence` high/medium/low, `issues[]`; plus `photoIssues[]`). One LangChain
  vision call (`@langchain/anthropic`), only proposes — nothing is saved here (the job posts the matched values).
- Structured output via `withStructuredOutput(schema, { method: 'jsonSchema' })` (native `output_config.format`).
  **Never `functionCalling`**: it forces `tool_choice`, which current Claude models reject with a 400. No `thinking` /
  `temperature`: current models think adaptively, `outputConfig.effort` sets the depth.
- The SDK turns JSON-schema `enum` into a description hint (not enforced by the API), so `meterId` is a plain string
  and `normalizeExtraction()` (pure, `helpers/`) enforces the candidates: unknown id → null + issue; also comma → dot,
  leading zeros dropped (`00532.20` → `532.20`), serial → digits, value not a meter number / zone not on the meter →
  issue + `confidence: low`. Nothing is dropped.
- Prompt rules (OBIS codes, drums, water colours, stickers, serial formats) live in `helpers/extraction-prompt.ts`;
  candidates go in the user message (`describeCandidates`). The image is auto-oriented and fit into 1568 px
  (`prepareImage`, sharp) — Claude's base64 limit is 5 MB, the API accepts 15 MB photos.
- Never log the image, the prompt contents or `ANTHROPIC_API_KEY` (model, duration and counts only).
- Manual check: `pnpm --filter worker extract:samples -- samples` (from the repo root: path relative to
  `apps/worker`). The dir holds photos + `meters.json` + optional `expected.json` (format: `samples.example/`) and
  prints every reading plus ✓/✗ against the golden values. One paid model call per photo; `samples/` is gitignored.
