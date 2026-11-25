---
name: issue
description: Implement a GitHub issue end to end.
argument-hint: <N> [--scout] [--tests] [--review]
disable-model-invocation: true
allowed-tools: Bash(git branch --show-current), Bash(git status --short), Bash(gh issue edit * --add-assignee @me)
---

## Context

- Branch: !`git branch --show-current`
- Status: !`git status --short`

## Task

Implement the issue from `$ARGUMENTS`: the issue number, optionally with `--scout`, `--tests`, `--review` (any order).
`<N>` = that number only — without a leading `#` and without the flags (`/issue #94 --review --scout` → `94`): never
pass a `#…` to the shell, where `#` starts a comment.

## Steps

1. `gh issue view <N> --json title,body,state,comments` — read it fully; comments may change the scope.
2. Resolve `<base>`: `Part of #E` and a remote `epic/<E>-*` (`git ls-remote --heads origin 'epic/<E>-*'`) → that branch.
   `Part of #E` without one → ask me (AskUserQuestion): create `epic/<E>-<slug>` from `main`, or work from `main`. Otherwise `main`.
   Don't create anything yet.
3. Every `Depends on #M` is satisfied: closed, or has a merged PR into the epic `<base>` with `Implements #M` in its
   body. If not, stop and tell me.
4. Nobody is already on it: an open PR that closes the issue
   (`gh issue view <N> --json closedByPullRequestsReferences`) or has `Implements #<N>` in its body, a remote branch
   `*/<N>-*` (`git ls-remote --heads origin`), or an assignee other than me → stop and tell me.
   Otherwise `gh issue edit <N> --add-assignee @me` (the claim).
5. `--scout`: run the `issue-scout` subagent with `<N> base=<base>` (epic branch not created yet → `base=main`); show me
   its brief as is. BLOCKED → stop. `Open questions` isn't "none" → ask me and wait for the answers. Plan from the brief;
   read only the files you'll change or need for the plan.
6. Enter plan mode, show the plan, wait for approval.
7. New epic branch chosen in step 2 → create it from fresh `origin/main` and push it.
   `git checkout <base> && git pull`. Epic `<base>` → `git merge origin/main` into it and push; conflicts →
   `git merge --abort`, stop and tell me. Then branch `<type>/<N>-<slug>` from `<base>`.
8. Type `fix`, before any fix: run the `test-writer` subagent with `fix <N>`; show me its report as is. Red for the right
   reason → commit the test. No test runner in the app → continue. Anything else → stop and tell me.
9. Implement, small commits. API DTO/controller changed → `pnpm gen:api`, commit the generated files. A decision that
   changes a rule → update `CLAUDE.md` / `.claude/rules` in the same PR.
10. `--tests`, type not `fix`: run `test-writer` with `issue <N> base=<base>`; show me its report as is. Fix nothing until
    I pick findings; commit the tests.
11. Run lint + tests (+ build).
12. `--review`: run `code-reviewer` with `<N> base=<base>`; show me its report as is. Fix nothing until I pick findings;
    after the fixes, repeat step 11.
13. Read and follow `.claude/skills/pr/SKILL.md`; run its Context commands yourself.

## Rules

- Uncommitted changes in Context → stop and tell me before step 4.
