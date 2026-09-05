/**
 * Run workflows
 *
 * sobird<i@sobird.me> at 2024/05/17 5:25:33 created.
 */

import os from 'node:os';
import path from 'node:path';

import { Command, Option } from 'commander';
import ip from 'ip';

import Git from '@/common/git';
import logger from '@/common/logger';
import { getConfig } from '@/config';
import { Docker } from '@/docker';
import Labels from '@/labels';
import Runner from '@/runner';
import ActionCache from '@/runner/action/cache';
import ActionCacheOffline from '@/runner/action/cache/offline';
import ActionCacheRepository from '@/runner/action/cache/repository';
import Config from '@/runner/config';
import Context from '@/runner/context';
import { readConfSync, generateId, readJsonSync } from '@/utils';
import WorkflowPlanner from '@/workflow/planner';

import { bugReportOption } from './bugReportOption';
import { graphOption } from './graphOption';
import { listOption } from './listOption';

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
    logger.error('Invalid matrix format. Failed to parse %s', value);
  }

  previous[pairs[0]] = [...new Set(previous[pairs[0]] || []).add(pairs[1])];

  return previous;
}

export type RunOptions = ReturnType<typeof runCommand.opts> & {
  config: string;
};

export const runCommand = new Command('run')
  .description('run workflow locally')
  .argument('[eventName]', 'run a specific event name (default: "push")')

  // workflows
  .option('-W, --workflows <path>', 'path to workflow file(s)', './.github/workflows/')
  .option(
    '--no-recursive',
    "flag to disable running workflows from subdirectories of specified path in '--workflows'/'-W' option",
  )
  .option('-l, --list', 'list workflows')
  .option('-g, --graph', 'draw workflows')
  .option('-j, --job <ident>', 'run a specific job ID')
  .option(
    '-a, --actor <string>',
    'the username of the user that triggered the initial workflow run',
    os.userInfo().username || 'actor',
  )
  .option('--remote-name <string>', 'git remote name that will be used to retrieve url of git repo', 'origin')
  .option('--default-branch <string>', 'the name of the main branch', 'master')
  .option('-e, --event-file <path>', 'path to event JSON file', 'event.json')
  .option('--detect-event', 'use first event type from workflow as event that triggered the workflow')
  .option('--workspace <path>', "The parent directory of a job's working directory.")
  .option('-w, --workdir <path>', 'the default working directory on the runner for steps', '.')
  .option('--bind-workdir', 'bind working directory to container, rather than copy')
  .addOption(new Option('--no-skip-checkout', 'do not skip actions/checkout').conflicts('bindWorkdir'))
  // log
  .option('--log-json', 'output logs in json format')
  .option('--log-prefix-job-id', 'output the job id within non-json logs instead of the entire name')
  // .option('--no-log-output', 'disable logging of output from steps')

  .option('--token <string>', 'if you want to use private actions on GitHub, you have to set personal access token')
  .option(
    '--env <pairs...>',
    'env to make available to actions with optional value (e.g. --env myenv=foo,other=bar)',
    collectObject,
  )
  .option('--env-file <path>', 'environment file to read and use as env in the containers')
  .option(
    '--vars <pairs...>',
    'variable to make available to actions with optional value (e.g. --vars myvar=foo or --var myvar)',
    collectObject,
  )
  .option('--vars-file <path>', 'file with list of vars to read from (e.g. --vars-file .vars)')
  .option(
    '--inputs <pairs...>',
    'action inputs to make available to actions (e.g. --inputs myinput=foo)',
    collectObject,
  )
  .option('--inputs-file <path>', 'inputs file to read and use as action inputs')
  .option(
    '--secrets <pairs...>',
    'secret to make available to actions with optional value (e.g. --secrets mysecret=foo,token=bar)',
    collectObject,
  )
  .option('--secrets-file <path>', 'file with list of secrets to read from (e.g. --secrets-file .secrets)')

  .option('--insecure-secrets', "NOT RECOMMENDED! Doesn't hide secrets while printing logs")
  .option('--no-use-gitignore', 'controls whether paths specified in .gitignore should be copied into container')
  .option('--server-instance <url>', 'server instance to use')
  .option('--action-instance <url>', 'the default url of action instance', 'https://github.com')

  // artifact cache server for actions/cache
  .option('--no-actions-cache', 'disable actions/cache server')
  .option(
    '--actions-cache-path <path>',
    'the path where the actions/cache server stores caches.',
    path.join(ACTIONS_HOME, 'artifact', 'cache'),
  )
  .option('--actions-cache-addr <addr>', 'the address to which the actions/cache server binds.', ip.address())
  .option(
    '--actions-cache-port <port>',
    'the port where the actions/cache server listens. 0 means a randomly available port.',
    (value: string) => {
      return Number(value);
    },
    0,
  )

  // artifact server
  .option(
    '--artifact-path <path>',
    'the path where the artifact server stores uploads and retrieves downloads from. If not specified the artifact server will not start',
    path.join(ACTIONS_HOME, 'artifact'),
  )
  .option('--artifact-addr <addr>', 'the address where the artifact server listens', ip.address())
  .option(
    '--artifact-port <port>',
    'the port where the artifact server listens (will only bind to localhost)',
    (value: string) => {
      return Number(value);
    },
  )

  // cache actions repository to local
  .option('--cache-actions', 'enable using the new cache actions for storing actions locally')
  .option('--actions-path <path>', 'the dir where the actions get cached', path.join(ACTIONS_HOME, 'actions'))
  .option(
    '--actions-offline',
    'if action contents exists, it will not be fetch and pull again. If turn on this, will turn off force pull',
  )
  .option(
    '--repositories <pairs...>',
    'replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/actions/test or test/test@v0=/home/actions/test, the latter matches any hosts or protocols)',
    collectObject,
  )

  // container
  .option(
    '--matrix <pairs...>',
    'specify which matrix configuration to include (e.g. --matrix java:13 node:20 node:18',
    collectMatrix,
    {},
  )
  .option(
    '--labels <pairs...>',
    'custom image to use per platform (e.g. --labels ubuntu-latest=gitea/runner-images:ubuntu-latest)',
    collectArray,
  )
  .option('--image <string>', 'docker image to use. Use "-self-hosted" to run directly on the host')
  .option('--hosted', 'run directly on the host')
  .option('--pull', 'pull docker image(s) even if already present')
  .option('--rebuild', 'rebuild local action docker image(s) even if already present')
  .option('--reuse', "don't remove container(s) on successfully completed workflow(s) to maintain state between runs")
  .option('--container-privileged', 'use privileged mode')
  .option('--container-auto-remove', 'automatically remove container(s)/volume(s) after a workflow(s) failure')
  .option('--container-userns-mode <string>', 'user namespace to use')
  .option('--container-network <string>', 'specify the network to which the container will connect')
  .option(
    '--container-platform <string>',
    'platform which should be used to run containers, e.g.: linux/amd64. if not specified, will use host default architecture. Requires Docker server API Version 1.41+. Ignored on earlier Docker server platforms.',
  )
  .option('--container-daemon-socket <path>', 'path to Docker daemon socket which will be mounted to containers')
  .option(
    '--container-cap-add <capabilities...>',
    'kernel capabilities to add to the workflow containers (e.g. --container-cap-add SYS_PTRACE)',
    collectArray,
  )
  .option(
    '--container-cap-drop <capabilities...>',
    'kernel capabilities to remove from the workflow containers (e.g. --container-cap-drop SYS_PTRACE)',
    collectArray,
  )
  .option('--container-options <string>', 'container options')

  // .option('--watch', 'watch the contents of the local repo and run when files change')
  .option('--bug-report', 'display system information for bug report')
  .option('-v, --verbose', 'verbose output')
  .option('-n, --dryrun', 'dryrun mode')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().verbose) {
      logger.level = 'debug';
    }
  })
  .action(async (eventName, opts, program) => {
    const version = program.parent!.version();
    const appname = program.parent!.name();
    const options = program.optsWithGlobals();

    const { runner } = getConfig(appname, {
      runner: options,
    });

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
      plan = await planner.planEvent(eventName);
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

    const deprecationWarning =
      '--%s is deprecated and will be removed soon, please switch to cli: --container-options "%s" or .actionsrc: { "containerOptions": "%s" }.';
    if (options.containerPrivileged) {
      logger.warn(deprecationWarning, 'privileged', '--privileged', '--privileged');
    }
    if (options.containerUsernsMode) {
      logger.warn(
        deprecationWarning,
        'userns',
        `--userns=${options.containerUsernsMode}`,
        `--userns=${options.containerUsernsMode}`,
      );
    }
    if (options.containerCapAdd) {
      logger.warn(
        deprecationWarning,
        'container-cap-add',
        `--cap-add=${options.containerCapAdd.join(' ')}`,
        `--cap-add=${options.containerCapAdd.join(' ')}`,
      );
    }
    if (options.containerCapDrop) {
      logger.warn(
        deprecationWarning,
        'container-cap-drop',
        `--cap-drop=${options.containerCapDrop.join(' ')}`,
        `--cap-drop=${options.containerCapDrop.join(' ')}`,
      );
    }

    // this.image = this.hosted ? SELF_HOSTED : this.image;

    // config
    const git = new Git(options.workdir);
    const author = await git.author();
    const repoInfo = await git.repoInfo();
    const ref = (await git.ref()) || '';

    const actor = options.actor || author || 'actor';
    const actor_id = generateId(actor);

    const sha = await git.revision();

    const repository_owner = repoInfo.owner || 'owner';
    const repository = `${repository_owner}/${repoInfo.name}`;
    const repository_id = generateId(repository);
    const repository_owner_id = generateId(repository_owner);
    const repositoryUrl = repoInfo.url;

    const userInfo = os.userInfo();

    const github = {
      actor,
      actor_id,
      api_url: 'https://api.github.com',
      graphql_url: 'https://api.github.com/graphql',
      repository,
      repository_id,
      repository_owner,
      repository_owner_id,
      repositoryUrl,
      retention_days: '0',
      server_url: 'https://github.com',
      event_name: eventName,
      event_path: runner.eventFile,
      sha,
      ref,
      triggering_actor: userInfo.username,
      token: runner.token,
      workspace: options.workdir,
    };

    const context = {
      github,
      secrets: { GITHUB_TOKEN: runner.token },
      env: {},
      vars: {},
      inputs: {},
    };

    Object.assign(runner.context, context);

    // configure

    try {
      const { socket, host } = Docker.SocketAndHost(runner.containerDaemonSocket);
      process.env.DOCKER_HOST = host;
      runner.containerDaemonSocket = socket;
      logger.info("Using docker host '%s', and daemon socket '%s'", host, socket);
    } catch (error) {
      logger.warn("Couldn't get a valid docker connection: %s", (error as Error).message);
    }

    if (process.platform === 'darwin' && process.arch === 'arm64' && !runner.containerPlatform) {
      logger.warn(
        " \u26d4 You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. \u26d4",
      );
    }

    logger.debug('Loading environment from %s', runner.envFile);
    Object.assign(runner.env, readConfSync(runner.envFile));
    Object.assign(runner.context.env, runner.env);

    logger.debug('Loading vars from %s', runner.varsFile);
    Object.assign(runner.vars, readConfSync(runner.varsFile));
    Object.assign(runner.context.vars, runner.vars);

    logger.debug('Loading secrets from %s', runner.secretsFile);
    Object.assign(runner.secrets, readConfSync(runner.secretsFile));
    Object.assign(runner.context.secrets, runner.secrets);

    logger.debug('Loading action inputs from %s', runner.inputsFile);
    Object.assign(runner.inputs, readConfSync(runner.inputsFile));
    Object.assign(runner.context.inputs, runner.inputs);

    logger.debug('Loading github event from %s', runner.eventFile);
    const event = readJsonSync(runner.eventFile ?? '');
    if (!event?.repository?.default_branch) {
      event.repository = event.repository || {};
      event.repository.default_branch = runner.defaultBranch;
    }

    // Object.assign(runner.context.github.event, event);

    // Cache Actions
    let actionCache;
    if (runner.cacheActions) {
      actionCache = runner.actionsOffline
        ? new ActionCacheOffline(runner.actionsPath)
        : new ActionCache(runner.actionsPath);
    }

    if (runner.repositories) {
      actionCache = new ActionCacheRepository(runner.actionsPath, runner.repositories);
    }

    const { platforms } = new Labels(runner.labels);

    const config: Config = {
      name: '', // @todo
      context: runner.context as unknown as Context,
      workspace: runner.workspace,
      workdir: path.resolve(options.workdir),
      bindWorkdir: runner.bindWorkdir,

      platforms,
      // remoteName: options.remoteName,

      useGitignore: runner.useGitignore,
      skipCheckout: runner.skipCheckout,
      serverInstance: options.serverInstance,
      actionInstance: options.actionInstance,
      replaceGheActionWithGithubCom: runner.replaceGheActionWithGithubCom,
      replaceGheActionTokenWithGithubCom: runner.replaceGheActionTokenWithGithubCom,

      // logger
      jobLoggerLevel: options.verbose ? 'debug' : 'info',
      // logJson: runner.logJson,
      // logOutput: runner.logOutput,
      // logPrefixJobID: runner.logPrefixJobId,
      insecureSecrets: options.insecureSecrets,

      // cache actions
      actionCache,

      // artifact server
      artifactPath: runner.artifactPath,
      artifactAddr: runner.artifactAddr,
      artifactPort: runner.artifactPort,

      // artifact cache for actions/cache
      actionsCache: runner.actionsCache,
      actionsCachePath: runner.actionsCachePath,
      actionsCacheAddr: runner.actionsCacheAddr,
      actionsCachePort: runner.actionsCachePort,
      actionsCacheExternal: runner.actionsCacheExternal,

      // container
      platformPicker: () => {
        return options.image;
      },
      matrix: options.matrix,
      pull: runner.pull,
      reuse: runner.reuse,
      rebuild: runner.rebuild,
      containerNamePrefix: `ACTIONS-TASK-${eventName}`,
      containerUsernsMode: runner.containerUsernsMode,
      containerPrivileged: runner.containerPrivileged,
      containerPlatform: runner.containerPlatform,
      containerCapAdd: runner.containerCapAdd,
      containerCapDrop: runner.containerCapDrop,
      containerMaxLifetime: runner.containerMaxLifetime,
      containerNetworkMode: runner.containerNetwork,
      containerAutoRemove: runner.containerAutoRemove,
      containerOptions: runner.containerOptions,
      containerDaemonSocket: runner.containerDaemonSocket,
    };

    Runner.serve(config);

    await plan.executor(config).execute();
    process.exit();
  });
