# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Bun is the package manager and task runner — use `bun run <script>` / `bunx`, not npm or yarn.

- `bun run dev` — Next.js dev server (port 3000).
- `bun run build` — Next.js build; `bun run build:actions` — bundle the CLI to `dist/`.
- `bun run test` runs Vitest in **watch mode**. For a one-shot run use `bunx vitest run`; single file: `bunx vitest run src/common/ref.test.ts`; by name: `bunx vitest run -t "<name>"`.
- `bun run actions:test` — end-to-end check that runs `test/workflows/basic.yml` locally (requires Docker).
- `bun run proto:generate` — regenerate `src/gen/` from the proto definitions via buf.

Before considering a change done, run `bun run typecheck && bun run lint && bun run fmt:check && bunx vitest run`. CI does not run these (`.github/workflows/ci.yml` is manual-dispatch only), so nothing enforces them for you.

## Code style

Formatting and linting use the Oxc tools, not Prettier/ESLint:

- `bun run fmt` (oxfmt): 120 print width, single quotes, auto-sorted imports with blank lines between groups (`.oxfmtrc.jsonc`).
- `bun run lint` (oxlint): `correctness`, `perf`, and `suspicious` categories are errors; `unicorn/prefer-node-protocol` is an error, so always use the `node:` prefix (`import fs from 'node:fs'`).
- Husky runs lint-staged (oxfmt + `oxlint --fix`) on `pre-commit` and commitlint on `commit-msg`, so commit messages must follow Conventional Commits.

Path aliases: `@/*` → `src/*`, `@/test/*` → `test/*`.

## Architecture

One Next.js app (`app/`) plus a CLI/core library (`src/`) and the `packages/hashfiles` workspace. The server and runner communicate over ConnectRPC; protobuf-generated code lives in `src/gen/` and is committed — never hand-edit it.

Runtime requirements that are easy to miss:

- Running workflows executes Docker containers, so a reachable Docker daemon is required (`DOCKER_HOST` is honored). On macOS, `actions/cache` also needs GNU tar (`brew install gnu-tar`).
- Persistence is Sequelize + sqlite3 at `./database.sqlite`. `bun scripts/install.ts` runs `sequelize.sync({ force: true })` and **drops and recreates all tables** — not a safe routine command.
- `JWT_SECRET` (falls back to a literal default when unset) and `LOG_LEVEL` are read from the environment.
- `actions.config.yaml` is gitignored; its Zod schema is `src/config/schema.ts`, and `actions config` prints an example file.

When reimplementing behavior from the upstream [actions/runner](https://github.com/actions/runner), match the upstream semantics and source rather than approximating locally.

## Conventions

- Releases are cut by release-please from `master`; commits follow Conventional Commits.
- For multi-file or architectural changes, propose a plan before implementing.
