---
name: issue
description: Implement a GitHub issue end to end.
disable-model-invocation: true
---

Implement issue `$ARGUMENTS`. `<N>` below = that number without a leading `#` (`/issue #94` → `94`):
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
9. Open a PR with "Closes #<N>".
