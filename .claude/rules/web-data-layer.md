---
paths:
  - 'apps/web/lib/api/**'
  - 'apps/web/hooks/**'
---

# Data layer (Web)

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
