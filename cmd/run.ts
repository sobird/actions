/**
 * Run workflows
 *
 * sobird<i@sobird.me> at 2024/05/17 5:25:33 created.
 */

import { Command } from '@commander-js/extra-typings';
import log4js from 'log4js';

import WorkflowPlanner, { Plan } from '@/pkg/workflow/planner';
import { printList } from '@/utils';

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

// function printList(plan) {
//   const header = {
//     jobID: 'Job ID',
//     jobName: 'Job name',
//     stage: 'Stage',
//     wfName: 'Workflow name',
//     wfFile: 'Workflow file',
//     events: 'Events',
//   };

//   const lineInfos = [];
//   const duplicateJobIDs = false;
//   // ... 其他变量初始化

//   // 收集作业信息并计算最大宽度
//   // ...

//   // 打印标题
//   console.log(
//     `%-${header.stage.length}s %-${header.jobID.length}s %-${header.jobName.length}s %-${header.wfName.length}s %-${header.wfFile.length}s %-${header.events.length}s`,
//     header.stage,
//     header.jobID,
//     header.jobName,
//     header.wfName,
//     header.wfFile,
//     header.events,
//   );

//   // 打印作业详细信息
//   lineInfos.forEach((line) => {
//     console.log(
//       `%-${stageMaxWidth}s %-${jobIDMaxWidth}s %-${jobNameMaxWidth}s %-${wfNameMaxWidth}s %-${wfFileMaxWidth}s %-${eventsMaxWidth}s`,
//       line.stage,
//       line.jobID,
//       line.jobName,
//       line.wfName,
//       line.wfFile,
//       line.events,
//     );
//   });

//   if (duplicateJobIDs) {
//     console.log('\nDetected multiple jobs with the same job name, use `-W` to specify the path to the specific workflow.\n');
//   }
// }

async function optionList(planner: WorkflowPlanner, options: ReturnType<typeof runCommand.opts>) {
  // plan with filtered jobs - to be used for filtering only
  let filterPlan: Plan;
  // Determine the event name to be filtered
  let filterEventName:string = '';

  if (options.event) {
    logger.info('Using chosed event for filtering: %s', options.event);
    filterEventName = options.event;
  } else if (options.detectEvent) {
    // collect all events from loaded workflows
    const events = planner.events();

    logger.info('Using first detected workflow event for filtering: %s', events[0]);

    filterEventName = events[0];
  }

  if (options.job) {
    logger.info('Preparing plan with a job: %s', options.job);
  } else if (filterEventName) {
    //
  } else {
    logger.info('Preparing plan with all jobs');
    filterPlan = planner.planAll();
  }

  const header = {
    stage: 'Stage',
    jobId: 'Job ID',
    jobName: 'Job name',
    wfName: 'Workflow name',
    wfFile: 'Workflow file',
    events: 'Events',
  };
  const data: Record<string, unknown>[] = [];

  filterPlan.stages.forEach((stage, index) => {
    stage.runs.forEach((run) => {
      const { jobId, job } = run;
      data.push({
        stage: index,
        jobId,
        jobName: job.name,
        wfName: '',
        wfFile: '',
        events: '',
      });
    });
  });

  printList(data, header);
}

export const runCommand = new Command('run')
  .description('Run GitHub actions locally by specifying the event name (e.g. `push`) or an action name directly.')
  .option('-l, --list', 'list workflows')
  .option('-j, --job <job>', 'run a specific job ID')
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
    console.log('version', version);
    console.log('options', options);
    const planner = WorkflowPlanner.Collect(options.workflows, options.workflowRecurse);

    if (options.list) {
      return optionList(planner, options);
    }
    //
  });
