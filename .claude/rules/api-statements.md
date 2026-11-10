---
paths:
  - 'apps/api/src/statements/**'
---

# Statements (API)

**Statements** (`src/statements/`): `GET /apartments/:apartmentId/statements/preview?period=` calculates on the fly,
writes nothing. Every billing rule is in the pure `helpers/statement-calculator.ts`
(`calculateStatement`, tested): it gets all of the apartment's attachments, meters and leases and decides what's active
in the period; the service only loads data. Imports nothing from Prisma but `Prisma.Decimal` and enums.

- Full month, no proration. Rent: one lease overlapping the period → RENT; several → no line + `MULTIPLE_LEASES`.
- Metered: one line per zone (DAY, NIGHT, TOTAL) over the tariff's active meters, from the `reading_consumption` rows
  of the period; price via `priceForPeriod`. No price → `NO_PRICE`, no meters → `NO_METERS`.
- `MISSING_READING` (once per meter) only without a single view row in the period. A meter installed in the period
  has its INITIAL row (consumption NULL): no warning, contributes 0. Unbilled consumption isn't lost: the next
  REGULAR reading counts from the last confirmed one, at the next period's price.
- `amount` = quantity × unitPrice (UAH) × 100, half-up, `Int` kopiyky; `total` = sum of amounts. A meter without an
  attached tariff isn't billed and isn't warned about.
- **Issued statements are snapshots** (migration `add_statements`): lines keep the name, utilities, prices and
  per-meter `details`; later tariff or reading changes don't touch them. Nothing flags a reading changed after issue:
  the fix is cancel + issue again. Line `details` and statement `warnings` are JSON.
- Per-meter `photoIds` (photos of the values behind the consumption, via `reading_consumption` (`readingId`, `zone`) →
  `reading_values."photoId"`) are part of the snapshot. Older `details` have no field → the DTO maps it to `[]`.
- `POST /apartments/:apartmentId/statements { period, expectedTotal, acknowledgeWarnings? }`, one transaction: recompute
  with the calculator; total differs → 409 with the fresh `preview`; unacknowledged warnings → 422 with `warnings`; insert.
  An already issued period isn't checked in code: the partial unique index answers 409, races included.
- `GET /apartments/:apartmentId/statements?period&page&pageSize` (period desc, issuedAt desc, cancelled included, no
  lines; `period` = only that month, how the web finds the issued statement of a month);
  `GET /statements/:id` (lines use the preview's `StatementLineResponseDto`, `details` → `meters`; `lease` = id + the
  primary tenant's current name); `POST /statements/:id/cancel { note? }` (only ISSUED, else 409).
- Raw-SQL constraints: `statements_period_first_of_month`, `statements_one_issued_per_period` (partial unique),
  `statements_cancel_consistency` (both directions), `statements_total_non_negative`, `statement_lines_tariff_by_type`,
  `statement_lines_non_negative`.
- A lease or tariff used by a statement can't be deleted (FK Restrict → 409).
