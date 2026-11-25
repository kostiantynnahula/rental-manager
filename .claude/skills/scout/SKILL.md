---
name: scout
description: Brief on a GitHub issue before planning it.
argument-hint: <N>
disable-model-invocation: true
context: fork
agent: issue-scout
background: false
allowed-tools: Bash(git ls-remote --heads origin *), Bash(true)
---

## Context

- Epic branches: !`git ls-remote --heads origin 'epic/*' || true`

## Task

Scout the issue: `$ARGUMENTS`.

## Rules

- `<N>` = the number without a leading `#`; never pass `#…` to the shell.
- `base=` = the branch `epic/<E>-*` from Context for the issue's `Part of #E` if there is one, else `main`.
