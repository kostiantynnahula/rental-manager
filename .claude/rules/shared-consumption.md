---
paths:
  - 'packages/shared/**'
---

# Consumption warnings (`packages/shared/src/consumption.ts`)

- One rule for the worker (draft notes, `hasLease: false`), statements (`UNUSUAL_CONSUMPTION`, see
  `api-statements.md`) and the readings form / history (#43). Tune the limits
  only in `CONSUMPTION_LIMITS` — never copy them into an app.
- Static monthly limits per utility + zone (not history averages: new tenants, meter replacements and vacations
  break them): ELECTRICITY DAY 130, NIGHT 70, TOTAL (single-zone) 200 kWh; COLD_WATER 20, HOT_WATER 20, GAS 20 m³.
- `consumptionWarnings({ utility, zone, consumption, months, hasLease })` → codes, the caller words them:
  - `ABOVE_LIMIT`: consumption > limit × months (months since the previous reading, < 1 counts as 1); a zone the
    utility doesn't have → no limit.
  - `ZERO_CONSUMPTION`: electricity only, consumption = 0 and a lease covers the period (an empty apartment has the
    fridge off — zero is expected there).
- Warnings never block anything — a human decides.
- Consumption is a decimal string; the math is BigInt thousandths (`decimal.ts`: `toThousandths` /
  `fromThousandths`), never JS numbers. Tests: `pnpm --filter @rental/shared test`.
