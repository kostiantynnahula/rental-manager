# apps/web — Next.js

@AGENTS.md

## Commands (from repo root)

- dev: `pnpm dev:web` → http://localhost:3000
- lint: `pnpm --filter web lint` · build: `pnpm --filter web build`
- API types: `pnpm gen:api` (root) — exports `apps/api/openapi.json`, then generates `lib/api/schema.d.ts`.
  Run it after any API DTO/controller change; both files are committed.

## Conventions

- Next 16, App Router only (`app/`), no `src/` dir; import alias `@/*` → app root.
- Server Components by default; add `'use client'` only when needed.
- Shared types come from `@rental/shared` (built to `dist/`; root `dev`/`lint` build it first).
- One component per file. Feature constants go in `components/<feature>/constants/<topic>.ts`, pure helpers in
  `components/<feature>/helpers/<name>.ts` (one function per file).
- `AGENTS.md` is managed by `next dev` — don't edit it by hand.
- UI: shadcn/ui (radix, "nova" preset, `components/ui/`, add via `pnpm dlx shadcn@latest add <name>`). Forms use
  `field` + react-hook-form `Controller` + zod (shadcn's old `form` component is deprecated). `cn` comes from the
  `cn` package (shadcn's replacement for clsx + tailwind-merge). Button/input sizes were bumped to 44px on mobile
  (`h-11 md:h-8`) — keep that when re-adding components.
- Env: `next.config.ts` also loads the root `.env`. `API_INTERNAL_URL` (validated) is the `/api/*` rewrite
  target; rewrites are resolved at build time, so it's needed for `next build` too.

## Product rules

- Internal admin app, used mostly on a phone: mobile-first, touch targets ≥ 44px, must work at 375px width.
- UI text in Ukrainian, hardcoded (no i18n library); `<html lang="uk">`. Code and comments in English.
- Dates, periods, money for display/input only via `lib/format.ts` (uk-UA; money = integer kopiyky, no floats).
- Light theme only (no `.dark`, no `next-themes`).
- Data: client components + React Query. Server components only for static layout/shells.
- Never hand-write API types: use `paths`/`components` from `lib/api/schema.d.ts` and the `api` client
  (`lib/api/client.ts`); throw on errors with `unwrap()` inside query/mutation functions.

## Data layer (pattern for every resource)

- `lib/api/queries/<resource>.ts`: a key factory (`apartmentKeys.all/lists()/list(filter)/details()/detail(id)`) plus
  hooks only (`useApartments`, `useApartment`, `useCreateApartment`, …); types come from `lib/api/schema.d.ts`.
  Components never call `api` directly.
- Mutations invalidate the affected keys (`lists()` + `detail(id)`) instead of writing responses into the cache
  (mutation responses are often a slimmer DTO than the queries).
- Errors: `applyApiError(error, { setError, fields: [{ status: 409, field: 'name', message }] })` from
  `lib/api/api-error.ts` puts known server errors on form fields and toasts everything else; queries show
  `<QueryError>`, 404/400 → `<NotFoundState>` (`isNotFoundError`).
- Lists: `components/data-table` (TanStack Table **v9**: features registered in `data-table/features.ts`; columns at
  module level via `createDataTableColumnHelper`). Below `md` it renders `renderCard` instead of the table.
  Search runs before the table on `getSearchText(row)`; pass stable (module-level) callbacks.
- Pages aren't unmounted on navigation (cacheComponents → React `<Activity>` keeps up to 3 routes hidden, with
  their state). A form that saves and then navigates away must call `markSaved()` from `useResetAfterSave(reset)`
  (`hooks/use-reset-after-save.ts`): when the page is hidden it resets to fresh defaults (create) or the saved
  values (edit). Unsaved drafts are kept on purpose. Defaults come from a function (fresh `todayDateOnly()`).
- Forms: RHF + zod + `field`; `useUnsavedChanges(isDirty)` (beforeunload + in-app link clicks + `confirmLeave` for
  Cancel). The browser Back gesture can't be intercepted in the App Router.
- URL state (`?active=`, `?tab=`, `?search=`) via `useSearchParam(name, parse, default)` (`hooks/use-search-param.ts`:
  `router.replace` with `scroll: false`, default left out of the URL).
- Server-side search (tenants): the input keeps local state, `useDebouncedValue` (300 ms) writes it to `?search=`, the
  query reads the URL value and uses `placeholderData: keepPreviousData`. DataTable gets no `getSearchText` then.
- Reusable forms (`TenantForm`): no router/toast/unsaved-changes inside, just `onSuccess(record)`, `onCancel?`,
  `onDirtyChange?`, `idPrefix` and `allowAssignment` (create only: optional "Прив’язати до квартири" → POST /tenants
  `assignment`; the mode comes from the selected apartment's current lease, re-checked by the API; the lease form
  passes `false`). A page wrapper (`TenantFormPage`) owns the guard, toast and redirect, so the same form
  can sit in a dialog.
- Phones: `lib/phone.ts` (`normalizeUaPhone` from `@rental/shared` = the API's rule, `formatPhone` for display,
  `viberHref`). Send normalized `+380…`, show `formatPhone`.
- `cacheComponents`: `useSearchParams`, and `useParams`/`usePathname` on dynamic routes, are request-time data →
  wrap the component in `<Suspense>` (page-level fallback skeleton) or the build fails. The shell reads the pathname
  only in `NavLinks` (own Suspense), and `AuthGuard` reads `window.location`.

## Leases (`components/leases/`)

- Lease status (Активний / Завершений / Майбутній) is computed on the client: `leaseStatus(lease, todayDateOnly())`
  (`lib/leases.ts`, Kyiv "today" — same rule as the API's current lease).
- Every lease mutation invalidates `leaseKeys.all`, `apartmentKeys.all` and `tenantKeys.all` (a lease shows on both).
- Back navigation: links into a lease carry `?from=apartment` or `?from=tenant&tenantId=…`; `leaseBackTarget()` picks
  the target (default: the apartment's Договори tab) and `originQuery()` keeps it on detail ↔ edit links.
- Forms inside a Sheet/Dialog: the content is portalled, but React still bubbles `submit` to the outer `<form>` —
  wrap the inner form in `onSubmit={(e) => e.stopPropagation()}` (see `new-tenant-sheet.tsx`).
- Dates use native `<input type="date">` (no calendar component): better on phones, values are "YYYY-MM-DD".

## Meters (`components/meters/`)

- Labels/units only from `lib/utilities.ts` (`UTILITY_LABELS`, `UTILITY_UNITS`, `ZONE_LABELS`, `zonesFor`,
  `zoneSchemesFor` — day/night exists only for electricity).
- Meter values are decimal strings end to end (`lib/meter-values.ts`: `normalizeMeterValue` → API "1520.350",
  `compareMeterValues`, `formatMeterValue` → "1520,350"); never `Number(...)`.
- Reusable pair for any reading entry: `ReadingValuesInput` (one input per zone, unit, "Попереднє: …") +
  `readingValuesSchema(previous?)` (required, ≤3 decimals, not lower than previous) and `toReadingValuesInput()`.
- `canDelete` / `canEditInitialValues` come from the API; disabled menu items stay visible with a reason.
- Sheets opened from a DropdownMenu item: the menu is `modal={false}` (otherwise focus handling leaves the body
  unclickable). Small forms in a side sheet: `components/form-sheet.tsx`.

## Readings (`components/readings/`)

- Months are "YYYY-MM" strings: `lib/period.ts` (`defaultReadingPeriod` — previous month until day
  `READINGS_DEADLINE_DAY` = 10, `addMonths`, `readingDateWindow` = the API's 1st of period … end of next month).
- Batch entry (`/apartments/[id]/readings/new`): one `POST /meters/:id/readings` per filled meter, in parallel
  (`Promise.allSettled`), `confirm: true`. Saved meters get locked, failed ones keep a per-meter message
  (`readingErrorMessage` translates the API's rule messages). Empty meter = skipped.
- Previous values = the meter's `lastReading` (last confirmed); the API re-checks order against all confirmed readings.
- History (tab "Показання", `reading-history.tsx`): `GET /apartments/:id/readings/history`, server-side pagination.
  Filters + page in the URL via `hooks/use-history-filters.ts` (`from`, `to`, `meters`, `size`, `page`; one
  `router.replace` for several params, any filter change → page 1). Values in lists: `formatMeterValueCompact`.
- Invalidation: `readingKeys.all` after creating readings **and** after every meter mutation (INITIAL/FINAL readings).
- DataTable: `pagination` prop (`manualPagination`, `rowCount`; `data` = the current page) and optional `getRowHref`
  (rows without a link). No `paginatedRowModel` is registered, so client-side lists are never sliced.

## Tariffs (`components/tariffs/`)

- Section "Тарифи" (`/tariffs`, `/tariffs/new`, `/tariffs/[id]`, `/tariffs/[id]/edit`). The list is server-side:
  search, `active`, `kind`, `size`, `page` in the URL via `hooks/use-tariff-filters.ts` (same pattern as the readings
  history; the search input is debounced into `?search=` like tenants).
- Prices are decimal strings end to end (`lib/tariff-prices.ts`: `normalizePrice` → API "4.32", `formatPrice` →
  "4,32"; ≤ 4 decimals); never `Number(...)`. Input: `PriceInput` (unit addon, formats on blur); unit via `priceUnit()`.
- Utilities of a METERED tariff are one choice from `constants/utility-sets.ts` (electricity / gas alone, water
  utilities combine, e.g. drainage) — the API's "one unit per tariff" rule holds by construction.
- A price change is a **new row** ("Нова ціна", from a month on); "Виправити"/"Видалити" on a row are only for
  mistakes. DAY/NIGHT zones only for electricity (`isZoned`); a zone without its own price uses TOTAL.
- `inUse` (attached to an apartment) locks kind/utilities in the form and disables delete (archive instead);
  archived tariffs can't get new or fixed prices.

## Auth

- Cookies `access_token` (Path=/api) and `refresh_token` (Path=/api/auth) never reach page URLs, so the server
  (pages, `proxy.ts`) can't check auth. The guard is client-side: `AuthGuard` in `app/(app)/layout.tsx` runs
  `GET /auth/me` (skeleton while loading, `/login?next=…` on failure). Pages outside `(app)` are public.
- `lib/api/auth-middleware.ts`: on 401 → one shared `POST /api/auth/refresh` for all parallel requests (the API
  rotates refresh tokens; two concurrent refreshes would look like token reuse and revoke all sessions), then
  replays the request once. Refresh failed → clear the query cache, redirect to `/login?next=<path>`.
  Login/refresh/logout are never refreshed or retried; `/auth/me` is (otherwise you'd be logged out after the access TTL).
- `?next` is validated by `safeNextPath()` (same-origin paths only).
