---
paths:
  - 'apps/api/src/condition-photos/**'
  - 'apps/api/src/embeddings/**'
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
- `PATCH /condition-photos/:id` — `event`, `takenOn`, `note` (null clears; event/takenOn can't be null). Doesn't
  touch `indexStatus`: the searchable text is built from the description, not from these fields.
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
    `constants/`; Json, no schema enum) → `DESCRIBED`, `indexNote: null`; or `error` (≤ 1000) → `FAILED` +
    `indexNote`, the earlier description kept — an error for a photo already `DESCRIBED`/`INDEXED` is a no-op 204
    (a usable description wins). Both/neither → 400. Idempotent (a retry overwrites). Upload enqueues in parallel
    (`Promise.all`): with Redis down the request waits one 3 s timeout, not one per photo.
  - Embeddings (`DESCRIBED` → `INDEXED`, #130): after saving a description the same PUT embeds it and upserts
    `photo_embeddings` → `INDEXED` (`ConditionPhotoIndexService`). Saved first: a Voyage failure (502) or no
    `VOYAGE_API_KEY` (503) leaves the photo `DESCRIBED` with its description — a 5xx, so the worker's job retries;
    `pnpm --filter api embed:backfill` indexes what's left. The worker's side: `worker-condition-photos.md`.
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
  checked before Voyage). Own route, not a list param: sorted by relevance with `score` = 1 − cosine distance
  (`ConditionPhotoSearchResultDto` = the list item + `score`). Only `INDEXED` photos appear. Runs in a transaction
  with `SET LOCAL hnsw.iterative_scan = strict_order` (pgvector ≥ 0.8): otherwise HNSW returns its ef_search (40)
  nearest across **all** apartments and the filters run after — fewer results than `limit`, or none.
