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
import { getSocketAndHost } from '@/pkg/docker';
import WorkflowPlanner, { Plan } from '@/pkg/workflow/planner';
import { appendEnvs } from '@/utils';

import { bugReportOption } from './bugReportOption';
import { graphOption } from './graphOption';
import { listOption } from './listOption';

const logger = log4js.getLogger();

const HOME_DIR = os.homedir();
const HOME_CACHE_DIR = process.env.XDG_CACHE_HOME || path.join(HOME_DIR, '.cache');

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
  .arguments('[eventName]')
  .option('-l, --list', 'list workflows')
  .option('-g, --graph', 'draw workflows', false)
  .option('-j, --job <job>', 'run a specific job ID')
  .option('--bug-report', 'Display system information for bug report', false)

  .option('-W, --workflows <path>', 'path to workflow file(s)', './.github/workflows/')
  .option('-C, --directory <directory>', 'working directory', '.')
  .option('--no-workflowRecurse', "Flag to disable running workflows from subdirectories of specified path in '--workflows'/'-W' option")
  .option('--defaultbranch', 'the name of the main branch')
  .option('-E, --event <event>', 'run a event name')
  .option('-e --event-file <event path>', 'path to event JSON file', 'event.json')
  .option('--detect-event', 'Use first event type from workflow as event that triggered the workflow')
  .option('-p, --pull', 'pull docker image(s) even if already present')
  .option('--rebuild', 'rebuild local action docker image(s) even if already present')
  .option('--json', 'Output logs in json format')
  .option('--input <input>', 'action input to make available to actions (e.g. --input myinput=foo)', collectObject, {})
  .option('--input-file <input file>', 'input file to read and use as action input', '.input')
  .option('--env <env>', 'env to make available to actions with optional value (e.g. --env myenv=foo,other=bar)', collectObject, {})
  .option('--env-file <env file>', 'environment file to read and use as env in the containers', '.env')
  .option('--var <var>', 'variable to make available to actions with optional value (e.g. --var myvar=foo or --var myvar)', collectObject, {})
  .option('--var-file <var file>', 'file with list of vars to read from (e.g. --var-file .vars)', '.var')
  .option('-s --secret <secret>', 'secret to make available to actions with optional value (e.g. --secret mysecret=foo,toke=bar)', collectObject, {})
  .option('--secret-file <secretfile>', 'file with list of secrets to read from (e.g. --secret-file .secrets)', '.secrets')
  .option('--matrix', 'specify which matrix configuration to include (e.g. --matrix java:13')
  .option('--insecure-secrets', "NOT RECOMMENDED! Doesn't hide secrets while printing logs")
  .option('--privileged', 'use privileged mode')
  .option('--userns <userns>', 'user namespace to use')
  .option('-P, --platform <platform>', 'custom image to use per platform (e.g. -P ubuntu-18.04=nektos/act-environments-ubuntu:18.04)', collectArray, [])
  .option('--container-architecture <arch>', 'Architecture which should be used to run containers, e.g.: linux/amd64. If not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.')
  .option('--container-daemon-socket <socket>', 'Path to Docker daemon socket which will be mounted to containers')
  .option('--use-gitignore', 'Controls whether paths specified in .gitignore should be copied into container')
  .option('--container-cap-add <cap...>', 'kernel capabilities to add to the workflow containers (e.g. --container-cap-add SYS_PTRACE)', collectArray, [])
  .option('--container-cap-drop <drop...>', 'kernel capabilities to remove from the workflow containers (e.g. --container-cap-drop SYS_PTRACE)', collectArray, [])
  .option('--container-opts <opts>', 'container options')
  .option('--no-cache-server', 'Disable cache server')
  .option('--cache-server-path <path>', 'Defines the path where the cache server stores caches.', path.join(HOME_CACHE_DIR, 'artifact', 'cache'))
  .option('--cache-server-addr <addr>', 'Defines the address to which the cache server binds.', ip.address())
  .option('--cache-server-port <port>', 'Defines the port where the artifact server listens. 0 means a randomly available port.', (value: string) => { return Number(value); }, 0)
  .option('--artifact-server-path <path>', 'Defines the path where the artifact server stores uploads and retrieves downloads from. If not specified the artifact server will not start')
  .option('--artifact-server-addr <addr>', 'Defines the address where the artifact server listens')
  .option('--artifact-server-port <port>', 'Defines the port where the artifact server listens (will only bind to localhost)', '34567')
  .option('--default-actions-url <url>', 'Defines the default url of action instance')
  .option('--no-skip-checkout', 'Do not skip actions/checkout')
  .option('-d, --debug', 'enable debug log')
  .option('-n, --dryrun', 'dryrun mode')
  .option('-i, --image <image>', 'Docker image to use. Use "-self-hosted" to run directly on the host', 'gitea/runner-images:ubuntu-latest')
  .option('--network <network>', 'Specify the network to which the container will connect')
  .option('--gitea-instance <instance>', 'Gitea instance to use')
  .option('--use-new-action-cache', 'Enable using the new Action Cache for storing Actions locally', false)
  .option('--action-offline-mode', 'If action contents exists, it will not be fetch and pull again. If turn on this, will turn off force pull', false)
  .option('--action-cache-path <path>', 'Defines the path where the actions get cached and host workspaces created.', path.join(HOME_CACHE_DIR, 'actions'))
  .option('--local-repository <local repository>', 'Replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols)', collectArray, [])
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
    appendEnvs(options.envFile, options.env);
    console.log('options.env', options.env);

    logger.debug('Loading action inputs from %s', options.inputFile);
    appendEnvs(options.inputFile, options.input);
    console.log('options.input', options.input);

    logger.debug('Loading secrets from %s', options.secretFile);
    appendEnvs(options.secretFile, options.secret);
    console.log('options.secret', options.secret);

    logger.debug('Loading vars from %s', options.varFile);
    appendEnvs(options.varFile, options.var);
    console.log('options.secret', options.var);

    // @todo matrix

    const planner = WorkflowPlanner.Collect(options.workflows, options.workflowRecurse);
    // collect all events from loaded workflows
    const { events } = planner;

    /** plan with filtered jobs - to be used for filtering only */
    let filterPlan: Plan;
    /** Determine the event name to be filtered */
    let filterEventName: string = '';

    if (options.event) {
      logger.info('Using chosed event for filtering: %s', options.event);
      filterEventName = options.event;
    } else if (events.length === 1 && events[0]) {
      logger.info('Using the only detected workflow event: %s', events[0]);
      [filterEventName] = events;
    } else if (options.detectEvent && events.length > 0 && events[0]) {
      // set default event type to first event from many available
      // this way user dont have to specify the event.
      logger.info('Using first detected workflow event for filtering: %s', events[0]);
      [filterEventName] = events;
    }

    if (options.job) {
      logger.info('Preparing plan with a job: %s', options.job);
      filterPlan = planner.planJob(options.job);
    } else if (filterEventName) {
      logger.info('Preparing plan for a event: %s', filterEventName);
      filterPlan = planner.planEvent(filterEventName);
    } else {
      logger.info('Preparing plan with all jobs');
      filterPlan = planner.planAll();
    }

    if (options.list) {
      return listOption(filterPlan);
    }

    if (options.graph) {
      return graphOption(filterPlan);
    }
    console.log('filterEventName', filterEventName);
    console.log('first', eventName);

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

    // Artifact Server
    if (options.artifactServerPath) {
      const artifact = new Artifact(options.artifactServerPath, options.artifactServerAddr, options.artifactServerPort);
      logger.debug('Artifact Server address:', await artifact.serve());
    }
    // Artifact Cache Server
    const cacheURLKey = 'ACTIONS_CACHE_URL';
    if (options.cacheServer && !options.env[cacheURLKey]) {
      const artifactCache = new ArtifactCache(options.cacheServerPath, options.cacheServerAddr, options.cacheServerPort);
      const artifactCacheServeURL = await artifactCache.serve();
      logger.debug('Artifact Cache Server address:', artifactCacheServeURL);
      options.env[cacheURLKey] = artifactCacheServeURL;
    }

    // run the plan

    process.exit();
  });
