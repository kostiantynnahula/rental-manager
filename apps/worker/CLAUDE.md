# apps/worker — photo parsing (BullMQ consumer)

NestJS standalone app (`createApplicationContext`, no HTTP server), native ESM like the API.

## Commands (from repo root)

- dev: `pnpm dev:worker` (also part of `pnpm dev`) · build: `pnpm --filter worker build` · lint: `pnpm --filter worker lint`
- API types: `pnpm gen:api` (root) regenerates `src/api/schema.d.ts` from `apps/api/openapi.json` (committed) via
  `scripts/gen-api.mjs`: only the operations open to API keys (`bearer` security) and the schemas they reference.
  A new endpoint for the worker needs `@Scopes(...)` + `@ApiBearerAuth()` in the API first, or it won't be generated.

## Setup

- Env (root `.env`, validated in `src/config/env.validation.ts`): `API_BASE_URL` (with the `/api` prefix, e.g.
  `http://localhost:3001/api`), `WORKER_API_KEY`, `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD?`.
  Extraction: `ANTHROPIC_API_KEY?` (the worker starts without it; extracting then throws), `EXTRACTION_PROVIDER`
  (`anthropic`), `EXTRACTION_MODEL` (code default `claude-sonnet-5-5`; `.env.example` uses `claude-haiku-5-5`, which reads
  the golden set fine — go up to Sonnet/Opus only if accuracy falls short),
  `EXTRACTION_EFFORT` (`low`…`max`, default `medium`).
- Key: `pnpm --filter api apikey:create --service worker --name "<label>" --scopes photos:read,meters:read,readings:create-draft,photos:parse-result`
  (scopes are fixed at creation — re-create the key when a new one is needed)
  → put the printed key into `WORKER_API_KEY`. Missing scope → the job fails with a 403 hint, no retry.

## Rules

- **Talks to the API only** (HTTP, `API_CLIENT` = openapi-fetch typed by `src/api/schema.d.ts`). No DB, no MinIO,
  no Prisma, no raw SQL — the API owns data and business rules. Never hand-write API types.
- Never log `WORKER_API_KEY`, the `Authorization` header or photo bytes (log sizes, ids, meter summaries).
- Queue/job names and payloads come from `@rental/shared` (`PHOTO_QUEUE`, `PARSE_PHOTO_JOB`, `ParsePhotoJobData`);
  the API is the producer (`jobId = photoId`, attempts + backoff set there).
- Never create CONFIRMED readings: parsed values only ever become DRAFTs a human confirms.

## Modules

- `WorkerModule` (root) holds only global infra: `ConfigModule` and `BullModule.forRootAsync` (Redis connection).
- One feature module per queue (e.g. `PhotosModule`): it calls `BullModule.registerQueue` for its queue (required,
  or the `@Processor` fails at startup), imports `ApiClientModule` and provides its processor + services.

## Details (path-scoped rules, loaded when those files are touched)

- Job flow — parse-photo, matching, inbox, plausibility, errors (`src/photos/`): `.claude/rules/worker-photos.md`
- Photo extraction — LangChain call, prompt, normalization, samples script (`src/extraction/`, `src/scripts/`):
  `.claude/rules/worker-extraction.md`
