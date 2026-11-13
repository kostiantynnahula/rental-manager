---
paths:
  - 'apps/api/src/photo-batches/**'
---

# Photo batches (API)

A **batch** = the photos newly stored by one upload request (`Photo.batchId`; no table — see `api-photos.md`).
Module `src/photo-batches/` (imports `ReadingsModule`); confirming by batch comes next (#77).

## Summary (`GET /photo-batches/:batchId`)

- For the Telegram bot: everything it shows after parsing, in one response — the bot only renders, never computes.
  Scopes `photos:read` + `readings:read` (both required). No photo with this `batchId` → 404; not a uuid → 400.
- Load in `PhotoBatchesService.summary`, assemble in the **pure** `helpers/batch-summary.ts` (`buildBatchSummary`).
- `photos`: `id`, `parseStatus`, `parseNote`, in upload order.
- `apartments`: the readings with a value from a batch photo, **once each** (a two-zone reading may come from two
  photos), **all statuses** (the bot shows ✅/❌ after a tap); grouped by the **meter's** apartment (`id`, `name`,
  `isActive`), by name (uk); inside by utility (enum order), label (none first), period, readingDate.
- Per reading: meter (`utility`, `label`, `serialNumber`, `zoneScheme`), `period`, `readingDate`, `status`, `note`,
  `missingZones` (`missingZones` from `readings/helpers/zones.ts`), `canConfirm`, `values` in the meter's zone order.
- Per value: `value`, `photoId`, `previousValue` + `consumption` (decimal strings; `null` without a previous
  CONFIRMED value) from `ReadingsService.consumptionRows` — the `reading_consumption` view, the same numbers as
  `GET /readings/:id` and the history. `lowerThanPrevious` = consumption < 0.
- `warnings`: `historyValueWarnings` (the history's rule: `hasLease` = a lease overlaps the period) as
  `{ code, limit, months }` — `limit` = `consumptionLimit(utility, zone)` for `ABOVE_LIMIT` (null for
  `ZERO_CONSUMPTION`), `months` = `monthsSincePrevious`; the client words them like the web. None when lower than
  previous (that's a confirm error, not a warning). Never block.
- `canConfirm` = DRAFT ∧ no missing zone ∧ no zone lower than previous. The other confirm rules (reading window,
  a confirmed reading of the same period, …) are still checked by `POST /readings/:id/confirm` — it may still say no.
