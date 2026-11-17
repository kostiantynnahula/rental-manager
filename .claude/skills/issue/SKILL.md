---
name: issue
description: Implement a GitHub issue end to end.
argument-hint: <N> [--review]
disable-model-invocation: true
---

Implement the issue from `$ARGUMENTS`: the issue number, optionally followed by `--review`.
`<N>` below = that number only — without a leading `#` and without the flag (`/issue #94 --review` → `94`):
never pass a `#…` to the shell, where `#` starts a comment.

1. `gh issue view <N> --comments` — read it fully; comments may change the scope.
2. Check every `Depends on #…` is closed; if not, stop and tell me.
3. Check nobody is already on it: an open PR that closes the issue
   (`gh issue view <N> --json closedByPullRequestsReferences`), a remote branch `*/<N>-*`
   (`git ls-remote --heads origin`), or an assignee other than me → stop and tell me.
   Otherwise `gh issue edit <N> --add-assignee @me` (the claim).
4. Enter plan mode, show the plan, wait for approval.
5. `git checkout main && git pull`, then branch `<type>/<N>-<slug>`; small commits.
6. API DTO/controller changed → `pnpm gen:api`, commit the generated files.
7. A decision that changes a rule → update `CLAUDE.md` / `.claude/rules` in the same PR.
8. Run lint + tests (+ build) before finishing.
9. Only if `--review` was passed: run the `code-reviewer` subagent with `<N>` and show me its report as is.
   Don't fix anything until I say which findings to fix; after the fixes, re-run lint + tests. Without the flag,
   skip this step.
10. Open a PR with "Closes #<N>".
