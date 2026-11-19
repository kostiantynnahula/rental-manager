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

## Auth

- Cookies `access_token` (Path=/api) and `refresh_token` (Path=/api/auth) never reach page URLs, so the server
  (pages, `proxy.ts`) can't check auth. The guard is client-side: `AuthGuard` in `app/(app)/layout.tsx` runs
  `GET /auth/me` (skeleton while loading, `/login?next=…` on failure). Pages outside `(app)` are public.
- `lib/api/auth-middleware.ts`: on 401 → one shared `POST /api/auth/refresh` for all parallel requests (the API
  rotates refresh tokens; two concurrent refreshes would look like token reuse and revoke all sessions), then
  replays the request once. Refresh failed → clear the query cache, redirect to `/login?next=<path>`.
  Login/refresh/logout are never refreshed or retried; `/auth/me` is (otherwise you'd be logged out after the access TTL).
- `?next` is validated by `safeNextPath()` (same-origin paths only).

## More

- Feature details — path-scoped rules, loaded when a file of that area is opened:
  - Data layer — API client, hooks (`lib/api/`, `hooks/`): `.claude/rules/web-data-layer.md`
  - Auth helpers (`lib/api/auth-*`): `.claude/rules/api-auth.md`
  - Leases (`components/leases/`): `.claude/rules/web-leases.md`
  - Photos, inbox «Вхідні» (`components/photos/`, `app/(app)/inbox/`): `.claude/rules/web-photos.md`
  - Condition photos — «Стан» tab, lease page (`components/condition-photos/`): `.claude/rules/web-condition-photos.md`
  - Readings and meters (`components/{readings,meters}/`): `.claude/rules/web-readings.md`
  - Statements (`components/statements/`): `.claude/rules/web-statements.md`
  - Tariffs (`components/tariffs/`): `.claude/rules/web-tariffs.md`
- Billing (consumption, prices, statement totals) is computed by the API only (`reading_consumption` view,
  `priceForPeriod`): the web shows what the API returns and never re-implements a calculation.
- Project rules override advice from skills.
