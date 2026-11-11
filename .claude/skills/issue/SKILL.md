---
name: issue
description: Implement a GitHub issue end to end.
disable-model-invocation: true
---

Implement issue #$ARGUMENTS:
1. `gh issue view $ARGUMENTS --comments` — read it fully; comments may change the scope.
2. Check every `Depends on #N` is closed; if not, stop and tell me.
3. Enter plan mode, show the plan, wait for approval.
4. `git checkout main && git pull`, then branch `<type>/<N>-<slug>`; small commits.
5. API DTO/controller changed → `pnpm gen:api`, commit the generated files.
6. A decision that changes a rule → update `CLAUDE.md` / `.claude/rules` in the same PR.
7. Run lint + tests (+ build) before finishing.
8. Open a PR with "Closes #$ARGUMENTS".
