# <img width="24" src="https://github.githubassets.com/images/modules/site/features/actions-icon-actions.svg" alt="actions"> Actions

Impl Github Actions & Runner using typescript, Run your [GitHub Actions](https://developer.github.com/actions/) locally and deploy your own CI/CD platform.

[![npm][npm]][npm-url]
[![Build Status][build-status]][build-status-url]
[![Install Size][size]][size-url]

## Installation

```sh
npm i -g @sobird/actions
```

## Usage

```sh
actions
Usage: actions [options] [command]

Run GitHub actions locally by specifying the event name (e.g. `push`) or an action name directly.

Options:
  -V, --version              output the version number
  -c, --config <path>        config file path (default: "actions.config.yaml")
  -h, --help                 display help for command

Commands:
  config                     generate an example config file
  run [options] [eventName]  run workflow locally
  help [command]             display help for command
```

### Run workflow locally

Run all local workflows containing push events
```sh
actions run push
```
Run a job with jobId as job-name
```sh
actions run -j job-name
```
Run a job directly on the host
```sh
actions run -j job-name --hosted
```

## Reference

* [actions/runner](https://github.com/actions/runner)
* [nektos/act](https://github.com/nektos/act)
* [go-gitea/gitea](https://github.com/go-gitea/gitea)

<!-- Badges -->
[npm]: https://img.shields.io/npm/v/@sobird/actions.svg
[npm-url]: https://www.npmjs.com/package/@sobird/actions
[build-status]: https://img.shields.io/github/actions/workflow/status/sobird/actions/release-please.yml?label=CI&logo=github
[build-status-url]: https://github.com/sobird/actions/actions
[size]: https://packagephobia.com/badge?p=@sobird/actions
[size-url]: https://packagephobia.com/result?p=@sobird/actions