---
paths:
  - 'apps/api/src/{photos,storage}/**'
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
- **Dedup by sha256** (unique): same file for the same apartment → existing record with `duplicate: true`, nothing
  stored; for another apartment → 409.
- Consistency: upload = objects first, then the row (insert fails → delete the objects); delete = row first (tx), then
  objects (a failure only leaves a logged orphan object, never a row pointing at nothing).
- Limits (`PHOTO_MAX_FILES`, `PHOTO_MAX_FILE_SIZE_MB`) go through `MulterModule.registerAsync` (in-memory). Too many
  files → 400, too large → 413. `multer` isn't a direct dependency: don't import it at runtime (types come from `@types/multer`).
- A photo backs 0..n readings (`Reading.photoId`, FK `Restrict`; `source = PHOTO`), always of the same apartment.
  "Unassigned" = no non-cancelled reading. DELETE only when unassigned; cancelled readings are unlinked first.
- File endpoints stream through the API (auth required), `Cache-Control: private, max-age=86400`.
