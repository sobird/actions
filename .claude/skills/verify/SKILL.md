---
name: verify
description: Run this repo's definition-of-done checks (typecheck, lint, format check, tests) and report failures. Use after making changes and before reporting work complete or committing, since CI does not run these.
---

Run the project's verification suite and report results faithfully.

1. Run each check and capture its output:
   - `bun run typecheck`
   - `bun run lint`
   - `bun run fmt:check`
   - `bunx vitest run`

2. Auto-fix what is safely fixable, then re-check:
   - Format failures: `bun run fmt` fixes them.
   - Lint failures: `bun run lint:fix` fixes most of them.
   - Type and test failures need real fixes; report the exact command, the failing output, and the `file:line` of each error.

3. Do not fix unrelated pre-existing failures unless asked. Do not "fix" a failure by weakening the check or deleting a test.

4. Only report success when all four checks pass. If you skipped any (for example `bun run actions:test`, which needs a Docker daemon), say so explicitly.

Never use `bun run test` here — it starts Vitest in watch mode and will hang. Always use `bunx vitest run`.
