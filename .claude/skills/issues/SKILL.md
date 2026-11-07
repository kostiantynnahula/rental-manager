---
name: issue
description: Implement a GitHub issue end to end.
disable-model-invocation: true
---

Implement issue #$ARGUMENTS:
1. `gh issue view $ARGUMENTS` — read it fully, including comments.
2. Enter plan mode, show the plan, wait for approval.
3. Branch `<type>/<N>-<slug>`, small commits.
4. Run lint + tests before finishing.
5. Open a PR with "Closes #$ARGUMENTS".