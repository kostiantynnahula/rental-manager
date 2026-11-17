---
name: issue
description: Implement a GitHub issue end to end.
argument-hint: <N> [--scout] [--review]
disable-model-invocation: true
---

Implement the issue from `$ARGUMENTS`: the issue number, optionally with `--scout` and/or `--review` (any order).
`<N>` below = that number only — without a leading `#` and without the flags (`/issue #94 --review --scout` → `94`):
never pass a `#…` to the shell, where `#` starts a comment.

1. `gh issue view <N> --comments` — read it fully; comments may change the scope.
2. Check every `Depends on #…` is closed; if not, stop and tell me.
3. Check nobody is already on it: an open PR that closes the issue
   (`gh issue view <N> --json closedByPullRequestsReferences`), a remote branch `*/<N>-*`
   (`git ls-remote --heads origin`), or an assignee other than me → stop and tell me.
   Otherwise `gh issue edit <N> --add-assignee @me` (the claim).
4. Only if `--scout` was passed: run the `issue-scout` subagent with `<N>` and show me its brief as is.
   `Dependencies` says BLOCKED → stop. `Open questions` isn't "none" → ask me and wait for the answers before
   planning. Then plan from the brief: read only the files you'll change or need for the plan; don't redo the
   scout's exploration. Path-scoped rules still apply as usual. Without the flag, skip this step.
5. Enter plan mode, show the plan, wait for approval.
6. `git checkout main && git pull`, then branch `<type>/<N>-<slug>`; small commits.
7. API DTO/controller changed → `pnpm gen:api`, commit the generated files.
8. A decision that changes a rule → update `CLAUDE.md` / `.claude/rules` in the same PR.
9. Run lint + tests (+ build) before finishing.
10. Only if `--review` was passed: run the `code-reviewer` subagent with `<N>` and show me its report as is.
    Don't fix anything until I say which findings to fix; after the fixes, re-run lint + tests. Without the flag,
    skip this step.
11. Open a PR with "Closes #<N>".
