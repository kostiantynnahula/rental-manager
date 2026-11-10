---
paths:
  - 'apps/api/src/{readings,meters}/**'
---

# Readings (API)

**Readings** (`src/readings/`): REGULAR only (INITIAL/FINAL belong to the meter lifecycle). DRAFT → edit/delete →
confirm (or create with `confirm: true`); CONFIRMED → only cancel (`reason` appended to `note`) and re-enter.

- Confirm rules are **pure** in `helpers/confirm-rules.ts` (`checkConfirmRules`, `today` passed in, no DB) — add rules
  and tests there; the service only loads data in a transaction and maps violations (`conflict` → 409, else 400).
- **Photo and source are per value**: input `values: [{ zone, value, photoId? }]` (`ReadingDraftValueInputDto`; meter
  endpoints keep the photo-less `ReadingValueInputDto`), each photo must belong to the meter's apartment; `source` =
  PHOTO if the value has a photo, else MANUAL (DB CHECK `reading_values_source_matches_photo`). Responses carry
  `photoId`/`source` per value (`ReadingValueDetailResponseDto`; `consumption` stays `ReadingValueResponseDto`).
- **Partial drafts**: a DRAFT may hold a subset of the meter's zones (`zonesInvalid`: no unknown or duplicate zones), so
  it can be filled zone by zone from separate photos; PATCH `values` replaces all of them (send kept ones with their
  `photoId`). The full zone match (`zonesMismatch`, "NIGHT missing") is a confirm rule — confirm and create with
  `confirm: true`. Other draft checks: meter not removed; dates, value order and duplicates only on confirm.
- **API keys** (worker, scope `readings:create-draft`) may only `POST /meters/:meterId/readings`: `confirm: true` →
  403, a value without `photoId` → 400, result always DRAFT + PHOTO. Idempotent per photo + meter: any non-cancelled
  reading of the meter with a value from one of the photos → 409 with `readingId` in the body (so the worker tells a
  retry from other 409s). Humans skip this check. Confirm/PATCH/cancel/delete have no `@Scopes` → closed to keys.
- Confirm rules order a meter's readings by `(readingDate, kind)` with INITIAL < REGULAR < FINAL on the same day
  (`helpers/reading-order.ts`).
- `consumption` in per-reading responses comes from the `reading_consumption` view
  (`ReadingsService.withConsumption`, SQL in `helpers/reading-consumption-sql.ts`): CONFIRMED readings read their
  own rows; DRAFT/CANCELLED ones (not in the view) = value − the previous confirmed view row of the meter + zone.
- Apartment view (`GET /apartments/:id/readings?period=`): meters active in the period; CONFIRMED = confirmed REGULAR
  or FINAL of that period, DRAFT = newest draft, MISSING = nothing yet.
- History (`GET /apartments/:id/readings/history?from&to&meterIds&page&pageSize`): CONFIRMED readings (all kinds),
  paginated by reading (values grouped), order period DESC, utility (enum order), label NULLS FIRST, readingDate
  DESC, id; each value has `photoId`/`source` (joined from `reading_values` on `readingId` + `zone`). Parameterized SQL fragments in `helpers/reading-history-sql.ts` (`Prisma.sql` / `Prisma.empty`).
