---
paths:
  - 'apps/api/src/{readings,meters}/**'
---

# Readings (API)

**Readings** (`src/readings/`): REGULAR only (INITIAL/FINAL belong to the meter lifecycle). DRAFT → edit/delete →
confirm (or create with `confirm: true`); CONFIRMED → only cancel (`reason` appended to `note`) and re-enter.

- Confirm rules are **pure** in `helpers/confirm-rules.ts` (`checkConfirmRules`, `today` passed in, no DB) — add rules
  and tests there; the service only loads data in a transaction and maps violations (`conflict` → 409, else 400).
- Drafts are checked lightly (zones, meter not removed); dates, value order and duplicates only on confirm.
- Confirm rules order a meter's readings by `(readingDate, kind)` with INITIAL < REGULAR < FINAL on the same day
  (`helpers/reading-order.ts`).
- `consumption` in per-reading responses comes from the `reading_consumption` view
  (`ReadingsService.withConsumption`, SQL in `helpers/reading-consumption-sql.ts`): CONFIRMED readings read their
  own rows; DRAFT/CANCELLED ones (not in the view) = value − the previous confirmed view row of the meter + zone.
- Apartment view (`GET /apartments/:id/readings?period=`): meters active in the period; CONFIRMED = confirmed REGULAR
  or FINAL of that period, DRAFT = newest draft, MISSING = nothing yet.
- History (`GET /apartments/:id/readings/history?from&to&meterIds&page&pageSize`): CONFIRMED readings (all kinds),
  paginated by reading (values grouped), order period DESC, utility (enum order), label NULLS FIRST, readingDate
  DESC, id. Parameterized SQL fragments in `helpers/reading-history-sql.ts` (`Prisma.sql` / `Prisma.empty`).
