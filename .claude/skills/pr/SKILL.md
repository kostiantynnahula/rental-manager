---
name: pr
description: Push the current branch and open its PR.
disable-model-invocation: true
allowed-tools: Bash(git branch --show-current), Bash(git status --short), Bash(gh issue view *), Bash(git ls-remote --heads origin *), Bash(git log *), Bash(git diff *), Bash(gh pr list *), Bash(gh api --paginate repos/{owner}/{repo}/issues/*/sub_issues), Bash(git push -u origin *), Bash(gh pr create *)
---

## Context

- Branch: !`git branch --show-current`
- Status: !`git status --short`

## Task

Open a PR for the current branch.

## Steps

1. On `main`, or uncommitted changes → stop and tell me.
2. Pick the mode by branch name; `<type>/<N>-*` → also `gh issue view <N> --json title,body` and
   `git ls-remote --heads origin 'epic/<E>-*'` for its `Part of #E`:

   | Branch                                                  | Base     | Issue lines                   |
   | ------------------------------------------------------- | -------- | ----------------------------- |
   | `epic/<E>-*`                                            | `main`   | see step 3                    |
   | `<type>/<N>-*`, `Part of #E`, remote `epic/<E>-*` exists | `epic/…` | `Part of #E`, `Implements #N` |
   | `<type>/<N>-*` otherwise                                | `main`   | `Closes #N`                   |
   | no number                                               | `main`   | none                          |

3. Epic only: list `gh api --paginate repos/{owner}/{repo}/issues/<E>/sub_issues`, and
   `gh pr list --base <epic branch> --state merged --limit 200 --json number,title,body`. Every open sub-issue needs a
   merged PR with `Implements #N` in its body; any without → list them and stop.
4. Body:
   - Epic → short epic summary, table sub-issue → PR (closed sub-issues included), last line
     `Closes #E, closes #N1, closes #N2…`: the keyword before every number, only sub-issues that are still open.
   - Issue → the issue lines, what changed, how to verify.
   - No number → description from the commits and the diff against `main`.
5. `git push -u origin <branch>`, then `gh pr create --base <base> --title '…' --body-file - <<'EOF'` with the body on
   stdin, as separate commands. Print the link.

## Rules

- Never merge.
- `Closes` only in PRs into `main`.
- Bugs found by tests go under "Found bugs" (root `CLAUDE.md`).
