# Worker

Reads photos with Claude vision and sends the results to the API. A NestJS standalone app (no HTTP server) that
consumes two BullMQ queues the API fills on upload:

- `photos` — meter photos → values matched to meters → **DRAFT** readings (a human confirms them).
- `condition-photos` — apartment condition photos → a structured description in Ukrainian (room, items, summary),
  which the API embeds for the search.

It only talks to the API over HTTP (its own API key): no database, no photo storage.

## Run

Env lives in the root `.env` (see `.env.example`): `API_BASE_URL`, `WORKER_API_KEY`, `ANTHROPIC_API_KEY`, Redis.
Models: `EXTRACTION_MODEL` (meters), `DESCRIPTION_MODEL` (condition photos). The command that creates the worker's key
is in the [root README](../../README.md#photo-parsing-worker).

```bash
pnpm infra:up      # Redis (+ Postgres, MinIO for the API)
pnpm dev:api
pnpm dev:worker
```

Tests: `pnpm --filter worker test` (no real model calls).

## Samples scripts — check the model on local photos

Run the model on photos in a folder and print what it saw. No API, queue or DB — only the root `.env`
(`ANTHROPIC_API_KEY` and the model). **Each photo is one paid model call.**

The folder path is **relative to `apps/worker`** (`pnpm --filter worker` runs there), or absolute. Keep real photos
in `apps/worker/samples/` — gitignored, they are private (meters, the inside of the apartments):

```
apps/worker/samples/
  *.jpg, meters.json, expected.json     ← extract:samples (meter photos)
  condition/
    *.jpg, expected.json                ← describe:samples (condition photos)
```

Format examples: [`samples.example/`](samples.example/).

### `describe:samples` — condition photo descriptions

```bash
pnpm --filter worker describe:samples -- samples/condition
```

Every `.jpg/.jpeg/.png/.webp` in the folder → room, time, items (`назва ×N — стан`), summary:

```
photo_2026-01-04_21-01-08.jpg — KITCHEN · 20775 ms
  - кругла мийка з нержавіючої сталі
  - змішувач
  - ламінат темно-коричневий — на підлозі видно дрібні плями та пил
  summary: Кухня з білою стільницею, мийкою з нержавіючої сталі та змішувачем. …
```

Optional `expected.json` — items each photo's description should name (a case-insensitive part of an item name, so
`раковина` is found in «мийка (раковина)»):

```json
[{ "file": "photo_2026-01-04_21-01-08.jpg", "items": ["мийка", "раковина", "кран"] }]
```

→ per photo `✓ all expected items` or `✗ missing: раковина, кран`, and `Expected items found: N/M` at the end. A
`file` with no such photo is reported before any model call.

Use it to tune the prompt (`src/condition-photos/helpers/description-prompt.ts`): run before and after on the same
photos — the wording varies a little from run to run.

### `extract:samples` — meter readings

```bash
pnpm --filter worker extract:samples -- samples            # photos of a known apartment
pnpm --filter worker extract:samples -- samples --inbox    # as inbox photos (apartment unknown)
```

The folder needs `meters.json` (the apartment's meters the model may match) and optionally `expected.json` (the
right values) → every reading, then `✓`/`✗` per expected value and `Golden values: N/M`.
