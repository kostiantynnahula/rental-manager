# Domain (API-wide)

Imported by `apps/api/CLAUDE.md` (always loaded). Rules of one area live in `.claude/rules/api-<area>.md`.

- **Apartment** is archived via `isActive = false`, never deleted. Leases reference it with `onDelete: Restrict`,
  so a delete with history fails at the DB level. Same for **Tenant** (via `LeaseTenant`).
- **Money** is `Int` kopiyky (UAH), e.g. `monthlyRent: 1500000` = 15 000.00 UAH. Never floats.
- **Meters & readings**: no cascade from Apartment/Meter/User (Restrict) — meters are removed via `removedAt`, readings
  are cancelled; only `ReadingValue` cascades with its `Reading`. `ReadingValue.value` is `Decimal(12,3)` → Prisma
  returns `Prisma.Decimal` (decimal.js): calculate with it, never convert to `number`.
- Raw-SQL constraints (not visible in `schema.prisma`) are listed in the rule of their area: leases
  (`api-leases.md`), meters/readings (`api-readings.md`), tariffs (`api-tariffs.md`), statements (`api-statements.md`).
