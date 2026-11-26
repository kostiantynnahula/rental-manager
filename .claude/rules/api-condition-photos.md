---
paths:
  - 'apps/api/src/condition-photos/**'
  - 'apps/api/src/embeddings/**'
  - 'apps/api/src/cli/{describe-requeue,embed-backfill,search-debug}*.ts'
  - 'apps/api/src/queue/condition-photo-jobs.service.ts'
---

# Condition photos (API)

Epic #125. Photos of an apartment's condition: at check-in, at check-out, and when something changes during a lease.
Separate from meter `Photo` (`api-photos.md`): no inbox, no parsing, no readings, no batches.

- **ConditionPhoto** belongs to the **apartment**, not to a lease (an item replaced during one lease stays for the
  next). `event` CHECK_IN | CHECK_OUT | CHANGE; `takenOn` (date) is set by the user — messengers strip EXIF —
  `uploadedAt` is kept separately. `note` ≤ 500 (blank = null). `mimeType`/`size` as meter photos.
- **Lease is derived, never validated**: detail returns `lease` = the apartment's lease with
  `startDate ≤ takenOn ≤ endDate ?? ∞` (`currentLeaseWhere(takenOn)`, `src/apartments/helpers/` — at most one, leases
  never overlap), or null. A CHECK_IN photo the day before
  the lease starts is fine.
- Upload `POST /apartments/:id/condition-photos`: multipart `files` + `event`, `takenOn`, `note?` for the whole
  request (`UploadConditionPhotosBodyDto`). Unknown **or archived** apartment → **404** (meter photos: 400 for
  archived). The list still shows an archived apartment's history.
- Same file rules and flow as meter photos, from the shared code in `src/images/` (`prepareImages`, `putAll` /
  `deleteAll`, thumbnail, magic-byte type, Multer limits): original immutable, JPEG/PNG/WebP, all-or-nothing, a file
  repeated in one request stored once, lost parallel race → the other upload's row.
- **Dedup by sha256** (unique in `condition_photos` — its own space, a meter photo with the same bytes doesn't
  conflict): same apartment → existing record `duplicate: true` (its own event/takenOn/note kept); another
  apartment → 409.
- Keys: `condition-photos/YYYY/MM/<id>.<ext>`, `condition-thumbnails/YYYY/MM/<id>.webp`; month = upload day (Kyiv),
  not `takenOn` (it can be edited).
- List `GET /apartments/:id/condition-photos?event=&from=&to=` (all optional, dates inclusive on `takenOn`; from > to → 400), sorted
  `takenOn desc, uploadedAt desc, id desc`.
- `PATCH /condition-photos/:id` — `event`, `takenOn`, `note` (null clears; event/takenOn can't be null): these don't
  touch `indexStatus` (the searchable text is built from the description only). And `description` (#142):
  - an object (`ConditionPhotoDescriptionDto`, the worker's limits) replaces it **as a whole** (no item merge),
    `descriptionEditedAt = now`, in any `indexStatus` (a FAILED/PENDING photo can be described by hand);
  - `null` → back to `generatedDescription`, `descriptionEditedAt = null`; edited but no generated one → 409; not
    edited → nothing to restore, no-op;
  - the same content as now (key order ignored, `sameDescription`) → no edit mark, no re-index (stays searchable);
  - written only while the photo is as read (`descriptionEditedAt` + `generatedDescription` in the `where`, no row
    lock): a worker PUT in between → 409 "changed meanwhile", never a stale restore;
  - a changed description → `DESCRIBED`, `indexNote: null` (one transaction with the other fields) → re-embedded →
    `INDEXED`. Voyage 502/503 → still 200, left `DESCRIBED` for `embed:backfill`: a human edit never fails on
    indexing (the worker's PUT does fail, so its job retries).
- `DELETE` is always allowed: row first (tx), then objects (`deleteAll`: a failure only logs an orphan).
- Human-only routes (no `@Scopes`) — API keys are denied; the lease in detail includes tenants. Open to the
  worker's key only: `GET /condition-photos/:id/file` (`condition-photos:read`, the bytes — not the detail) and
  `PUT /condition-photos/:id/description` (`condition-photos:describe`).
- Indexing (`indexStatus` PENDING → DESCRIBED → INDEXED | FAILED, `description` Json, `indexNote`):
  - Upload enqueues `describe-condition-photo` `{ photoId }` on the `condition-photos` queue (`@rental/shared`,
    `ConditionPhotoJobsService`) for every new photo, **after the commit**; a duplicate gets no job. Never throws
    (a queue outage leaves the photo PENDING).
  - `PUT /condition-photos/:id/description` (keys only — a human gets 403, 204): exactly one of
    `description` `{ room, items[{ name, count?, condition? }], summary }` (`ConditionPhotoDescriptionDto`, rooms in
    `constants/`; Json, no schema enum; typed as that DTO in OpenAPI responses — only this PUT and the PATCH write
    it, both validated) → `DESCRIBED`, `indexNote: null` (an edited photo: see "Human edit wins"); or `error`
    (≤ 1000) → `FAILED` +
    `indexNote`, the earlier description kept — an error for a photo already `DESCRIBED`/`INDEXED` is a no-op 204
    (a usable description wins). Both/neither → 400. Idempotent (a retry overwrites). Upload enqueues in parallel
    (`Promise.all`): with Redis down the request waits one 3 s timeout, not one per photo.
  - Embeddings (`DESCRIBED` → `INDEXED`, #130): after saving a description the same PUT embeds it and upserts
    `photo_embeddings` → `INDEXED` (`ConditionPhotoIndexService`). Saved first: a Voyage failure (502) or no
    `VOYAGE_API_KEY` (503) leaves the photo `DESCRIBED` with its description — a 5xx, so the worker's job retries;
    `pnpm --filter api embed:backfill` indexes what's left (every `DESCRIBED` photo + any described photo without a
    row of the current model — a re-described photo still has its old row). The worker's side: `worker-condition-photos.md`.
  - **Human edit wins** (#142): `generatedDescription` = the worker's last description (always written by the PUT);
    `description` = the searched one, written by the PUT only while `descriptionEditedAt` is null. An edited photo's
    PUT updates `generatedDescription` only (status and search untouched, no Voyage call), still 204. Detail returns
    `generatedDescription`; list/search/detail `descriptionEditedAt`.
  - Re-describe CLI `pnpm --filter api describe:requeue -- --apartment <id|name> | --all | --photo <id> [--photo <id>…]`
    (#146, e.g. after a prompt change; `src/cli/describe-requeue.ts`): enqueues `describe-condition-photo` for every
    photo of the apartment (or all, archived apartments too) except `PENDING` ones (their upload job is still due — a
    second job = a second paid call). `--photo` (to check a prompt change on one photo, 1 call): an unknown id or a
    `PENDING` one is an error, nothing is queued. The CLI doesn't reset `indexStatus`, but the worker's PUT sets
    `DESCRIBED` before embedding: the photo is **out of search from the PUT until re-embedded** (seconds; a Voyage
    failure → `embed:backfill`). Via `ConditionPhotoJobsService.enqueueRedescribe`: own jobId `<photoId>-<ms>` (the
    upload's `jobId = photoId` is kept 7 days / failed forever and BullMQ ignores a repeated id) and it **throws** (the
    upload path never does); the CLI stops at the first failure, prints `queued N of M`. Own Nest module
    (`DescribeRequeueModule`): BullMQ connects at startup, so `CliModule` stays without queues. Each job is a paid model
    call in the worker; an edited photo then only gets its `generatedDescription` refreshed (the CLI doesn't skip it).
- **Embeddings** — the **API owns the model**: documents and queries must be embedded by the same model (and
  `input_type` document/query), so only `EmbeddingsService` (`src/embeddings/`, `voyage-4`, 1024) knows it; the
  worker sends text, never vectors. Voyage via LangChain (`VoyageEmbeddings` from `@langchain/mongodb`).
  - Embedded text (`embeddingText`): room in Ukrainian (`ROOM_LABELS`; OTHER left out) + summary + items
    `назва ×N (стан)`.
  - `PhotoEmbedding` (`photo_embeddings`): one row per (`photoId`, `kind`, `model`) — `kind` `'TEXT'` now (TS const,
    not a DB enum), a new model / an IMAGE kind = new rows, no schema change. `ON DELETE CASCADE` with the photo.
  - Raw SQL (Prisma can't write or compare a `vector`), only in `ConditionPhotoIndexService`: the upsert
    (`INSERT … SELECT FROM condition_photos … FOR UPDATE` → a deleted photo is a 404, not an FK error; only while
    the photo still has the embedded description — a newer PUT saved during the Voyage call wins, the stale vector
    is dropped) and the search.
  - HNSW index `photo_embeddings_text_hnsw` (`vector_cosine_ops`) is **partial** (`WHERE kind = 'TEXT'`): Prisma
    ignores partial indexes, a full one shows as drift (a `DROP INDEX` in the next migration). So the search compares
    `e.kind = 'TEXT'` as a **literal** — a bind parameter doesn't match the predicate and skips the index. Another
    kind (other dimensions) → its own partial index.
  - Model change: bump `EMBEDDING_MODEL`, run `embed:backfill` (embeds every described photo without a row of the
    new model). Search only uses the current model's rows; old rows can be deleted afterwards.
- Search `GET /apartments/:id/condition-photos/search?q=&event=&from=&to=&limit=` (human-only): `q` required
  (trimmed, ≤ 500), `limit` 1..50 (default 10), the list's filters (from > to → 400); unknown apartment → 404 (both
  checked before Voyage). Own route, not a list param (`ConditionPhotoSearchResultDto` = the list item + `score`).
  Only `INDEXED` photos appear. **Two stages** (#141, `ConditionPhotoIndexService.search`): the `SEARCH_CANDIDATES`
  (50) nearest by vector → `RerankService` → keep `score ≥ RERANK_MIN_SCORE` (0.50) → first `limit`, rerank order,
  `score` = the rerank score. May be fewer than `limit`, or `[]`. Why: vector scores can't be thresholded (the right
  photo 0.240, a kitchen without one 0.247 for "мийка"); rerank splits relevant ≥ 0.551 / irrelevant ≤ 0.474 — a kitchen without
  the item reaches ~0.47 when the query names the room ("кран на кухні"), hence not #140's 0.45. Re-check
  the threshold with `search:debug` after a prompt or rerank-model change (`constants/condition-photo-search.ts`).
  Rerank fails → 502, no vector-only fallback (that's the noise removed); no key → 503; no retry. Runs in a transaction
  with `SET LOCAL hnsw.iterative_scan = strict_order` (pgvector ≥ 0.8): otherwise HNSW returns its ef_search (40)
  nearest across **all** apartments and the filters run after — fewer results than `limit`, or none.
  - The vector part is `ConditionPhotoIndexService.candidates(apartmentId, { q, event?, from?, to? }, n)`: the route
    and the CLI below call it.
- **Rerank** (#140; the search route's second stage since #141): `RerankService`
  (`src/embeddings/`) is the only place that knows the rerank model (`rerank-2.5`, `constants/rerank-model.ts`).
  `rerank(query, documents[]) → { index, score }[]`, most relevant first. Plain `fetch` to Voyage's `/v1/rerank`:
  LangChain has no standalone Voyage reranker (`@langchain/mongodb` reranks only inside an Atlas search). Errors as
  `EmbeddingsService`: no key → 503, any Voyage failure or a malformed response (incl. a repeated index) → 502.
  ≤ 1000 documents per call — the caller caps, more is a 500 (a bug). No retry (EmbeddingsService has 2): a failed
  search is retried by the user (the web's retry button).
  Documents = `embeddingText(description)`, the same text as the embedding.
  - Debug CLI `pnpm --filter api search:debug -- --apartment <id|name> [--event CHECK_IN] [--candidates 50] "<query>"`
    (`src/cli/search-debug.ts`). `--apartment` is a uuid or a case-insensitive part of the name (must match one; an
    exact name wins). Prints a `console.table` of every candidate sorted by rerank score: rank, rerank, vector,
    kept (`✓` = ≥ `RERANK_MIN_SCORE`, what the route returns up to its `limit`), event, takenOn, room, summary, id.
    Every candidate is printed: it's for checking the threshold.
- **Baseline** (#159, the chat's `get_condition_baseline`): `ConditionPhotosService.baseline(apartmentId, date)` = the
  apartment's state on a date. Takes the photos of the latest CHECK_IN day ≤ date, plus the CHANGE photos taken on or
  after that day up to the date, oldest first (a same-day check-in before its changes). Earlier check-ins (an older
  lease) and CHECK_OUT photos are not part of it. No check-in yet → `checkInOn: null` and every CHANGE up to the date.
  The pure part is `helpers/condition-baseline.ts`. `ConditionPhotosService` is exported for the chat tools.
