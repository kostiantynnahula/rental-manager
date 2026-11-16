# API conventions

Imported by `apps/api/CLAUDE.md` (always loaded).

- Everything is behind the global auth guard; only auth routes are `@Public()`. Controllers get `@ApiCookieAuth()`.
  A route a service (API key) may call needs `@Scopes(...)` + `@ApiBearerAuth()`; keys are denied everywhere else.
- **Dates**: `"YYYY-MM-DD"` strings in and out. Validate with `@IsDateOnly()` (`src/common/validators/`),
  convert with `parseDateOnly` / `formatDateOnly` (`src/common/helpers/date-only.ts`). "Today" = `todayDateOnly()`, Kyiv time.
- **Money**: `Int` kopiyky (`@IsInt`, `@Max(PG_INT_MAX)`); never floats, never formatted in the API.
- **Responses**: explicit response DTOs with `static from(...)`, never raw Prisma objects. Prisma `include`s used by a
  DTO live next to it in `helpers/` (e.g. `leaseWithTenantsInclude` + `LeaseWithTenants`).
- **Ids**: `@Param('id', ParseUUIDPipe)` → a bad id is a 400, not a DB error.
- **Errors**: services throw Nest HTTP exceptions with clear messages for business rules (`Apartment not found`,
  `Apartment is archived`). Rules the DB already enforces (unique, overlap, date checks, FK) are **not** re-checked in
  services: `PrismaExceptionFilter` maps them — unique → 409, `leases_no_overlap` → 409 "Lease dates overlap with another
  lease", check → 400, FK/restrict → 409, not found → 404, else a generic 500. New raw-SQL constraint → add its message to
  `CONSTRAINT_MESSAGES` in `src/prisma/helpers/to-http-exception.ts`. Never return Prisma messages/`detail` (row data).
- Swagger: every endpoint documents its success response type and the error statuses it can return.
- **Reading values**: decimal strings in and out (`"1520.350"`), never JS numbers. Input: `@IsReadingValues()` /
  `@IsMeterValue()` (`src/readings/validators/`); output: `ReadingValueResponseDto` (`toFixed(3)`). Compute with
  `Prisma.Decimal`.
- **Period**: `"YYYY-MM"` in the API, 1st of the month in the DB (`periodOfDate` / `formatPeriod`, `src/common/helpers/period.ts`).
