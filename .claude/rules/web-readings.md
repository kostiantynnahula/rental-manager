---
paths:
  - 'apps/web/components/{readings,meters}/**'
---

# Readings/Meters (Web)

## Meters (`components/meters/`)

- Labels/units only from `lib/utilities.ts` (`UTILITY_LABELS`, `UTILITY_UNITS`, `ZONE_LABELS`, `zonesFor`,
  `zoneSchemesFor` — day/night exists only for electricity).
- Meter values are decimal strings end to end (`lib/meter-values.ts`: `normalizeMeterValue` → API "1520.350",
  `compareMeterValues`, `formatMeterValue` → "1520,350"); never `Number(...)`.
- Consumption warnings (shared rule, never block): `ReadingValuesInput` `check={{ previousPeriod, period, hasLease }}`
  → amber line under the zone ("Спожито 340 кВт·год — більше за звичні 130/міс."); passed by batch entry and photo
  review only (`hooks/use-has-lease.ts` → `useApartmentLeases` + `leaseCoversPeriod`). Texts: `lib/consumption.ts`.
  History: value `warnings` from the API → ⚠ next to the consumption (`history-consumption.tsx`; the mobile card also
  shows the text).
- Reusable pair for any reading entry: `ReadingValuesInput` (one input per zone, unit, "Попереднє: …") +
  `readingValuesSchema(previous?)` (required, ≤3 decimals, not lower than previous) and `toReadingValuesInput()`.
- `canDelete` / `canEditInitialValues` come from the API; disabled menu items stay visible with a reason.
- Sheets opened from a DropdownMenu item: the menu is `modal={false}` (otherwise focus handling leaves the body
  unclickable). Small forms in a side sheet: `components/form-sheet.tsx`.

## Readings (`components/readings/`)

- Months are "YYYY-MM" strings: `lib/period.ts` (`defaultReadingPeriod` — previous month until day
  `READINGS_DEADLINE_DAY` = 10, `addMonths`, `readingDateWindow` = the API's 1st of period … end of next month).
- Batch entry (`/apartments/[id]/readings/new`): one `POST /meters/:id/readings` per filled meter, in parallel
  (`Promise.allSettled`), `confirm: true`. Saved meters get locked, failed ones keep a per-meter message
  (`readingErrorMessage` translates the API's rule messages). Empty meter = skipped.
- Drafts in the batch form: a meter with a DRAFT for the month is prefilled with it (`draftFields`) and badged
  "Чернетка · бракує: Ніч". Untouched → skipped (a complete one has "Підтвердити чернетку"); edited → PATCH (changed
  values lose their photo, unchanged keep it) + confirm. Every zone is required, so an incomplete draft can't be
  confirmed. Helpers: `missingZones`, `missingZonesLabel`, `mergeDraftValues`, `isUntouchedPrefill`.
- Previous values = the meter's `lastReading` (last confirmed); the API re-checks order against all confirmed readings.
- History (tab "Показання", `reading-history.tsx`): `GET /apartments/:id/readings/history`, server-side pagination.
  Filters + page in the URL via `hooks/use-history-filters.ts` (`from`, `to`, `meters`, `size`, `page`; one
  `router.replace` for several params, any filter change → page 1). Values in lists: `formatMeterValueCompact`.
- Invalidation: `readingKeys.all` after creating readings **and** after every meter mutation (INITIAL/FINAL readings).
- DataTable: `pagination` prop (`manualPagination`, `rowCount`; `data` = the current page) and optional `getRowHref`
  (rows without a link). No `paginatedRowModel` is registered, so client-side lists are never sliced.
