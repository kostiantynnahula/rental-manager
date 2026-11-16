---
paths:
  - 'apps/api/src/{readings,meters}/**'
---

# Readings (API)

**Readings** (`src/readings/`): REGULAR only (INITIAL/FINAL belong to the meter lifecycle). DRAFT → edit/delete →
confirm (or create with `confirm: true`); CONFIRMED → only cancel (`reason` appended to `note`) and re-enter. An API key (the Telegram bot, scopes
`readings:confirm` / `readings:cancel`) confirms a DRAFT like a human, but cancels **only a DRAFT** (`draftOnly` → 409;
see `api-auth.md`).

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
- **API keys** (worker, scope `readings:create-draft`) may only `POST /meters/:meterId/draft-values`
  (`MeterDraftValuesController` → `DraftValuesService`; a cookie request → 403): body
  `{ period, readingDate, zone, value, photoId, note? }`, one zone from one photo. The API picks the draft: the key
  user's open DRAFT REGULAR of the meter + period (never a human's) gets the zone (keeps its `readingDate`, `note`
  appended) → 200; none → new DRAFT → 201. Decision in the pure `helpers/draft-value-action.ts`: same zone from the
  same photo → 200 no change (job retry); same zone from another photo → 409 with `readingId`, nothing overwritten.
  Zone not in the scheme / photo not found or of another apartment → 400 (same check as human readings,
  `PhotosService.assertOfApartment`); meter removed or apartment archived → 409. An **inbox photo**
  (`apartmentId` null) gets the meter's apartment in the same transaction (`PhotosService.claimForApartment`,
  conditional update — rolled back if the draft fails). Human readings still require the photo's apartment
  (`findForApartmentOrThrow`: inbox → 400). **No locking**: relies on the worker's concurrency 1 —
  revisit (e.g. a partial unique index) if that changes. `POST /meters/:meterId/readings`, PATCH, confirm, cancel and
  delete have no `@Scopes` → closed to keys.
- Confirm rules order a meter's readings by `(readingDate, kind)` with INITIAL < REGULAR < FINAL on the same day
  (`helpers/reading-order.ts`).
- `consumption` in per-reading responses comes from the `reading_consumption` view
  (`ReadingsService.withConsumption`, SQL in `helpers/reading-consumption-sql.ts`): CONFIRMED readings read their
  own rows; DRAFT/CANCELLED ones (not in the view) = value − the previous confirmed view row of the meter + zone.
  The rows (with `previousValue` / `previousPeriod`) are public as `ReadingsService.consumptionRows` — reuse it
  (the photo batch summary does), don't write another query.
- Apartment view (`GET /apartments/:id/readings?period=`): meters active in the period; CONFIRMED = confirmed REGULAR
  or FINAL of that period, DRAFT = newest draft, MISSING = nothing yet.
- History (`GET /apartments/:id/readings/history?from&to&meterIds&page&pageSize`): CONFIRMED readings (all kinds),
  paginated by reading (values grouped), order period DESC, utility (enum order), label NULLS FIRST, readingDate
  DESC, id; each value has `photoId`/`source` (joined from `reading_values` on `readingId` + `zone`) and `warnings`
  (`ConsumptionWarningReason[]`, `helpers/history-value-warnings.ts`): the shared `consumptionWarnings` on the value's
  consumption, `months` from the view's `previousPeriod`, `hasLease` = a lease of the apartment overlaps the reading's
  period (`leaseOverlapsPeriod`, also used by statements). Never blocks anything. Parameterized SQL fragments in `helpers/reading-history-sql.ts` (`Prisma.sql` / `Prisma.empty`).

## Data model and DB rules

- Raw-SQL constraints in migration `add_meters_readings`:
  - `readings_period_first_of_month`: `period` is the 1st of a month.
  - `meters_removed_after_installed`: `removedAt >= installedAt`.
  - `reading_values_non_negative`: `value >= 0`.
  - `readings_confirmed_has_confirmer`: CONFIRMED ⇒ `confirmedAt` and `confirmedById` set.
  - `reading_values_source_matches_photo` (migration `reading_value_photo`): `source = PHOTO` ⇔ `photoId` set.
  - Partial unique indexes over CONFIRMED rows only (drafts/cancelled may repeat):
    `readings_one_confirmed_regular_per_period` (meter + period), `readings_one_confirmed_initial`,
    `readings_one_confirmed_final` (one each per meter).
- **Consumption** = view `reading_consumption` (migration `add_reading_consumption_view`): one row per value of every
  CONFIRMED reading with `previousValue` and `consumption` (`LAG` per meter + zone, ordered by period, readingDate,
  kind INITIAL < REGULAR < FINAL, createdAt; NULL without a previous value). **The single place consumption is
  computed — billing must reuse it**, not re-implement it. Read it with `$queryRaw` (no Prisma model; Prisma ignores
  views when diffing). Filter it from outside by `"meterId"` (pushed into the view, so LAG still sees the full
  history); never filter by period inside it.
- Reading rules the **services** must enforce (the DB doesn't):
  - Zones match the meter: SINGLE → exactly TOTAL; DAY_NIGHT → exactly DAY and NIGHT (confirmed readings; a DRAFT
    may hold a subset — no unknown or duplicate zones).
  - Confirmed values never decrease within one meter and zone (compare with the previous confirmed reading);
    INITIAL is the meter's first reading, FINAL its last — nothing after FINAL.
  - CONFIRMED readings are immutable — correct by cancelling and creating a new one.
  - No readings outside `installedAt..removedAt` (`readingDate` within the range).
- **Reading rules are shared pure functions** in `src/readings/helpers/` — reuse, don't re-implement:
  `zonesMismatch(scheme, values)` (zones vs `zoneScheme`), `zonesInvalid` (drafts: subset allowed), `missingZones`, `decreasedZones(previous, next)` (values never decrease),
  `lastConfirmedReadingInclude` (a meter's latest CONFIRMED reading). They return data; services throw 400/409.

## Meter lifecycle

- **Meter lifecycle** (`src/meters/`): create = meter + CONFIRMED INITIAL reading; wrong initial value = cancel the
  INITIAL + create a new one (only before any non-cancelled REGULAR reading); remove = CONFIRMED FINAL + `removedAt`;
  replace = remove + create in one transaction; DELETE only for a mistaken meter (nothing but INITIAL readings).
  Responses carry `canDelete` / `canEditInitialValues` (`helpers/meter-flags.ts`, added by `MetersService.withFlags`
  in one grouped query) — same rules as DELETE / PUT initial-values, which still enforce them.
  Dates that become a `readingDate` must not be in the future. `createdById`/`confirmedById` = `@CurrentUser()`.
