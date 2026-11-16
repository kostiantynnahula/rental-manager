---
paths:
  - 'apps/worker/src/photos/**'
---

# Job flow (worker, `src/photos/`)

- `ParsePhotoProcessor` (`@Processor(PHOTO_QUEUE)`, concurrency 1) dispatches on `job.name`; unknown → fails, no retry.
  Keep concurrency 1: the API merges values into drafts without locking (`POST /meters/{meterId}/draft-values`).
- `ParsePhotoService.run(photoId)`: `GET /photos/{id}` → candidates: `GET /apartments/{apartmentId}/meters` (installed
  only, with `lastReading`), or for an **inbox photo** (`apartmentId: null`) `GET /meters?active=true` (every active
  meter of active apartments); none → `NOT_MATCHED`, done → `GET /photos/{id}/file` → `PhotoExtractorService.extract` → `matchReadings` →
  one `POST /meters/{meterId}/draft-values` per matched zone (the API picks the draft: 201 new / 200 added or retry
  no-op). `readingDate` = upload day in Kyiv (`createdAt`), `period` = its month. Ends with one summary log line.
- Result (`ParseResultReporter` → `PUT /photos/{id}/parse-result`, shown in the web): `PARSED` if ≥ 1 value was
  posted, else `NOT_MATCHED` with the reasons (the summary lines / photo issues; an inbox photo's note starts with a
  Ukrainian line from `inbox-summary.ts`: serial not found / meters of different apartments); `FAILED` with the error from the
  processor's `failed` handler after the last attempt. Best effort: a failed report is only logged (never retries the
  job — that would repeat the paid model call).
- Matching (`helpers/match-readings.ts`, pure) — worst case "not recognized", never "wrong meter": a recognized serial
  (≥ 4 digits) decides alone (equal, or prefix/suffix with ≥ 6 digits: cut off / leading year; no match → skip, no
  fallback); no serial → utility + zone must fit exactly one meter. Also skipped: zone not on the meter, value not a
  meter number, the same meter + zone twice in one photo. The model's `meterId` decides nothing (a disagreement is
  logged). Skips are only logged.
- **Inbox photos** (`serialOnly`): matched **by serial only** — no utility fallback (a guess could pick another
  apartment's meter); all matched meters must be of one apartment (`one-apartment.ts`), else none is posted. The API
  assigns the photo to the meter's apartment on the first accepted `draft-values` (rolled back if refused); a photo
  with nothing posted stays in the inbox.
- Plausibility (`plausibility-warnings.ts`, BigInt thousandths from `@rental/shared`, never floats) vs `lastReading`:
  a lower value → warning (local check); otherwise the consumption goes through the shared `consumptionWarnings`
  (limits per utility + zone, × months; `hasLease: false` — the worker can't see leases, so no zero check here). Warnings + the model's confidence/issues (when not high) go into the
  draft's `note` (`draft-note.ts`, Ukrainian — shown on the review screen); they never block the draft.
- Expected refusals of `draft-values` are logged, not failures: 409 with `readingId` (zone already filled from another
  photo), 409 "Meter is removed", 400. No `ANTHROPIC_API_KEY` → `UnrecoverableError` (`ExtractionNotConfiguredError`).
  A retry repeats the paid model call; the posts themselves are idempotent per photo + zone.
- Errors (`src/api/helpers/api-error.ts`): 404/400 and 401/403 → `UnrecoverableError` (retrying can't help; 401/403
  hint at the key/scopes); other statuses and network errors → plain `Error`, retried by BullMQ. Failures are
  logged by the processor's `failed` handler.
