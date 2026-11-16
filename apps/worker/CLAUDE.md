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
- Services call `WorkerApi` (`src/api/worker-api.service.ts`), never `API_CLIENT` directly (`ApiClientModule`
  exports only `WorkerApi`). A new endpoint = a new `WorkerApi` method: returns data or throws (`apiError`); an
  expected refusal (e.g. `postDraftValue`'s 409/400) comes back as a typed `{ ok: false, ... }` result.
- Never log `WORKER_API_KEY`, the `Authorization` header or photo bytes (log sizes, ids, meter summaries).
- Queue/job names and payloads come from `@rental/shared` (`PHOTO_QUEUE`, `PARSE_PHOTO_JOB`, `ParsePhotoJobData`);
  the API is the producer (`jobId = photoId`, attempts + backoff set there).
- Never create CONFIRMED readings: parsed values only ever become DRAFTs a human confirms.

## Tests

- `pnpm --filter worker test` (Vitest, globals). Specs are colocated (`foo.ts` → `foo.spec.ts`); the worker's own
  builders live in `src/test/`, kept out of the build (`tsconfig.build.json` excludes it and `**/*spec.ts`).
- Service tests: the API is `fakeApi<paths>(routes)` from `@rental/testing` (`packages/testing`) — the real
  openapi-fetch client with a fake `fetch`; routes `'METHOD /path?query'` → `json()` / `status()` responses; records
  requests; an unknown route fails the test. Build the photo-job services only via `photoServices()`
  (`src/test/photo-services.ts`) — never `new` them in a spec, so a constructor change touches one file.
- A PR that changes behaviour comes with tests for it.
- A test failing because of this PR's change → fix it in this PR. Never weaken a test to make it pass — tell me.
- A bug found in merged code → an `it.fails(...)` test with a `// bug: …` line above it, listed under "Found bugs" in
  the PR description. Don't fix the code and don't create issues — I decide.
- Never run `extract:samples` in tests or reviews (paid model calls) — only when I ask.

## Modules

- `WorkerModule` (root) holds only global infra: `ConfigModule` and `BullModule.forRootAsync` (Redis connection).
- One feature module per queue (e.g. `PhotosModule`): it calls `BullModule.registerQueue` for its queue (required,
  or the `@Processor` fails at startup), imports `ApiClientModule` (for `WorkerApi`) and provides its processor + services.

## More

- Feature details — path-scoped rules, loaded when a file of that area is opened:
  - Job flow — parse-photo, matching, inbox, plausibility, errors (`src/photos/`): `.claude/rules/worker-photos.md`
  - Photo extraction — LangChain call, prompt, normalization, samples script (`src/extraction/`, `src/scripts/`):
    `.claude/rules/worker-extraction.md`
- Project rules override advice from skills.
