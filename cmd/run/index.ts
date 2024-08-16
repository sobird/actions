/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-param-reassign */
/**
 * Run workflows
 *
 * sobird<i@sobird.me> at 2024/05/17 5:25:33 created.
 */

/* eslint-disable no-console */

import os from 'node:os';
import path from 'node:path';

import { Command } from '@commander-js/extra-typings';
import ip from 'ip';
import log4js from 'log4js';

import Artifact from '@/pkg/artifact';
import ArtifactCache from '@/pkg/artifact/cache';
import Git from '@/pkg/common/git';
import { getSocketAndHost } from '@/pkg/docker';
import Config from '@/pkg/runner/config';
import { Github } from '@/pkg/runner/context/github';
import WorkflowPlanner from '@/pkg/workflow/planner';
import { readConfSync, generateId, readJsonSync } from '@/utils';

import { bugReportOption } from './bugReportOption';
import { graphOption } from './graphOption';
import { listOption } from './listOption';

const logger = log4js.getLogger();

const ACTIONS_HOME = path.join(os.homedir(), '.actions');

function collectArray(value: string, prev: string[]) {
  return prev.concat(value.split(','));
}

function collectObject(value: string, prev: Record<string, string>) {
  const options: Record<string, string> = {};
  const pairs = value.split(',');
  for (const pair of pairs) {
    const [key, val] = pair.split('=');
    if (key) {
      options[key] = val;
    }
  }
  return {
    ...prev,
    ...options,
  };
}

export const runCommand = new Command('run')
  .description('Run workflow locally')
  // run a event name
  .arguments('[eventName]')
  // workflows
  .option('-W, --workflows <path>', 'path to workflow file(s)', './.github/workflows/')
  .option('--no-workflowRecurse', "Flag to disable running workflows from subdirectories of specified path in '--workflows'/'-W' option")
  .option('-l, --list', 'list workflows')
  .option('-g, --graph', 'draw workflows', false)
  .option('-j, --job <job>', 'run a specific job ID')
  .option('-a, --actor <actor>', 'The username of the user that triggered the initial workflow run')

  .option('--remote-name', 'git remote name that will be used to retrieve url of git repo', 'origin')
  .option('--default-branch', 'the name of the main branch', 'master')
  // .option('-E, --event <event>', 'run a event name')
  .option('-e --event-file <event path>', 'path to event JSON file', 'event.json')
  .option('--detect-event', 'Use first event type from workflow as event that triggered the workflow')

  .option('-C, --workspace <path>', 'the default working directory on the runner for steps', '.')
  .option('--json', 'Output logs in json format')
  .option('--inputs <inputs>', 'action inputs to make available to actions (e.g. --inputs myinput=foo)', collectObject, {})
  .option('--inputs-file <inputs file>', 'inputs file to read and use as action inputs', '.inputs')
  .option('--env <env>', 'env to make available to actions with optional value (e.g. --env myenv=foo,other=bar)', collectObject, {})
  .option('--env-file <env file>', 'environment file to read and use as env in the containers', '.env')
  .option('--vars <var>', 'variable to make available to actions with optional value (e.g. --vars myvar=foo or --var myvar)', collectObject, {})
  .option('--vars-file <var file>', 'file with list of vars to read from (e.g. --vars-file .vars)', '.vars')
  .option('-s --secrets <secret>', 'secret to make available to actions with optional value (e.g. --secrets mysecret=foo,toke=bar)', collectObject, {})
  .option('--secrets-file <secretfile>', 'file with list of secrets to read from (e.g. --secret-file .secrets)', '.secrets')
  .option('--matrix', 'specify which matrix configuration to include (e.g. --matrix java:13')
  .option('--insecure-secrets', "NOT RECOMMENDED! Doesn't hide secrets while printing logs")

  .option('-P, --platform <platform>', 'custom image to use per platform (e.g. -P ubuntu-latest=nektos/act-environments-ubuntu:18.04)', collectArray, [])

  .option('--use-gitignore', 'Controls whether paths specified in .gitignore should be copied into container')

  // actions/cache
  .option('--no-cache-server', 'Disable cache server')
  .option('--cache-server-path <path>', 'Defines the path where the cache server stores caches.', path.join(ACTIONS_HOME, 'artifact', 'cache'))
  .option('--cache-server-addr <addr>', 'Defines the address to which the cache server binds.', ip.address())
  .option('--cache-server-port <port>', 'Defines the port where the artifact server listens. 0 means a randomly available port.', (value: string) => { return Number(value); }, 0)
  .option('--default-actions-url <url>', 'Defines the default url of action instance')
  .option('--no-skip-checkout', 'Do not skip actions/checkout')

  // artifact server
  .option('--artifact-server-path <path>', 'Defines the path where the artifact server stores uploads and retrieves downloads from. If not specified the artifact server will not start', '')
  .option('--artifact-server-addr <addr>', 'Defines the address where the artifact server listens')
  .option('--artifact-server-port <port>', 'Defines the port where the artifact server listens (will only bind to localhost)', (value: string) => { return Number(value); }, 0)

  // container
  .option('--privileged', 'use privileged mode')
  .option('--userns <userns>', 'user namespace to use')
  .option('-i, --image <image>', 'Docker image to use. Use "-self-hosted" to run directly on the host', 'actions/runner-images:ubuntu-latest')
  .option('--network <network>', 'Specify the network to which the container will connect')
  .option('--container-architecture <arch>', 'Architecture which should be used to run containers, e.g.: linux/amd64. If not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.')
  .option('--container-daemon-socket <socket>', 'Path to Docker daemon socket which will be mounted to containers')
  .option('--container-cap-add <cap...>', 'kernel capabilities to add to the workflow containers (e.g. --container-cap-add SYS_PTRACE)', collectArray, [])
  .option('--container-cap-drop <drop...>', 'kernel capabilities to remove from the workflow containers (e.g. --container-cap-drop SYS_PTRACE)', collectArray, [])
  .option('-p, --pull', 'pull docker image(s) even if already present')
  .option('--rebuild', 'rebuild local action docker image(s) even if already present')
  .option('--container-opts <opts>', 'container options')

  // actions
  .option('--actions-instance <instance>', 'Actions instance to use')
  .option('--use-new-action-cache', 'Enable using the new Action Cache for storing Actions locally', false)
  .option('--action-offline-mode', 'If action contents exists, it will not be fetch and pull again. If turn on this, will turn off force pull', false)
  .option('--action-cache-dir <dir>', 'Defines the dir where the actions get cached and host workspaces created.', path.join(ACTIONS_HOME, 'actions'))
  .option('--local-repository <local repository>', 'Replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols)', collectArray, [])
  .option('--token <token>', 'If you want to use private actions on GitHub, you have to set personal access token', '')
  // debug
  .option('--bug-report', 'Display system information for bug report', false)
  .option('-d, --debug', 'enable debug log')
  .option('-n, --dryrun', 'dryrun mode')

  .action(async (eventName, options, program) => {
    const version = program.parent?.version();
    if (options.bugReport) {
      return bugReportOption(version);
    }

    try {
      const { socket, host } = getSocketAndHost(options.containerDaemonSocket);
      process.env.DOCKER_HOST = host;
      options.containerDaemonSocket = socket;
      logger.info("Using docker host '%s', and daemon socket '%s'", host, socket);
    } catch (error) {
      logger.warn("Couldn't get a valid docker connection: %+v", (error as Error).message);
    }

    if (process.platform === 'darwin' && process.arch === 'arm64' && !options.containerArchitecture) {
      console.warn(" \u26d4 You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. \u26d4");
    }

    logger.debug('Loading environment from %s', options.envFile);
    Object.assign(options.env, readConfSync(options.envFile));

    logger.debug('Loading vars from %s', options.varsFile);
    Object.assign(options.vars, readConfSync(options.varsFile));

    logger.debug('Loading secrets from %s', options.secretsFile);
    Object.assign(options.secrets, readConfSync(options.secretsFile));

    logger.debug('Loading action inputs from %s', options.inputsFile);
    Object.assign(options.inputs, readConfSync(options.inputsFile));

    // @todo matrix

    const planner = await WorkflowPlanner.Collect(options.workflows, options.workflowRecurse);
    // collect all events from loaded workflows
    const { events } = planner;

    // default plan all jobs
    let plan = planner.planAll();

    if (eventName) {
      logger.info('Using chosed event for filtering: %s', eventName);
    } else if (events.length === 1 && events[0]) {
      logger.info('Using the only detected workflow event: %s', events[0]);
      [eventName] = events;
    } else if (options.detectEvent && events.length > 0 && events[0]) {
      // set default event type to first event from many available
      // this way user dont have to specify the event.
      logger.info('Using first detected workflow event for filtering: %s', events[0]);
      [eventName] = events;
    } else {
      // logger.debug('Using default workflow event: push');
      // eventName = 'push';
    }

    if (options.job) {
      logger.info('Preparing plan with a job: %s', options.job);
      plan = planner.planJob(options.job);
    } else if (eventName) {
      logger.info('Preparing plan for a event: %s', eventName);
      plan = planner.planEvent(eventName);
    } else {
      logger.info('Preparing plan with all jobs');
      plan = planner.planAll();
    }

    if (options.list) {
      return listOption(plan);
    }

    if (options.graph) {
      return graphOption(plan);
    }

    if (options.platform.length === 0) {
      // init todo
    }

    const deprecationWarning = '--%s is deprecated and will be removed soon, please switch to cli: `--container-options "%[2]s"` or `.actrc`: `--container-options %[2]s`.';
    if (options.privileged) {
      logger.warn(deprecationWarning, 'privileged', '--privileged');
    }
    if (options.userns) {
      logger.warn(deprecationWarning, 'userns', `--userns=${options.userns}`);
    }
    if (options.containerCapAdd) {
      logger.warn(deprecationWarning, 'container-cap-add', `--container-cap-add=${options.containerCapAdd}`);
    }
    if (options.containerCapDrop) {
      logger.warn(deprecationWarning, 'container-cap-drop', `--container-cap-drop=${options.containerCapDrop}`);
    }

    if (options.useNewActionCache || options.localRepository.length > 0) {
      if (options.actionOfflineMode) {
        // todo offline model
      } else {
        // todo online model
      }
      if (options.localRepository.length > 0) {
        // todo init LocalRepositoryCache
      }
    }

    // Start Artifact Server
    const ACTIONS_RUNTIME_URL = 'ACTIONS_RUNTIME_URL';
    if (options.artifactServerPath) {
      const artifact = new Artifact(options.artifactServerPath, options.artifactServerAddr, options.artifactServerPort);
      const actionsRuntimeURL = await artifact.serve();
      logger.debug('Artifact Server address:', actionsRuntimeURL);
      options.env[ACTIONS_RUNTIME_URL] = actionsRuntimeURL;
    }
    // Start Artifact Cache Server
    const ACTIONS_CACHE_URL = 'ACTIONS_CACHE_URL';
    if (options.cacheServer && !options.env[ACTIONS_CACHE_URL]) {
      const artifactCache = new ArtifactCache(options.cacheServerPath, options.cacheServerAddr, options.cacheServerPort);
      const artifactCacheServeURL = await artifactCache.serve();
      logger.debug('Artifact Cache Server address:', artifactCacheServeURL);
      options.env[ACTIONS_CACHE_URL] = artifactCacheServeURL;
    }

    // run plan
    const git = new Git(options.workspace);
    const username = await git.username();
    const repoInfo = await git.repoInfo();
    const ref = await git.ref() || '';

    const actor = options.actor || username || 'actor';
    const actor_id = generateId(actor);

    const { sha } = await git.revision();

    const repository_owner = repoInfo.owner || 'owner';
    const repository = `${repository_owner}/${repoInfo.name}`;
    const repository_id = generateId(repository);
    const repository_owner_id = generateId(repository_owner);
    const repositoryUrl = repoInfo.url;

    // event
    const event = readJsonSync(options.eventFile);
    if (!event?.repository?.default_branch) {
      event.repository = event.repository || {};
      event.repository.default_branch = options.defaultBranch;
    }

    const userInfo = os.userInfo();

    const github = new Github({
      actor,
      actor_id,
      api_url: 'https://api.github.com/',
      graphql_url: 'https://api.github.com/graphql',
      repository,
      repository_id,
      repository_owner,
      repository_owner_id,
      repositoryUrl,
      retention_days: '0',

      server_url: 'https://github.com',

      event_name: eventName,
      event_path: options.eventFile,
      event,
      sha,
      ref,
      triggering_actor: userInfo.username,
      token: options.token,
      workspace: options.workspace,
    });

    const context = {
      github,
      env: options.env,
      vars: options.vars,
      secrets: {
        ...options.secrets,
        GITHUB_TOKEN: options.token,
      },
      inputs: options.inputs,
    };

    console.log('options', options);

    const config = {
      context,
      skipCheckout: true,
    };

    await plan.executor(config as Config).execute();
    process.exit();
  });
