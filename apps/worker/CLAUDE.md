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
- Key: `pnpm --filter api apikey:create --service worker --name "<label>" --scopes photos:read,meters:read,readings:create-draft`
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
- `ParsePhotoService.run(photoId)`: `GET /photos/{id}` (apartmentId, linked readings) → `GET /photos/{id}/file`
  (bytes) → `GET /apartments/{apartmentId}/meters`; for now it logs one summary (no LLM, no readings yet).
- Proposed values (later): one `POST /meters/{meterId}/draft-values` per zone read from the photo — the API decides
  which draft it goes into (201 new / 200 added or retry no-op / 409 zone already filled from another photo).
- Errors (`src/api/helpers/api-error.ts`): 404/400 and 401/403 → `UnrecoverableError` (retrying can't help; 401/403
  hint at the key/scopes); other statuses and network errors → plain `Error`, retried by BullMQ. Failures are
  logged by the processor's `failed` handler.

## Photo extraction (`src/extraction/`)

- `PhotoExtractorService.extract({ image, meters })` → `Extraction` (`readings[]`: `meterId | null`, `serialNumber`,
  `utility`, `zone`, `value` as shown, `confidence` high/medium/low, `issues[]`; plus `photoIssues[]`). One LangChain
  vision call (`@langchain/anthropic`), only proposes — nothing is saved. Not wired into the job yet (next: post each
  zone to `draft-values`).
- Structured output via `withStructuredOutput(schema, { method: 'jsonSchema' })` (native `output_config.format`).
  **Never `functionCalling`**: it forces `tool_choice`, which current Claude models reject with a 400. No `thinking` /
  `temperature`: current models think adaptively, `outputConfig.effort` sets the depth.
- The SDK turns JSON-schema `enum` into a description hint (not enforced by the API), so `meterId` is a plain string
  and `normalizeExtraction()` (pure, `helpers/`) enforces the candidates: unknown id → null + issue; also comma → dot,
  serial → digits, value not a meter number / zone not on the meter → issue + `confidence: low`. Nothing is dropped.
- Prompt rules (OBIS codes, drums, water colours, stickers, serial formats) live in `helpers/extraction-prompt.ts`;
  candidates go in the user message (`describeCandidates`). The image is auto-oriented and fit into 1568 px
  (`prepareImage`, sharp) — Claude's base64 limit is 5 MB, the API accepts 15 MB photos.
- Never log the image, the prompt contents or `ANTHROPIC_API_KEY` (model, duration and counts only).
- Manual check: `pnpm --filter worker extract:samples -- samples` (from the repo root: path relative to
  `apps/worker`). The dir holds photos + `meters.json` + optional `expected.json` (format: `samples.example/`) and
  prints every reading plus ✓/✗ against the golden values. One paid model call per photo; `samples/` is gitignored.
