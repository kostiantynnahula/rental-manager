---
paths:
  - 'apps/api/src/condition-photos/**'
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
  - Embeddings (`DESCRIBED` → `INDEXED`): #130. The worker's side: `worker-condition-photos.md`.
