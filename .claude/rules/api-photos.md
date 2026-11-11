---
paths:
  - 'apps/api/src/{photos,storage,queue}/**'
---

# Photos (API)

## Photos (`src/photos/`, storage in `src/storage/`)

- Storage: `StorageService` (`put` / `getStream` / `delete`) over `@aws-sdk/client-s3`; MinIO in dev. Config:
  `S3_ENDPOINT` (omit for real S3), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_FORCE_PATH_STYLE` (`true` for MinIO) — switching to S3 is config only. Nothing else imports the SDK.
- Keys: `photos/YYYY/MM/<photoId>.<ext>` (original) and `thumbnails/YYYY/MM/<photoId>.webp`; month = upload day in Kyiv.
  The uuid is the Photo row id. **Never** put the original filename in a key (it's only metadata).
- **The original is immutable**: stored byte-for-byte, never re-encoded or overwritten. Only the thumbnail is
  derived (sharp: EXIF orientation applied, max 400px, WebP). `width`/`height` are as displayed (after orientation).
- Type comes from the content (magic bytes, `file-type`), never from the header or extension. Allowed: JPEG, PNG,
  WebP. **HEIC is rejected** (our prebuilt sharp has no HEVC decoder) — revisit if tenants send HEIC.
- **Inbox** (`apartmentId = null`): a photo uploaded without an apartment (`POST /photos`, e.g. by the bot); same
  validation, dedup, thumbnail and parse job as `POST /apartments/:id/photos`. Listed by `GET /photos?inbox=true`
  (`inbox` required — the only filter for now; newest first, `PhotoListItemResponseDto`).
- **Dedup by sha256** (unique): same file in the same place (same apartment, or both inbox) → existing record with
  `duplicate: true`, nothing stored; an inbox upload of a file that already has an apartment → also `duplicate: true`;
  an apartment upload of a file in another apartment or in the inbox → 409 (`findDuplicate`).
- Consistency: upload = objects first, then the row (insert fails → delete the objects); delete = row first (tx), then
  objects (a failure only leaves a logged orphan object, never a row pointing at nothing).
- Limits (`PHOTO_MAX_FILES`, `PHOTO_MAX_FILE_SIZE_MB`) go through `MulterModule.registerAsync` (in-memory). Too many
  files → 400, too large → 413. `multer` isn't a direct dependency: don't import it at runtime (types come from `@types/multer`).
- A photo backs 0..n reading **values** (`ReadingValue.photoId`, FK `Restrict`; that value has `source = PHOTO`), always
  of the same apartment — one photo shows one register, so a two-zone reading may link two photos. "Unassigned"
  (the `unassigned=true` list, "Нерозібрані") = no value of a non-cancelled reading **or** a value still in a DRAFT
  (e.g. the worker's — it stays listed until a human confirms it). DELETE only when unassigned; values of cancelled readings are unlinked first and
  become `MANUAL` (CHECK `reading_values_source_matches_photo`). The list returns `canDelete` (= unassigned, counted via
  `photoWithUsageInclude`); the web follows it, DELETE re-checks. Detail lists each linked reading once with the
  `zones` read from this photo (`helpers/photo-readings.ts`).
- **Parse status** (`Photo.parseStatus` / `parseNote`, enum `photo_parse_status`): `PENDING` on upload (every new
  photo gets a job; it stays PENDING if the enqueue failed) → the worker sets `PARSED` (drafts created), `NOT_MATCHED`
  (+ why) or `FAILED` (+ error) via `PUT /photos/:id/parse-result` (API keys only, scope `photos:parse-result`, 204).
  `null` = photos from before parsing existed. The web polls while PENDING.
- File endpoints stream through the API (auth required), `Cache-Control: private, max-age=86400`.
- **Parse job**: a newly stored photo gets one BullMQ job `parse-photo` (`{ photoId }`) on queue `photos`
  (`PhotoJobsService.enqueueParse`, `src/queue/`; names and payload type from `@rental/shared`).
  `jobId = photoId` (never queued twice), 5 attempts, exponential backoff from 10 s; completed jobs kept 7 days,
  failed ones kept. Duplicates (`duplicate: true`, also a lost parallel race) get no job.
- Enqueue failure is logged and **never fails the upload**. BullMQ waits for the Redis connection without a limit,
  so `enqueueParse` gives up after 3 s (`ENQUEUE_TIMEOUT_MS`); the pending `add()` still lands if Redis comes back
  (same `jobId`). Redis client = `ioredis` (bullmq 6 has it only as an optional peer). Config: `REDIS_HOST`,
  `REDIS_PORT`, `REDIS_PASSWORD?`.
