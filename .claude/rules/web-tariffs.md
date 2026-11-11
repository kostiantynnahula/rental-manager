---
paths:
  - 'apps/web/components/tariffs/**'
---

# Tariffs (Web)

## Tariffs (`components/tariffs/`)

- Section "Тарифи" (`/tariffs`, `/tariffs/new`, `/tariffs/[id]`, `/tariffs/[id]/edit`). The list is server-side:
  search, `active`, `kind`, `size`, `page` in the URL via `hooks/use-tariff-filters.ts` (same pattern as the readings
  history; the search input is debounced into `?search=` like tenants).
- Prices are decimal strings end to end (`lib/tariff-prices.ts`: `normalizePrice` → API "4.32", `formatPrice` →
  "4,32"; ≤ 4 decimals); never `Number(...)`. Input: `PriceInput` (unit addon, formats on blur); unit via `priceUnit()`.
- Utilities of a METERED tariff are one choice from `constants/utility-sets.ts` (electricity / gas alone, water
  utilities combine, e.g. drainage) — the API's "one unit per tariff" rule holds by construction.
- A price change is a **new row** ("Нова ціна", from a month on); "Виправити"/"Видалити" on a row are only for
  mistakes. DAY/NIGHT zones only for electricity (`isZoned`); a zone without its own price uses TOTAL.
- `inUse` (attached to an apartment) locks kind/utilities in the form and disables delete (archive instead);
  archived tariffs can't get new or fixed prices.
- Apartments: tab "Тарифи" (`apartment-tariffs-tab.tsx`, `lib/api/queries/apartment-tariffs.ts`) — attach from a month,
  end (last billed month) / reopen, delete a mistake; "Показати завершені" = `scope=all`. The create form takes
  `apartmentIds` (multi-select; `?apartmentId=` preselects and returns to that tab); the tariff page lists
  `apartments`.
- "Змінити ціну" on the tab: `apartmentCount > 1` (shared) first asks "Для всіх квартир (N)" (a new price of the
  shared tariff) or "Лише для цієї квартири" (`override`: a copy with own prices from a month; past months stay on
  the shared tariff). Attachment and tariff mutations invalidate both `apartmentTariffKeys.all` and tariff keys.
- **MANUAL** ("Ручна сума"): no utilities, no prices — the amount is typed into each statement. Create hides the price
  block (apartments are attached from the current month); editing can't switch a kind to or from MANUAL (the API says
  400, the radio option is disabled). Cards / list show «сума в рахунку», the tariff page explains it instead of a
  price history; the apartment tab has no «Змінити ціну» for it.
- Server-side lists put the page-size select into the pagination row (`DataTable` `pageSize`/`pageSizeOptions`/
  `onPageSizeChange`), not into the filters.
