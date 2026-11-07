---
paths:
  - 'apps/web/components/leases/**'
---

# Leases (Web)

## Leases (`components/leases/`)

- Lease status (Активний / Завершений / Майбутній) is computed on the client: `leaseStatus(lease, todayDateOnly())`
  (`lib/leases.ts`, Kyiv "today" — same rule as the API's current lease).
- Every lease mutation invalidates `leaseKeys.all`, `apartmentKeys.all` and `tenantKeys.all` (a lease shows on both).
- Back navigation: links into a lease carry `?from=apartment` or `?from=tenant&tenantId=…`; `leaseBackTarget()` picks
  the target (default: the apartment's Договори tab) and `originQuery()` keeps it on detail ↔ edit links.
- Forms inside a Sheet/Dialog: the content is portalled, but React still bubbles `submit` to the outer `<form>` —
  wrap the inner form in `onSubmit={(e) => e.stopPropagation()}` (see `new-tenant-sheet.tsx`).
- Dates use native `<input type="date">` (no calendar component): better on phones, values are "YYYY-MM-DD".
