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
- The preview is a `POST .../statements/preview { period, manualAmounts }` (writes nothing; a POST because of the
  map) — still a `useQuery`, keyed `previewWith(apartmentId, period, amounts)` (`preview(apartmentId, period)` stays the
  invalidation prefix). `placeholderData` keeps the previous result only within the same apartment + month.
- MANUAL amounts (`manual-amounts-fields.tsx`): which tariffs to ask about comes from the preview itself
  (`manualTariffsOf`: MANUAL lines + `MISSING_MANUAL_AMOUNT` warnings). Inputs (UAH text, `parseManualAmount` →
  kopiyky) live in a section keyed by month and reach the API debounced (400 ms), filtered to the preview's tariffs
  (`toManualAmounts`). "Виставити" is locked while recalculating (typed ≠ debounced, placeholder or fetching) and while
  a field holds an invalid amount; issue sends the same `manualAmounts` as the shown preview. A missing amount = the
  usual warning + acknowledge. A saved MANUAL line shows «введено вручну».
- Issuing sends `expectedTotal`; the API is the judge. 409 with `preview` in the body = total changed, 409 without =
  already issued (`isStatementTotalChanged`). Mutations invalidate in `onSettled`, so failures refresh the screen too.
- Saved statements are snapshots: never recompute them on the client. Correcting = cancel + "Виставити заново".
- The readings form takes `?period=` (from a `MISSING_READING` warning).
- `UNUSUAL_CONSUMPTION` text (`statementWarningMessage`): "спожито X од. за N міс. — більше за звичні L/міс." or
  "нульове споживання, хоча є договір"; no link (nothing to enter — check the reading).
