# apps/worker — photo parsing (BullMQ consumer)

NestJS standalone app (`createApplicationContext`, no HTTP server), native ESM like the API.

## Commands (from repo root)

- dev: `pnpm dev:worker` (also part of `pnpm dev`) · build: `pnpm --filter worker build` · lint: `pnpm --filter worker lint`
- API types: `pnpm gen:api` (root) regenerates `src/api/schema.d.ts` from `apps/api/openapi.json` (committed).

## Setup

- Env (root `.env`, validated in `src/config/env.validation.ts`): `API_BASE_URL` (with the `/api` prefix, e.g.
  `http://localhost:3001/api`), `API_KEY`, `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD?`.
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
- `ParsePhotoService.run(photoId)`: `GET /photos/{id}` (apartmentId, linked readings) → `GET /photos/{id}/file`
  (bytes) → `GET /apartments/{apartmentId}/meters`; for now it logs one summary (no LLM, no readings yet).
- Errors (`src/api/helpers/api-error.ts`): 404/400 and 401/403 → `UnrecoverableError` (retrying can't help; 401/403
  hint at the key/scopes); other statuses and network errors → plain `Error`, retried by BullMQ. Failures are
  logged by the processor's `failed` handler.
