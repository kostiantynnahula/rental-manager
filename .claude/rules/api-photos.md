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
  (`inbox` required — the only filter for now; newest first, `PhotoListItemResponseDto`). It leaves the inbox when
  the first draft value from it is saved: `draft-values` sets the meter's apartment (see `api-readings.md`), or by hand.
- **Assign an apartment** (`PATCH /photos/:id { apartmentId }`, `assignApartment`): only while the photo backs **no
  reading value at all** (cancelled ones included — they still point at the photo) → else 409; in practice an inbox
  photo or an unused one. Unknown/archived apartment → 400 (body reference), photo missing → 404. One conditional
  `updateMany`; sets `parseStatus = PENDING`, clears `parseNote` and enqueues a **re-parse** (normal mode: the
  apartment's meters). The same apartment again = a re-parse.
- **Dedup by sha256** (unique): same file in the same place (same apartment, or both inbox) → existing record with
  `duplicate: true`, nothing stored; an inbox upload of a file that already has an apartment → also `duplicate: true`;
  an apartment upload of a file in another apartment or in the inbox → 409 (`findDuplicate`; sort it with PATCH instead).
- **Batch** (`Photo.batchId`, uuid, indexed; null = uploaded before batches): every upload request generates one
  `batchId` for the photos it **newly stores**; duplicates keep their own. No batch table — one request = one batch,
  complete from the start. `POST /photos` also takes an optional multipart field `replyTo` (≤ 128 chars,
  `UploadPhotosBodyDto`), stored on the batch's new photos: an **opaque** client string (the bot: `chatId:messageId`),
  never parsed, not returned in responses (it's for the bot-notification events). `batchId` is in every photo response.
- **All-or-nothing**: the validation pass (`validateAll`) checks every file before the first one is stored — first
  the cheap checks for all files (type, a file belonging to another place → 409), then the decode (the thumbnail is
  made there) only for the files the request stores: duplicates and repeats are never decoded (`thumbnail: null`).
  The `findDuplicate` result is kept (`PreparedPhoto.existing`), not re-queried. A file repeated inside one request
  is stored once (the repeats are `duplicate: true`). Then `storeAll`: every object, then **all rows in one transaction** (`createMany`
  `skipDuplicates` + re-select by sha256): a file a parallel upload stored meanwhile → that record, `duplicate: true`
  (our objects deleted), or 409 if it is in another place, which rolls the whole request back. Any failure → no row,
  objects deleted. Parse jobs are enqueued only after the commit.
- Consistency: upload = objects first, then the rows (insert fails → delete the objects); delete = row first (tx), then
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
  `null` = photos from before parsing existed. The web polls while PENDING; the bot gets an event (below).
- **Batch-parsed event** (`BotNotificationsService`, `src/queue/`): after `parse-result`, if the photo has a `replyTo`
  and no photo of its `batchId` is still `PENDING` → job `batch-parsed` (`{ batchId, replyTo }`) on queue
  `bot-notifications` (names/payload from `@rental/shared`). A signal only: the bot loads fresh data from the API.
  `jobId = batch-parsed-<batchId>` (BullMQ forbids `:` in an id): two last photos finishing at once → one job.
  `removeOnComplete: true` frees the id, so a **re-parse** (PATCH sets PENDING again) notifies the batch again when
  done — no extra code. 5 attempts, exponential backoff from 10 s; failed jobs kept 7 days (the id is blocked meanwhile).
  No `replyTo` (web uploads) → no event. Same enqueue rules as below (3 s timeout, never fails the request; a lost
  event is only logged).
- File endpoints stream through the API (auth required), `Cache-Control: private, max-age=86400`.
- **Parse job**: a newly stored photo gets one BullMQ job `parse-photo` (`{ photoId }`) on queue `photos`
  (`PhotoJobsService.enqueueParse`, `src/queue/`; names and payload type from `@rental/shared`).
  `jobId = photoId` (an upload is never queued twice); a re-parse (`enqueueParse(id, { reparse: true })`) gets
  `<photoId>-<timestamp>` — the upload job stays 7 days and BullMQ silently ignores an existing id. 5 attempts, exponential backoff from 10 s; completed jobs kept 7 days,
  failed ones kept. Duplicates (`duplicate: true`, also a lost parallel race) get no job.
- Enqueue failure is logged and **never fails the upload**. BullMQ waits for the Redis connection without a limit,
  so `enqueueParse` gives up after 3 s (`ENQUEUE_TIMEOUT_MS`); the pending `add()` still lands if Redis comes back
  (same `jobId`). Redis client = `ioredis` (bullmq 6 has it only as an optional peer). Config: `REDIS_HOST`,
  `REDIS_PORT`, `REDIS_PASSWORD?`.
