---
paths:
  - 'apps/web/components/statements/**'
---

# Statements (Web)

## Statements (`components/statements/`)

- Tab "Рахунки" (`?stPage`, `?stSize`: `page`/`size` belong to the readings history on the same page), new statement
  `/apartments/[id]/statements/new?period=`, statement page `/statements/[id]`. Labels and warning messages:
  `lib/statements.ts`. Preview and saved statement use one line DTO, so one component (`StatementLines`) shows both.
- The preview and "already issued?" (`useIssuedStatement`, the list with `?period=`) have `staleTime: 0`: entering a
  reading or changing a tariff elsewhere shows up on return (window focus or in-app navigation) without cross-feature
  invalidation. The preview has no `keepPreviousData`: another month's total must never be issuable.
- Issuing sends `expectedTotal`; the API is the judge. 409 with `preview` in the body = total changed, 409 without =
  already issued (`isStatementTotalChanged`). Mutations invalidate in `onSettled`, so failures refresh the screen too.
- Saved statements are snapshots: never recompute them on the client. Correcting = cancel + "Виставити заново".
- The readings form takes `?period=` (from a `MISSING_READING` warning).
