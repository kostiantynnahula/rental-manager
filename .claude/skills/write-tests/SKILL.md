---
name: write-tests
description: Write tests for a PR or for given paths.
argument-hint: <PR-number | paths…>
disable-model-invocation: true
context: fork
agent: test-writer
background: false
---

## Task

Write tests for: `$ARGUMENTS`.

## Rules

- Strip a leading `#`; never pass `#…` to the shell.
- A number → mode `pr <PR>`. Anything else → mode `paths <…>`. Empty → say so and stop.
