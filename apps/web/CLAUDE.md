# apps/web — Next.js

@AGENTS.md

## Commands (from repo root)

- dev: `pnpm dev:web` → http://localhost:3000
- lint: `pnpm --filter web lint` · build: `pnpm --filter web build`

## Conventions

- Next 16, App Router only (`app/`), no `src/` dir; import alias `@/*` → app root.
- Server Components by default; add `'use client'` only when needed.
- Shared types come from `@rental/shared` (built to `dist/`; root `dev`/`lint` build it first).
- `AGENTS.md` is managed by `next dev` — don't edit it by hand.
