# <img width="24" src="https://github.githubassets.com/images/modules/site/features/actions-icon-actions.svg" alt="actions"> Actions

Implement GitHub Actions & Runner in TypeScript: run your [GitHub Actions](https://docs.github.com/en/actions) workflows locally, or self-host the server and register your own runners to run CI/CD yourself.

[![npm][npm]][npm-url]
[![bun][bun]][bun-url]
![TypeScript][typescript]
[![Build Status][build-status]][build-status-url]
[![Install Size][size]][size-url]

## Requirements

- A reachable Docker daemon for container steps (`DOCKER_HOST` is honored).
- [Bun](https://bun.sh) 1.3 and Node.js 24 to build from source (see `.bun-version` / `.node-version`).
- macOS only: GNU tar (`brew install gnu-tar`) for `actions/cache`.

## Installation

```sh
npm i -g @sobird/actions
```

## Run a workflow locally

Run every workflow that listens for `push` (the default event):

```sh
actions run push
```

Run a single job by id:

```sh
actions run -j <job-name>
```

Run a job directly on the host instead of in a container:

```sh
actions run -j <job-name> --hosted
```

`--hosted` does not copy the repository: it materializes an empty sandbox rooted at
`~/.actions/actions/<id>/` and mirrors absolute paths under it. Steps that read the
checkout — anything under a `working-directory` that points inside the repo, or a
local `uses: ./...` action — need the source to be linked in first, either with
`--bind-workdir` or by keeping an `actions/checkout` step in the workflow. The two
are mutually exclusive (`--no-skip-checkout` conflicts with `--bind-workdir`):

```sh
actions run -W test/workflows/defaults.yml --hosted --bind-workdir
```

## Self-host the server

The repository ships a Next.js server that stores runs and tasks, hands jobs to
registered runners over ConnectRPC, and serves a small web UI.

```sh
bun scripts/install.ts   # create the sqlite schema — drops and recreates all tables
bun run dev              # http://localhost:3000
```

Persistence is Sequelize + sqlite at `./database.sqlite`. `JWT_SECRET` (falls back
to a literal default when unset) and `LOG_LEVEL` are read from the environment; set
a real `JWT_SECRET` before exposing the server. The UI lists recent tasks at `/` and
streams a single task's log at `/log?taskId=<id>`.

### Register a runner

```sh
actions register -i http://localhost:3000 -t <registration-token> -n <runner-name> \
  -l ubuntu-latest=gitea/runner-images:ubuntu-latest
```

Omit the flags to get an interactive wizard. The result is written to `.runner`
(configurable via `runner.file`); `submit` and `logs` read the server address from it.

### Run a worker

```sh
actions daemon --capacity 1
```

The daemon polls the server for jobs, executes them (in Docker unless a label maps to
the host), and reports progress back. It needs a `.runner` file from `register`.

### Queue a run and read its log

```sh
actions submit -W .github/workflows/ci.yml
actions logs <taskId>        # add -f to follow until the task finishes
```

`submit` sends a workflow yaml to the server. Workflows are not persisted as files:
the yaml is stored on the run's jobs and is the only copy a runner sees.

## Configuration

`actions.config.yaml` (gitignored) is read from `--config <path>`. Generate a
commented example:

```sh
actions config > actions.config.yaml
```

The Zod schema lives in `src/config/schema.ts`. Top-level keys are `log` (`level`),
`daemon` (`capacity`, `timeout`, `fetchInterval`, `fetchTimeout`, `insecure`), and
`runner` (`file`, `labels`, the `env`/`secrets`/`vars`/`inputs` maps and their
`*File` counterparts, `actionsCache*`, and the `container*` Docker options).

## CLI reference

| Command                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| `actions run [eventName]`  | Run workflows locally (default event `push`) |
| `actions register`         | Register a runner with a server              |
| `actions daemon`           | Run as a runner daemon that polls for jobs   |
| `actions submit -W <file>` | Queue a workflow file as a run on the server |
| `actions logs <taskId>`    | Print a task's log                           |
| `actions config`           | Print an example config file                 |

## Development

Bun is the package manager and task runner — use `bun run <script>` / `bunx`, not npm
or yarn.

- `bun run dev` — Next.js dev server (port 3000).
- `bun run build` — Next.js build; `bun run actions:build` — bundle the CLI to `dist/`.
- `bun run test` runs Vitest in **watch mode**; for a one-shot run use `bunx vitest run`
  (single file: `bunx vitest run src/common/ref.test.ts`).
- `bun run actions:test` — end-to-end check that runs `test/workflows/hosted.yml` with
  `--hosted`; it needs no Docker daemon. `test/workflows/basic.yml` is the Docker counterpart.
- `bun run proto:generate` — regenerate `src/gen/` from the proto definitions via buf.

Before considering a change done:

```sh
bun run typecheck && bun run lint && bun run fmt:check \
  && bun run --cwd packages/hashfiles build && bunx vitest run
```

CI runs the same checks plus the app and CLI builds on every push and pull request.
The hashfiles build goes after `fmt:check`, because it rewrites
`packages/hashfiles/src/index.ts` in unformatted form.

Formatting and linting use the Oxc tools (`oxfmt` / `oxlint`), not Prettier/ESLint.
Path aliases are `@/*` → `src/*` and `@/test/*` → `test/*`. Releases are cut by
release-please from `master`, so commits follow Conventional Commits.

## Reference

- [actions/runner](https://github.com/actions/runner)
- [nektos/act](https://github.com/nektos/act)
- [go-gitea/gitea](https://github.com/go-gitea/gitea)

<!-- Badges -->

[npm]: https://img.shields.io/npm/v/@sobird/actions.svg?style=flat-square&logo=npm&label=@sobird/actions
[npm-url]: https://www.npmjs.com/package/@sobird/actions
[bun]: https://img.shields.io/badge/bundler-Bun-black?style=flat-square&logo=bun
[bun-url]: https://bun.sh/
[typescript]: https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white
[build-status]: https://img.shields.io/github/actions/workflow/status/sobird/actions/release.yml?label=CI&logo=github&style=flat-square
[build-status-url]: https://github.com/sobird/actions/actions
[size]: https://img.shields.io/badge/dynamic/json?style=flat-square&label=mass&query=$.publish.pretty&url=https://packagephobia.com/v2/api.json?p=@sobird/actions&color=blueviolet&logo=pkgsrc
[size-url]: https://packagephobia.com/result?p=@sobird/actions
