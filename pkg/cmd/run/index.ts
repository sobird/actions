/* eslint-disable no-param-reassign */
/**
 * Run workflows
 *
 * sobird<i@sobird.me> at 2024/05/17 5:25:33 created.
 */

import os from 'node:os';
import path from 'node:path';

import { Command } from '@commander-js/extra-typings';
import ip from 'ip';
import log4js from 'log4js';

import { Config } from '@/pkg';
import WorkflowPlanner from '@/pkg/workflow/planner';

import { bugReportOption } from './bugReportOption';
import { graphOption } from './graphOption';
import { listOption } from './listOption';

const logger = log4js.getLogger();

const ACTIONS_HOME = path.join(os.homedir(), '.actions');

function collectArray(value: string, previous: string[] = []) {
  return previous.concat(value.split(','));
}

function collectObject(value: string, previous: Record<string, string>) {
  const options: Record<string, string> = {};
  const pairs = value.split(',');
  for (const pair of pairs) {
    const [key, val] = pair.split('=');
    if (key) {
      options[key] = val;
    }
  }
  return {
    ...previous,
    ...options,
  };
}

function collectMatrix(value: string, previous: Record<string, unknown[]> = {}) {
  const pairs = value.split(':');

  if (pairs.length < 2) {
    logger.fatal('Invalid matrix format. Failed to parse %s', value);
  }

  previous[pairs[0]] = [...new Set(previous[pairs[0]] || []).add(pairs[1])];

  return previous;
}

export type Options = ReturnType<typeof runCommand.opts>;
type RunOptions = Options & {
  config: string
};

export const runCommand = new Command('run')
  .description('run workflow locally')
  // run a event name
  .arguments('[eventName]')
  // workflows
  .option('-W, --workflows <path>', 'path to workflow file(s)', './.github/workflows/')
  .option('--no-recursive', "flag to disable running workflows from subdirectories of specified path in '--workflows'/'-W' option")
  .option('-l, --list', 'list workflows')
  .option('-g, --graph', 'draw workflows')
  .option('-j, --job <string>', 'run a specific job ID')
  .option('-a, --actor <string>', 'the username of the user that triggered the initial workflow run', os.userInfo().username || 'actor')
  .option('--remote-name <string>', 'git remote name that will be used to retrieve url of git repo', 'origin')
  .option('--default-branch <string>', 'the name of the main branch', 'master')
  // .option('-E, --event <event>', 'run a event name')
  .option('-e --event-file <path>', 'path to event JSON file', 'event.json')
  .option('--detect-event', 'use first event type from workflow as event that triggered the workflow')
  .option('--workspace <path>', "The parent directory of a job's working directory.")
  .option('-w, --workdir <path>', 'the default working directory on the runner for steps', '.')
  .option('--no-bind-workdir', 'bind working directory to container, rather than copy')

  // log
  .option('--log-json', 'output logs in json format')
  .option('--log-prefix-job-id', 'output the job id within non-json logs instead of the entire name')
  .option('--no-log-output', 'disable logging of output from steps')

  .option('--token <token>', 'if you want to use private actions on GitHub, you have to set personal access token')
  .option('--env <envs...>', 'env to make available to actions with optional value (e.g. --env myenv=foo,other=bar)', collectObject, {})
  .option('--env-file <path>', 'environment file to read and use as env in the containers', '.env')
  .option('--vars <vars...>', 'variable to make available to actions with optional value (e.g. --vars myvar=foo or --var myvar)', collectObject, {})
  .option('--vars-file <path>', 'file with list of vars to read from (e.g. --vars-file .vars)', '.vars')
  .option('--inputs <inputs...>', 'action inputs to make available to actions (e.g. --inputs myinput=foo)', collectObject, {})
  .option('--inputs-file <path>', 'inputs file to read and use as action inputs', '.inputs')
  .option('--secrets <secrets...>', 'secret to make available to actions with optional value (e.g. --secrets mysecret=foo,toke=bar)', collectObject, {})
  .option('--secrets-file <path>', 'file with list of secrets to read from (e.g. --secrets-file .secrets)', '.secrets')

  .option('--matrix <list...>', 'specify which matrix configuration to include (e.g. --matrix java:13 node:20 node:18', collectMatrix, {})
  .option('--insecure-secrets', "NOT RECOMMENDED! Doesn't hide secrets while printing logs")
  .option('--no-use-gitignore', 'controls whether paths specified in .gitignore should be copied into container')
  .option('--no-skip-checkout', 'do not skip actions/checkout')
  .option('--server-instance <url>', 'server instance to use')

  // actions/cache server
  .option('--no-cache-server', 'disable cache server')
  .option('--cache-server-path <path>', 'defines the path where the cache server stores caches.', path.join(ACTIONS_HOME, 'artifact', 'cache'))
  .option('--cache-server-addr <addr>', 'defines the address to which the cache server binds.', ip.address())
  .option('--cache-server-port <port>', 'defines the port where the artifact server listens. 0 means a randomly available port.', (value: string) => { return Number(value); }, 0)

  // artifact server
  .option('--artifact-server-path <path>', 'defines the path where the artifact server stores uploads and retrieves downloads from. If not specified the artifact server will not start')
  .option('--artifact-server-addr <addr>', 'defines the address where the artifact server listens', ip.address())
  .option('--artifact-server-port <port>', 'defines the port where the artifact server listens (will only bind to localhost)', (value: string) => { return Number(value); })

  // action cache
  .option('--use-action-cache', 'enable using the new Action Cache for storing Actions locally')
  .option('--repositories <repositories...>', 'replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols)', collectObject)
  .option('--action-offline-mode', 'if action contents exists, it will not be fetch and pull again. If turn on this, will turn off force pull')
  .option('--action-cache-dir <dir>', 'defines the dir where the actions get cached and host workspaces created.', path.join(ACTIONS_HOME, 'actions'))
  .option('--action-instance <url>', 'defines the default url of action instance', 'https://github.com')

  // container
  .option('--labels <labels...>', 'custom image to use per platform (e.g. --labels ubuntu-latest=nektos/act-environments-ubuntu:18.04)', collectArray)
  .option('--image <image>', 'docker image to use. Use "-self-hosted" to run directly on the host')
  .option('--pull', 'pull docker image(s) even if already present')
  .option('--rebuild', 'rebuild local action docker image(s) even if already present')
  .option('--reuse', "don't remove container(s) on successfully completed workflow(s) to maintain state between runs")
  .option('--container-privileged', 'use privileged mode')
  .option('--container-auto-remove', 'automatically remove container(s)/volume(s) after a workflow(s) failure')
  .option('--container-userns-mode <userns>', 'user namespace to use')
  .option('--container-network <network>', 'specify the network to which the container will connect')
  .option('--container-platform <string>', 'platform which should be used to run containers, e.g.: linux/amd64. if not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.')
  .option('--container-daemon-socket <socket>', 'path to Docker daemon socket which will be mounted to containers')
  .option('--container-cap-add <cap...>', 'kernel capabilities to add to the workflow containers (e.g. --container-cap-add SYS_PTRACE)', collectArray)
  .option('--container-cap-drop <drop...>', 'kernel capabilities to remove from the workflow containers (e.g. --container-cap-drop SYS_PTRACE)', collectArray)
  .option('--container-options <string>', 'container options')

  .option('--watch', 'watch the contents of the local repo and run when files change')

  // debug
  .option('--bug-report', 'display system information for bug report')
  .option('-d, --debug', 'enable debug log')
  .option('-n, --dryrun', 'dryrun mode')
  .action(async (eventName, opts, program) => {
    const version = program.parent!.version();
    const appname = program.parent!.name();
    const options = program.optsWithGlobals<RunOptions>();
    const { runner } = Config.Load(options.config, appname);

    if (options.bugReport) {
      return bugReportOption(version);
    }

    const planner = await WorkflowPlanner.Collect(options.workflows, options.recursive);
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
      eventName = 'push';
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

    const deprecationWarning = '--%s is deprecated and will be removed soon, please switch to cli: --container-options "%s" or .actionsrc: { "containerOptions": "%s" }.';
    if (options.containerPrivileged) {
      logger.warn(deprecationWarning, 'privileged', '--privileged', '--privileged');
    }
    if (options.containerUsernsMode) {
      logger.warn(deprecationWarning, 'userns', `--userns=${options.containerUsernsMode}`, `--userns=${options.containerUsernsMode}`);
    }
    if (options.containerCapAdd) {
      logger.warn(deprecationWarning, 'container-cap-add', `--cap-add=${options.containerCapAdd.join(' ')}`, `--cap-add=${options.containerCapAdd.join(' ')}`);
    }
    if (options.containerCapDrop) {
      logger.warn(deprecationWarning, 'container-cap-drop', `--cap-drop=${options.containerCapDrop.join(' ')}`, `--cap-drop=${options.containerCapDrop.join(' ')}`);
    }
    console.log('options', options);
    await runner.options(options, eventName);
    const config = await runner.configure();
    await plan.executor(config).execute();
    process.exit();
  });
