---
paths:
  - 'apps/api/src/tariffs/**'
---

# Tariffs (API)

**Tariffs** (`src/tariffs/`): catalog CRUD + archive/unarchive; DELETE only while not attached to an apartment.
`GET /tariffs?search&kind&utility&active&page&pageSize` → `{ items, total, page, pageSize }` (name order);
responses carry `currentPrices` (this month, one per zone with its own price) and `inUse` (attached ⇒ kind/utilities
frozen, no DELETE); `GET /tariffs/:id` adds the full history. Prices are decimal strings in (`@IsPrice()`, ≤ 4
decimals) and out (`toFixed(4)`), `effectiveFrom` is `"YYYY-MM"`.

- **A price change is a new row** (`POST /tariffs/:id/prices`); `PATCH`/`DELETE .../prices/:priceId` only fix
  mistakes (TODO: forbid once a statement uses the price). Archived tariff → no new/edited prices (409).
- Rules are pure in `helpers/tariff-rules.ts`: `utilitiesProblem` (ELECTRICITY or GAS alone, water utilities
  combine), `disallowedZoneProblem` (DAY/NIGHT only for `[ELECTRICITY]`), `totalCoverageProblem` (a TOTAL price from
  the earliest month), `duplicatePriceProblem`. Price lookup: `priceForPeriod` / `currentPrices`
  (`helpers/price-for-period.ts`) — billing must reuse them.
- Responses also carry `apartmentCount` (apartments attached **now**; > 1 = shared) and the detail `apartments`
  (all attachments). Include `tariffWithPricesInclude` loads prices **and** attachments, both picked in JS for a month.
  `POST /tariffs` takes optional `apartmentIds` (active apartments, attached from the earliest price month).
- **MANUAL** (migrations `manual_tariff_kind` + `manual_tariff_checks`): no utilities, no prices — the amount is
  entered per statement (e.g. a share of the building water bill). Prices on create (`manualPricesProblem`),
  `POST .../prices` and `override` → 400; a kind change to/from MANUAL → 400 (create a new tariff). `apartmentIds` on
  create attach it from the current month (no price month to start from). Attached like any other tariff.
- **Attachments** (`ApartmentTariffsController`, `/apartments/:apartmentId/tariffs`): `GET ?scope=current|all`
  ("current" = not ended before this month, planned included — `isAttachmentCurrent` / `currentAttachmentWhere`, one
  rule), `POST { tariffId, activeFrom }` (active apartment + tariff), `PATCH { activeTo }` (end = last billed month,
  `null` reopens), `DELETE` (mistake; TODO: forbid once billed). Ids are scoped by apartment (other's → 404).
- **Override** (`POST .../:id/override { name, effectiveFrom, prices }`) = "this price only for this apartment": one
  transaction — a copy of the tariff with its own prices from M, the old attachment ends at M−1 (deleted if it
  starts in M), the copy is attached from M with the old `activeTo`. Past months stay on the shared tariff.

## Data model

- **Tariffs** (migration `add_tariffs`): one catalog for meter tariffs and fixed fees. `Tariff.kind` METERED
  (price per unit of the consumption of `utilities`, e.g. drainage = COLD_WATER + HOT_WATER) or FIXED (price per
  month, `utilities` empty) or MANUAL (no utilities, no prices: the amount is entered per statement). District-specific prices = a separate tariff. `TariffPrice` = price history:
  `effectiveFrom` (1st of month) + `zone` (default TOTAL) + `price` `Decimal(12,4)` UAH. Price for a period = the
  latest `effectiveFrom <= period` for the zone, falling back to TOTAL (a two-zone meter only needs a NIGHT price).
  `ApartmentTariff` = which tariffs an apartment is billed for, `activeFrom..activeTo` (1st days of months,
  `activeTo` = last billed month inclusive, null = ongoing). FIXED fees bill the full month (no proration).
  - Raw-SQL constraints: `tariffs_utilities_match_kind` (METERED ⇒ ≥ 1 utility, FIXED/MANUAL ⇒ none; the list column is
    nullable, NULL = empty), `tariff_prices_effective_first_of_month`, `tariff_prices_non_negative`,
    `apartment_tariffs_active_{from,to}_first_of_month`, `apartment_tariffs_dates_check`,
    `apartment_tariffs_no_overlap` (GiST exclusion: one tariff per apartment per month).
  - Services must enforce: DAY/NIGHT prices only for METERED tariffs with ELECTRICITY; `kind`/`utilities` of a
    tariff in use never change (archive it and create a new one).
