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
- **No DELETE for apartments** — archive/unarchive. Tenants: DELETE only without lease history (409 otherwise).
  Leases: DELETE allowed until statements exist (TODO in `LeasesService.delete`).
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
  Dates that become a `readingDate` must not be in the future. `createdById`/`confirmedById` = `@CurrentUser()`.
- **Readings** (`src/readings/`): REGULAR only (INITIAL/FINAL belong to the meter lifecycle). DRAFT → edit/delete →
  confirm (or create with `confirm: true`); CONFIRMED → only cancel (`reason` appended to `note`) and re-enter.
  - Confirm rules are **pure** in `helpers/confirm-rules.ts` (`checkConfirmRules`, `today` passed in, no DB) — add rules
    and tests there; the service only loads data in a transaction and maps violations (`conflict` → 409, else 400).
  - Drafts are checked lightly (zones, meter not removed); dates, value order and duplicates only on confirm.
  - Chronology of a meter = `(readingDate, kind)` with INITIAL < REGULAR < FINAL on the same day
    (`helpers/reading-order.ts`). Consumption is always against the **previous CONFIRMED** reading.
  - Apartment view (`GET /apartments/:id/readings?period=`): meters active in the period; CONFIRMED = confirmed REGULAR
    or FINAL of that period, DRAFT = newest draft, MISSING = nothing yet.

## Database (Prisma 7)

- Schema: `prisma/schema.prisma`; CLI config (URL, migrations path, seed): `prisma.config.ts`; migrations: `prisma/migrations/`.
- Client is generated into `src/generated/prisma/` (gitignored; `pnpm install` regenerates it). Import from `../generated/prisma/client.js`.
- Use the global `PrismaService` (`src/prisma/`); the app gets `DATABASE_URL` from `ConfigService`.
- Expected Prisma errors (P2002/P2003 → 409, P2025 → 404, P2000 → 400) are mapped by `PrismaExceptionFilter`; don't catch them in services. Business rules (e.g. readings only grow) are still checked explicitly in services.
- After a schema change: `pnpm --filter api db:migrate --name <change>` (creates + applies a migration), then `db:generate`.
- Other: `db:migrate:deploy` (apply pending, prod/CI), `db:studio` (or root `pnpm prisma:studio`).
- Never edit an applied migration — always create a new one. Ask before changing the schema.

### Seeding users

- Users come only from the seed (no sign-up). Data: `prisma/seed-users.json` — **gitignored**, holds real passwords.
  Start from the committed `prisma/seed-users.example.json` (fake data): `cp prisma/seed-users.example.json prisma/seed-users.json`.
- Format: `[{ "email": "...", "password": "...", "name": "..." }]` (`name` optional). Validated before touching the DB:
  valid email, password ≥ 12 chars, no duplicate emails; on error the seed exits 1 and lists every problem.
- Run: `pnpm --filter api seed` (alias `db:seed`; runs `prisma/seed.ts` via `prisma.config.ts`).
  Idempotent: upsert by email; updates `name`, but never an existing password unless run with
  `pnpm --filter api seed -- --reset-passwords`.
- The seed never logs passwords or hashes — keep it that way.
- Emails are stored lowercase + trimmed: always pass them through `normalizeEmail` (`src/users/`); a DB CHECK constraint is the backstop.
- Password hashing (argon2id): `PasswordService` in `src/users/` (exported by `UsersModule`, which auth will import).

## Auth (`src/auth/`)

- Global `/api` prefix so API paths equal what the browser sees through the web app's `/api/*` proxy (same origin); cookie paths depend on it.
- **Access token**: JWT (`@nestjs/jwt`, no Passport), payload `{ sub: userId }`, TTL `JWT_ACCESS_TTL_SECONDS` (900). Cookie `access_token`, `Path=/api`.
- **Refresh token**: opaque random 32 bytes, TTL `REFRESH_TOKEN_TTL_DAYS` (30, sliding). Cookie `refresh_token`, `Path=/api/auth`.
  Stored only as SHA-256 in `Session` (fast hash is fine for a random token; it's the unique lookup key).
- Cookies: `httpOnly`, `SameSite=Strict`, `Secure` in production. Helpers in `helpers/auth-cookies.ts`.
- Rotation on every `POST /auth/refresh` (atomic: old row gets `revokedAt` + `replacedById`). Presenting a revoked token = reuse → **all** sessions of that user are revoked. Two tabs refreshing at once trigger this too (accepted for a single user).
- `JwtAuthGuard` is global (`APP_GUARD`) and stateless (no DB hit): every route needs a valid access token unless marked `@Public()`. Use `@CurrentUser()` → `{ id }`; load the user if you need more. Deactivation takes effect within one access TTL.
- Endpoints: `POST /auth/login` (public), `POST /auth/refresh` (public), `POST /auth/logout` (public, revokes the session from the refresh cookie, always clears cookies), `GET /auth/me`.
- Login: email normalized; unknown email, wrong password and inactive user all → `401 Invalid email or password` (a dummy argon2 verify keeps timing equal).
- Rate limit: `ThrottlerGuard` on `AuthController` only — login 5/min, refresh 30/min per IP (`trust proxy` = loopback, so the proxy's `X-Forwarded-For` counts).
- Secrets/TTLs come from `ConfigService` (`JWT_ACCESS_SECRET` ≥ 32 chars, required). Never log tokens.
- Config → options mapping lives in `src/auth/config/` as pure `*OptionsFromConfig(config: ConfigService<Env, true>)` functions (`jwt.config.ts`, `cookie.config.ts`). Follow this pattern in other features (`src/<feature>/config/`).
- Swagger: cookie auth is declared; log in via "Try it out" on `/api/auth/login` and the browser sends the cookie for later calls.
- e2e tests importing `AppModule` get the guard too — test-only controllers need `@Public()`.

## Photos (`src/photos/`, storage in `src/storage/`)

- Storage: `StorageService` (`put` / `getStream` / `delete`) over `@aws-sdk/client-s3`; MinIO in dev. Config:
  `S3_ENDPOINT` (omit for real S3), `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_FORCE_PATH_STYLE` (`true` for MinIO) — switching to S3 is config only. Nothing else imports the SDK.
- Keys: `photos/YYYY/MM/<photoId>.<ext>` (original) and `thumbnails/YYYY/MM/<photoId>.webp`; month = upload day in Kyiv.
  The uuid is the Photo row id. **Never** put the original filename in a key (it's only metadata).
- **The original is immutable**: stored byte-for-byte, never re-encoded or overwritten. Only the thumbnail is
  derived (sharp: EXIF orientation applied, max 400px, WebP). `width`/`height` are as displayed (after orientation).
- Type comes from the content (magic bytes, `file-type`), never from the header or extension. Allowed: JPEG, PNG,
  WebP. **HEIC is rejected** (our prebuilt sharp has no HEVC decoder) — revisit if tenants send HEIC.
- **Dedup by sha256** (unique): same file for the same apartment → existing record with `duplicate: true`, nothing
  stored; for another apartment → 409.
- Consistency: upload = objects first, then the row (insert fails → delete the objects); delete = row first (tx), then
  objects (a failure only leaves a logged orphan object, never a row pointing at nothing).
- Limits (`PHOTO_MAX_FILES`, `PHOTO_MAX_FILE_SIZE_MB`) go through `MulterModule.registerAsync` (in-memory). Too many
  files → 400, too large → 413. `multer` isn't a direct dependency: don't import it at runtime (types come from `@types/multer`).
- A photo backs 0..n readings (`Reading.photoId`, FK `Restrict`; `source = PHOTO`), always of the same apartment.
  "Unassigned" = no non-cancelled reading. DELETE only when unassigned; cancelled readings are unlinked first.
- File endpoints stream through the API (auth required), `Cache-Control: private, max-age=86400`.
