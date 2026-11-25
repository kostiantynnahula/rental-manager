---
name: load-rules
description: How to load the project rules that apply to a set of files.
user-invocable: false
---

## Task

Load the rules for the touched files: the files in the diff, the files about to change, or the given paths.

## Steps

1. Read root `CLAUDE.md`.
2. For each touched app or package, read its `CLAUDE.md` (if any) and every file it imports with `@…`. Paths are
   relative to the importing file (`@docs/domain.md` in `apps/api/CLAUDE.md` → `apps/api/docs/domain.md`).
3. Read the frontmatter of every `.claude/rules/*.md`. Read in full each one whose `paths:` globs match a touched file;
   brace globs like `src/{auth,users}/**` match any of the alternatives.

## Rules

- Glob / Grep unavailable → list and preview rule files with `ls .claude/rules` and `head -n 12 .claude/rules/*.md`.
- Load explicitly; don't rely on auto-loading.
- A path named by a rule but missing → say so under `Not checked`.
