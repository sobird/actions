/**
 * Run workflows
 *
 * sobird<i@sobird.me> at 2024/05/17 5:25:33 created.
 */

/* eslint-disable no-console */

import { Command } from '@commander-js/extra-typings';
import log4js from 'log4js';

import WorkflowPlanner, { Plan } from '@/pkg/workflow/planner';

import { bugReportOption } from './bugReportOption';
import { graphOption } from './graphOption';
import { listOption } from './listOption';

const logger = log4js.getLogger();

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
  .option('-l, --list', 'list workflows')
  .option('-g, --graph', 'draw workflows', false)
  .option('-j, --job <job>', 'run a specific job ID')
  .option('--bug-report', 'Display system information for bug report', false)
  .option('-E, --event <event>', 'run a event name')
  .option('-W, --workflows <path>', 'path to workflow file(s)', './.github/workflows/')
  .option('-C, --directory <directory>', 'working directory', '.')
  .option('--no-workflowRecurse', "Flag to disable running workflows from subdirectories of specified path in '--workflows'/'-W' option")
  .option('--detect-event', 'Use first event type from workflow as event that triggered the workflow')
  .option('-p, --pull', 'pull docker image(s) even if already present')
  .option('--rebuild', 'rebuild local action docker image(s) even if already present')
  .option('--json', 'Output logs in json format')
  .option('--env <env>', 'env to make available to actions with optional value (e.g. --env myenv=foo,other=bar)', collectObject, {})
  .option('--env-file <envfile>', 'environment file to read and use as env in the containers', '.env')
  .option('-s --secret <secret>', 'secret to make available to actions with optional value (e.g. --secret mysecret=foo,toke=bar)', collectObject, {})
  .option('--insecure-secrets', "NOT RECOMMENDED! Doesn't hide secrets while printing logs")
  .option('--privileged', 'use privileged mode')
  .option('--userns <userns>', 'user namespace to use')
  .option('--container-architecture <arch>', 'Architecture which should be used to run containers, e.g.: linux/amd64. If not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.')
  .option('--container-daemon-socket <socket>', 'Path to Docker daemon socket which will be mounted to containers', '/var/run/docker.sock')
  .option('--use-gitignore', 'Controls whether paths specified in .gitignore should be copied into container')
  .option('--container-cap-add <cap...>', 'kernel capabilities to add to the workflow containers (e.g. --container-cap-add SYS_PTRACE)', collectArray, [])
  .option('--container-cap-drop <drop...>', 'kernel capabilities to remove from the workflow containers (e.g. --container-cap-drop SYS_PTRACE)', collectArray, [])
  .option('--container-opts <opts>', 'container options')
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
  .action(async (options, program) => {
    const version = program.parent?.version();
    if (options.bugReport) {
      return bugReportOption(version);
    }

    console.log('version', version);
    console.log('options', options);
    const planner = WorkflowPlanner.Collect(options.workflows, options.workflowRecurse);
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
  });
