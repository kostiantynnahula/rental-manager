# apps/api — NestJS

## Commands (from repo root)

- dev: `pnpm dev:api` → http://localhost:3001/api (global `/api` prefix), Swagger UI at `/docs` (off in production)
- test: `pnpm --filter api test` · e2e: `pnpm --filter api test:e2e`
- lint: `pnpm --filter api lint` · build: `pnpm --filter api build`
- generate code: `pnpm --filter api exec nest g <schematic> <name>`
- OpenAPI: `pnpm --filter api openapi:export` → `openapi.json` (committed; root `pnpm gen:api` also regenerates the
  web types). Builds first and creates the app without `init()`, so no DB is needed (only a valid `.env`). Paths
  are written without `/api`; the prefix is in `servers` (matches the web client's `baseUrl: '/api'`).
  Swagger config lives in `src/openapi/swagger-config.ts`, shared with `main.ts`.

## Conventions

- Nest 12, native ESM (`"type": "module"`): relative imports need the `.js` extension.
- Tests: vitest (globals on). Unit `*.spec.ts` next to the code; e2e in `test/*.e2e-spec.ts`.
- One Nest module per domain area (apartments, tenants, leases, meters, readings, tariffs, statements).
- Shared types come from `@rental/shared` (built to `dist/`; root `dev`/`test`/`lint` build it first).
- Env: read via `ConfigService<Env, true>`, never `process.env`. New vars → `src/config/env.validation.ts` + root `.env.example`.
- Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) and Swagger are set up in `src/main.ts`; e2e tests repeat the pipe options — keep them in sync.
- DTOs: class-validator decorators + explicit `@ApiProperty` (no Swagger CLI plugin).
- One class per file; custom error classes go in `src/<feature>/errors/<name>.error.ts`.
- Interfaces go in `src/<feature>/interfaces/<name>.interface.ts` (one per file), imported with `import type`.
- Pure helper functions go in `src/<feature>/helpers/` (one file per topic), not at the top/bottom of class files. Anything that needs DI stays a method/provider.

## Domain

- **Apartment** is archived via `isActive = false`, never deleted. Leases reference it with `onDelete: Restrict`,
  so a delete with history fails at the DB level. Same for **Tenant** (via `LeaseTenant`).
- **Users** (migration `add_service_users_api_keys`): `kind` HUMAN (password login) or SERVICE (worker, bots — API keys
  only). Raw-SQL CHECK `users_password_matches_kind`: HUMAN ⇒ `passwordHash` NOT NULL, SERVICE ⇒ NULL. Service emails
  use the reserved `.invalid` TLD (`worker@service.invalid`); email stays required and unique.
- **ApiKey** belongs to a user (`onDelete: Restrict`): only `keyHash` (SHA-256) and a public `prefix` are stored,
  `scopes String[]`; revoked via `revokedAt`, never deleted. Never log or return a key after creation.
- **API keys** (`src/api-keys/`): scopes only from `API_KEY_SCOPES` (`constants/api-key-scopes.ts`, type
  `ApiKeyScope`). Key = `rm_<8 hex>_<32 bytes base64url>`; `prefix` = `rm_<8 hex>` (public, shown in lists/logs),
  `keyHash` = SHA-256 of the whole key (the lookup). `ApiKeysService.verify(token)` → `{ apiKey, user }` or null
  (not `rm_…`, unknown, revoked, inactive or non-SERVICE user). Managed by the CLI (`src/cli/api-keys.ts`, own slim
  `CliModule`; scripts build first): `pnpm --filter api apikey:create --service worker --name "<label>" --scopes
photos:read`, `apikey:list`, `apikey:revoke <prefix>`. `create` upserts `<service>@service.invalid`; the full
  key is printed once there and nowhere else.
- **Money** is `Int` kopiyky (UAH), e.g. `monthlyRent: 1500000` = 15 000.00 UAH. Never floats.
- **Lease** dates are `@db.Date` (no time); `endDate` is the _inclusive_ last day, `null` = open-ended.
- Constraints written in raw SQL in migration `add_apartments_tenants_leases` (not visible in `schema.prisma`):
  - `leases_dates_check`: `endDate >= startDate`.
  - `leases_no_overlap`: GiST exclusion — leases of one apartment never overlap (needs the `btree_gist` extension).
  - `lease_tenants_one_primary`: partial unique index — **at most** one PRIMARY tenant per lease.
    "At least one" isn't enforced by the DB: the service creating a lease must add the PRIMARY in the same transaction.
- **Meters & readings**: no cascade from Apartment/Meter/User (Restrict) — meters are removed via `removedAt`, readings
  are cancelled; only `ReadingValue` cascades with its `Reading`. `ReadingValue.value` is `Decimal(12,3)` → Prisma
  returns `Prisma.Decimal` (decimal.js): calculate with it, never convert to `number`.
- Raw-SQL constraints in migration `add_meters_readings`:
  - `readings_period_first_of_month`: `period` is the 1st of a month.
  - `meters_removed_after_installed`: `removedAt >= installedAt`.
  - `reading_values_non_negative`: `value >= 0`.
  - `readings_confirmed_has_confirmer`: CONFIRMED ⇒ `confirmedAt` and `confirmedById` set.
  - Partial unique indexes over CONFIRMED rows only (drafts/cancelled may repeat):
    `readings_one_confirmed_regular_per_period` (meter + period), `readings_one_confirmed_initial`,
    `readings_one_confirmed_final` (one each per meter).
- **Consumption** = view `reading_consumption` (migration `add_reading_consumption_view`): one row per value of every
  CONFIRMED reading with `previousValue` and `consumption` (`LAG` per meter + zone, ordered by period, readingDate,
  kind INITIAL < REGULAR < FINAL, createdAt; NULL without a previous value). **The single place consumption is
  computed — billing must reuse it**, not re-implement it. Read it with `$queryRaw` (no Prisma model; Prisma ignores
  views when diffing). Filter it from outside by `"meterId"` (pushed into the view, so LAG still sees the full
  history); never filter by period inside it.
- **Tariffs** (migration `add_tariffs`): one catalog for meter tariffs and fixed fees. `Tariff.kind` METERED
  (price per unit of the consumption of `utilities`, e.g. drainage = COLD_WATER + HOT_WATER) or FIXED (price per
  month, `utilities` empty). District-specific prices = a separate tariff. `TariffPrice` = price history:
  `effectiveFrom` (1st of month) + `zone` (default TOTAL) + `price` `Decimal(12,4)` UAH. Price for a period = the
  latest `effectiveFrom <= period` for the zone, falling back to TOTAL (a two-zone meter only needs a NIGHT price).
  `ApartmentTariff` = which tariffs an apartment is billed for, `activeFrom..activeTo` (1st days of months,
  `activeTo` = last billed month inclusive, null = ongoing). FIXED fees bill the full month (no proration).
  - Raw-SQL constraints: `tariffs_utilities_match_kind` (METERED ⇒ ≥ 1 utility, FIXED ⇒ none; the list column is
    nullable, NULL = empty), `tariff_prices_effective_first_of_month`, `tariff_prices_non_negative`,
    `apartment_tariffs_active_{from,to}_first_of_month`, `apartment_tariffs_dates_check`,
    `apartment_tariffs_no_overlap` (GiST exclusion: one tariff per apartment per month).
  - Services must enforce: DAY/NIGHT prices only for METERED tariffs with ELECTRICITY; `kind`/`utilities` of a
    tariff in use never change (archive it and create a new one).
- Reading rules the **services** must enforce (the DB doesn't):
  - Zones match the meter: SINGLE → exactly TOTAL; DAY_NIGHT → exactly DAY and NIGHT.
  - Confirmed values never decrease within one meter and zone (compare with the previous confirmed reading);
    INITIAL is the meter's first reading, FINAL its last — nothing after FINAL.
  - CONFIRMED readings are immutable — correct by cancelling and creating a new one.
  - No readings outside `installedAt..removedAt` (`readingDate` within the range).

## API conventions

- Everything is behind the global auth guard; only auth routes are `@Public()`. Controllers get `@ApiCookieAuth()`.
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
- **Apartments list and detail** both return `ApartmentDetailResponseDto` with `currentLease` (lease covering today, Kyiv
  time; helper `apartments/helpers/current-lease-where.ts`). The list loads it in one query via `include`.
- **Tenants**: phones are Ukrainian only, normalized to `+380XXXXXXXXX` by `@IsUaPhone()` (rule:
  `normalizeUaPhone` in `@rental/shared`, also used by the web); `?search=` matches the name or the phone digits in any
  format (`phoneSearchDigits`). The list returns `TenantListItemResponseDto` (`status` LIVING/FORMER/NONE +
  `currentApartment`, `helpers/tenant-status.ts`); detail leases carry `monthlyRent` and `isCurrent`.
  `POST /tenants` takes an optional `assignment` (discriminated by `mode`, chosen by the client, never inferred):
  NEW_LEASE (open-ended lease, tenant = PRIMARY; overlap → 409 from `leases_no_overlap`) or ADD_CONTACT (lease must
  cover today, apartment active → else 409). One `$transaction` in `TenantsService.create`; unknown ids → 400.
- **No DELETE for apartments** — archive/unarchive. Tenants: DELETE only without lease history (409 otherwise).
  Leases: DELETE allowed until a statement references the lease (FK Restrict → 409).
- Swagger: every endpoint documents its success response type and the error statuses it can return.
- **Reading values**: decimal strings in and out (`"1520.350"`), never JS numbers. Input: `@IsReadingValues()` /
  `@IsMeterValue()` (`src/readings/validators/`); output: `ReadingValueResponseDto` (`toFixed(3)`). Compute with
  `Prisma.Decimal`.
- **Period**: `"YYYY-MM"` in the API, 1st of the month in the DB (`periodOfDate` / `formatPeriod`, `src/common/helpers/period.ts`).
- **Reading rules are shared pure functions** in `src/readings/helpers/` — reuse, don't re-implement:
  `zonesMismatch(scheme, values)` (zones vs `zoneScheme`), `decreasedZones(previous, next)` (values never decrease),
  `lastConfirmedReadingInclude` (a meter's latest CONFIRMED reading). They return data; services throw 400/409.
- **Meter lifecycle** (`src/meters/`): create = meter + CONFIRMED INITIAL reading; wrong initial value = cancel the
  INITIAL + create a new one (only before any non-cancelled REGULAR reading); remove = CONFIRMED FINAL + `removedAt`;
  replace = remove + create in one transaction; DELETE only for a mistaken meter (nothing but INITIAL readings).
  Responses carry `canDelete` / `canEditInitialValues` (`helpers/meter-flags.ts`, added by `MetersService.withFlags`
  in one grouped query) — same rules as DELETE / PUT initial-values, which still enforce them.
  Dates that become a `readingDate` must not be in the future. `createdById`/`confirmedById` = `@CurrentUser()`.

## More

- Feature details: `.claude/rules/api-*.md` (load when you touch that feature).
- Billing reuses the `reading_consumption` view and `priceForPeriod` — never re-implement.
- Project rules override advice from skills.
