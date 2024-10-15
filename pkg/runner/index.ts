/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import os from 'node:os';
import path from 'node:path';

import log4js, { Logger } from 'log4js';

import Constants from '@/pkg/common/constants';
import { Docker } from '@/pkg/docker';
import Config from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import Strategy from '@/pkg/workflow/job/strategy';
import { asyncFunction, createSafeName, assignIgnoreCase } from '@/utils';

import Container from './container';
import DockerContainer from './container/docker';
import HostedContainer from './container/hosted';
import Executor from '../common/executor';
import Expression from '../expression';
import { Run } from '../workflow/plan';

const SetEnvBlockList = ['NODE_OPTIONS'];

class Runner {
  context: Context;

  /**
   * the job calling this runner (caller of a reusable workflow)
   */
  caller?: Runner;

  // addPath
  prependPath: string[] = [];

  globalEnv: Record<string, string> = {};

  container?: Container;

  services: Container[] = [];

  echoOnActionCommand: boolean;

  IntraActionState: Record<string, Record<string, string>> = {};

  masks: string[] = [];

  logger: Logger = log4js.getLogger();

  cleanContainerExecutor: Executor = new Executor();

  constructor(public run: Run, public config: Config) {
    const { jobId, job, workflow } = run;
    this.config = config;
    const context = new Context(config.context ?? {});
    this.context = context;

    // Calculate the value of the expression in advance
    const strategy = new Expression(job.strategy, ['github', 'needs', 'vars', 'inputs']).evaluate(this);
    job.strategy = new Strategy(strategy);

    // github context
    context.github.job = jobId;
    context.github.workflow = workflow.name || workflow.file || '';
    context.github.workflow_sha = workflow.sha || '';

    // strategy context
    context.strategy['fail-fast'] = job.strategy['fail-fast'];
    context.strategy['max-parallel'] = job.strategy['max-parallel'];
    context.strategy['job-index'] = job.index;
    context.strategy['job-total'] = job.total;

    // matrix context
    const matrix = job.strategy.Matrices[0];
    if (matrix) {
      context.matrix = matrix as Context['matrix'];
    }

    // Initialize 'echo on action command success' property, default to false, unless Step_Debug is set
    this.echoOnActionCommand = context.secrets[Constants.Variables.Actions.StepDebug]?.toLowerCase() === 'true' || context.vars[Constants.Variables.Actions.StepDebug]?.toLowerCase() === 'true' || false;
  }

  executor() {
    const { job, workflow } = this.run;
    const jobExecutor = job.executor(this);

    // console.log('runner executor start:', workflow.jobs);

    return new Executor(async () => {
      if (!this.Enabled) {
        return;
      }

      // await asyncFunction(100);

      console.log('start job:', this.run.name);

      console.log('job', job === Object.entries(workflow.jobs)[0][1]);
      // todo
      console.log('workflow run-name', workflow['run-name'].evaluate(this));
      console.log('workflow concurrency', workflow.concurrency.evaluate(this));
      console.log('job runs-on', job['runs-on'].evaluate(this), job.runsOn(this));
      console.log('workflow file:', this.run.workflow.file);
      console.log('workflow sha:', this.run.workflow.sha);

      console.log('job container image:', job.container.image.evaluate(this));

      await jobExecutor.execute(this);
    });
  }

  public startContainer() {
    const { IsHosted, context } = this;

    const JobContainer = IsHosted ? HostedContainer : DockerContainer;
    const executor = JobContainer.Setup(this);

    const workflowDirectory = path.join(Constants.Directory.Temp, '_github_workflow');
    return executor.next(new Executor(() => {
      const { event } = context.github;
      // set github context
      context.github.event_path = this.container!.resolve(workflowDirectory, 'event.json') || '';
      context.github.workspace = this.container!.resolve(this.config.workdir);

      return this.container?.putContent(workflowDirectory, {
        name: 'event.json',
        mode: 0o644,
        body: JSON.stringify(event),
      });
    }));
  }

  public stopContainer() {
    return new Executor(() => {
      return this.cleanContainerExecutor;
    });
  }

  public pullServicesImage(force?: boolean) {
    return new Executor(() => {
      const pipeline = this.services.map((item) => {
        return item.pullImage(force);
      });
      return Executor.Parallel(pipeline.length, ...pipeline);
    });
  }

  public startServices() {
    return new Executor(() => {
      const pipeline = this.services.map((item) => {
        return item.start();
      });
      return Executor.Parallel(pipeline.length, ...pipeline);
    });
  }

  public stopServices() {
    return new Executor(() => {
      const pipeline = this.services.map((item) => {
        return item.remove();
      });
      return Executor.Parallel(pipeline.length, ...pipeline);
    });
  }

  get Credentials() {
    const { container } = this.run.job;
    const { DOCKER_USERNAME: username, DOCKER_PASSWORD: password } = this.context.secrets;
    // const username = this.context.secrets.DOCKER_USERNAME;
    // const password = this.context.secrets.DOCKER_PASSWORD;
    const credentials = container.credentials?.evaluate(this);

    return {
      username,
      password,
      ...credentials,
    };
  }

  // DockerContainer Utils
  get BindsAndMounts(): [string[], Record<string, string>] {
    const containerName = this.ContainerName();
    const defaultSocket = '/var/run/docker.sock';
    const containerDaemonSocket = this.config.containerDaemonSocket || defaultSocket;
    const binds: string[] = [];
    if (containerDaemonSocket !== '-') {
      const daemonPath = Docker.SocketMountPath(containerDaemonSocket);
      binds.push(`${daemonPath}:${defaultSocket}`);
    }

    const ToolCacheMount = 'toolcache';
    const NameMount = `${containerName}-env`;

    const containerWorkdir = DockerContainer.Resolve(this.config.workdir);

    const mounts = {
      [ToolCacheMount]: DockerContainer.Resolve(this.config.workspace, Constants.Directory.Tool),
      [NameMount]: DockerContainer.Resolve(this.config.workspace, Constants.Directory.Temp),
    };

    const { volumes = [] } = this.run.job.container;
    volumes.forEach((volume) => {
      if (!volume.includes(':') && path.isAbsolute(volume)) {
        binds.push(volume);
      } else {
        const [key, value] = volume.split(':');
        mounts[key] = value;
      }
    });

    if (this.config.bindWorkdir) {
      let bindModifiers = '';
      if (process.platform === 'darwin') {
        bindModifiers = ':delegated';
      }
      binds.push(`${this.config.workdir}:${containerWorkdir}${bindModifiers}`);
    } else {
      mounts[containerName] = containerWorkdir;
    }

    return [binds, mounts];
  }

  ServiceBindsAndMounts(volumes: string[] = []): [string[], Record<string, string>] {
    const defaultSocket = '/var/run/docker.sock';
    const containerDaemonSocket = this.config.containerDaemonSocket || defaultSocket;
    const binds: string[] = [];
    if (containerDaemonSocket !== '-') {
      const daemonPath = Docker.SocketMountPath(containerDaemonSocket);
      binds.push(`${daemonPath}:${defaultSocket}`);
    }

    const mounts: Record<string, string> = {};

    volumes.forEach((volume) => {
      if (!volume.includes(':') || path.isAbsolute(volume)) {
        binds.push(volume);
      } else {
        const [key, value] = volume.split(':');
        mounts[key] = value;
      }
    });

    return [binds, mounts];
  }

  get Token() {
    return this.context.github.token;
  }

  get ActionCacheDir() {
    return this.config.actionCache?.dir || path.join(os.tmpdir(), 'actions');
  }

  clone() {
    // const cloned = structuredClone(this);
    console.log('this', this);
  }

  // get env() {
  //   const { job, workflow } = this.run;

  //   return { ...this.config.env, ...workflow.env, ...job.env };
  // }

  /**
   * @priority
   * ...workflow.env, ...job.env, ...config.env
   */
  get Env() {
    const { job, workflow } = this.run;
    const env = { ...workflow.env.evaluate(this), ...job.env.evaluate(this), ...job.container.env?.evaluate(this) };
    if (this.config.skipCheckout) {
      env.ACTIONS_SKIP_CHECKOUT = 'true';
    }

    this.Assign(this.context.env, env);
    return this.context.env;
  }

  /**
   * ...workflow.defaults, ...job.defaults
   */
  get Defaults() {
    const { job, workflow } = this.run;
    return { ...workflow.defaults, ...job.defaults };
  }

  ContainerName(id?: string) {
    const { workflow } = this.run;
    const parts = [`WORKFLOW-${workflow.name || workflow.file}`, `JOB-${this.run.name}`];
    if (id) {
      parts.push(`ID-${id}`);
    }
    return createSafeName(...parts);
  }

  ContainerNetworkName(id?: string): [string, boolean] {
    const { jobId } = this.run;
    if (this.config.containerNetworkMode) {
      return [this.config.containerNetworkMode, false];
    }
    // 如未配置NetworkMode，则手动创建network
    return [`${this.ContainerName(id)}-${jobId}-network`, true];
  }

  setJobContext(job: Context['job']) {
    //
  }

  output(message: string) {
    // todo something
    process.stdout.write(message + os.EOL);
  }

  get Enabled() {
    const { job } = this.run;
    const jobIf = job.if.evaluate(this);

    if (!jobIf) {
      console.error(`Skipping job '${job.name}' due to '${job.if}'`);
      return false;
    }

    return true;
  }

  get Assign() {
    return this.container?.isCaseSensitive ? Object.assign : assignIgnoreCase;
  }

  get EnhancedAnnotationsEnabled() {
    return !!this.context.vars['DistributedTask.EnhancedAnnotations'];
  }

  get IsHosted() {
    const platform = this.RunsOnImage;
    const image = this.ContainerImage;

    return image === '' && platform?.toLowerCase() === '-self-hosted';
  }

  // job container image
  get PlatformImage() {
    const { ContainerImage } = this;
    if (ContainerImage) {
      return ContainerImage;
    }
    return this.RunsOnImage;
  }

  get ContainerImage() {
    return this.run.job.container.image.evaluate(this) || '';
  }

  get RunsOnImage() {
    const runsOn = this.run.job.runsOn(this);

    let image = this.config.platformPicker?.(runsOn);

    if (image) {
      return image;
    }

    image = runsOn.find((item) => {
      return this.config.platforms.get(item.toLowerCase());
    });

    if (image) {
      return this.config.platforms.get(image);
    }

    return '';
  }

  // action command
  saveState(key: string, value: string) {
    const { action } = this.context.github;

    if (this.caller) {
      // todo
    } else if (action) {
      this.IntraActionState[action][key] = value;
    }
    console.debug(`Save intra-action state ${key} = ${value}`);
  }

  setOutput(key: string, value: string) {
    const { action } = this.context.github;
    if (action) {
      this.context.steps[action].outputs[key] = value;
    }
  }

  setEnv(key: string, value: string) {
    if (SetEnvBlockList.includes(key.toUpperCase())) {
      console.log(`Can't update ${key} environment variable using set-env command.`);
      // AddIssue
      return;
    }

    this.assign(this.context.env, { [key]: value });
    this.assign(this.globalEnv, { [key]: value });
  }

  addPath(value: string) {
    const extraPath = [value];
    for (const v of this.prependPath) {
      if (v !== value) {
        extraPath.push(v);
      }
    }
    this.prependPath = extraPath;
  }

  addMask(value: string) {
    if (!value) {
      console.warn("Can't add secret mask for empty string in ##[add-mask] command.");
      return;
    }

    if (this.echoOnActionCommand) {
      console.log('::add-mask::***');
    }

    const masks = value.split(/[\r\n]/).filter((item) => { return Boolean(item.trim()); });

    this.masks.push(...masks);
  }
}

export default Runner;
