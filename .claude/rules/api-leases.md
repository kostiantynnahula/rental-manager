---
paths:
  - 'apps/api/src/{apartments,tenants,leases}/**'
---

# Apartments, tenants, leases (API)

## Data model

- **Lease** dates are `@db.Date` (no time); `endDate` is the _inclusive_ last day, `null` = open-ended.
- Constraints written in raw SQL in migration `add_apartments_tenants_leases` (not visible in `schema.prisma`):
  - `leases_dates_check`: `endDate >= startDate`.
  - `leases_no_overlap`: GiST exclusion — leases of one apartment never overlap (needs the `btree_gist` extension).
  - `lease_tenants_one_primary`: partial unique index — **at most** one PRIMARY tenant per lease.
    "At least one" isn't enforced by the DB: the service creating a lease must add the PRIMARY in the same transaction.

## Endpoints

- **Apartments list and detail** both return `ApartmentDetailResponseDto` with `currentLease` (lease covering today, Kyiv
  time; helper `apartments/helpers/current-lease-where.ts`). The list loads it in one query via `include`.
  For API keys `currentLease.tenants` is `[]`: tenant data is human-only (see `api-auth.md`).
- **Tenants**: phones are Ukrainian only, normalized to `+380XXXXXXXXX` by `@IsUaPhone()` (rule:
  `normalizeUaPhone` in `@rental/shared`, also used by the web); `?search=` matches the name or the phone digits in any
  format (`phoneSearchDigits`). The list returns `TenantListItemResponseDto` (`status` LIVING/FORMER/NONE +
  `currentApartment`, `helpers/tenant-status.ts`); detail leases carry `monthlyRent` and `isCurrent`.
  `POST /tenants` takes an optional `assignment` (discriminated by `mode`, chosen by the client, never inferred):
  NEW_LEASE (open-ended lease, tenant = PRIMARY; overlap → 409 from `leases_no_overlap`) or ADD_CONTACT (lease must
  cover today, apartment active → else 409). One `$transaction` in `TenantsService.create`; unknown ids → 400.
- **No DELETE for apartments** — archive/unarchive. Tenants: DELETE only without lease history (409 otherwise).
  Leases: DELETE allowed until a statement references the lease (FK Restrict → 409).
