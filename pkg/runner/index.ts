/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import os from 'node:os';
import path from 'node:path';

import Constants from '@/pkg/common/constants';
import Git from '@/pkg/common/git';
import type { Config } from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import WorkflowPlanner from '@/pkg/workflow/planner';
import { asyncFunction, createSafeName } from '@/utils';

import Container from './container';
import Executor from '../common/executor';
import { Run } from '../workflow/plan';

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

  echoOnActionCommand: boolean;

  constructor(public run: Run, public config: Readonly<Config>) {
    const { jobId, job, workflow } = run;
    const context = new Context(config.context);

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
    const matrix = job.strategy.getMatrices()[0];
    if (matrix) {
      context.matrix = matrix as Context['matrix'];
    }

    // Initialize 'echo on action command success' property, default to false, unless Step_Debug is set
    this.echoOnActionCommand = context.secrets[Constants.Variables.Actions.StepDebug]?.toLowerCase() === 'true' || context.vars[Constants.Variables.Actions.StepDebug]?.toLowerCase() === 'true' || false;

    this.context = context;
  }

  executor() {
    const { job, workflow } = this.run;
    const jobExecutor = this.jobExecutor();

    console.log('runner executor start:', process.argv[1]);

    return new Executor(async () => {
      if (!this.enabled) {
        return;
      }

      await asyncFunction(500);

      console.log('job', job === Object.entries(workflow.jobs)[0][1]);
      // todo
      console.log('workflow run-name', workflow['run-name'].evaluate(this));
      console.log('workflow concurrency', workflow.concurrency.evaluate(this));
      console.log('job runs-on', job['runs-on'].evaluate(this), job.runsOn(this));
      console.log('workflow file:', this.run.workflow.file);
      console.log('workflow sha:', this.run.workflow.sha);

      console.log('job container image:', job.container.image.evaluate(this));

      await jobExecutor.execute();
    });
  }

  jobExecutor() {
    const usesExecutor = this.usesExecutor();
    if (usesExecutor) {
      return usesExecutor;
    }
    const { job } = this.run;
    // job executor
    if (!job.steps || job.steps.length === 0) {
      return Executor.Debug('No steps found');
    }

    const preStepsExecutor: Executor[] = [];
    const stepsExecutor: Executor[] = [];

    stepsExecutor.push(new Executor(() => {
      // logger.info('u0001F9EA  Matrix: %v', this.config.matrix);
    }));

    preStepsExecutor.push(new Executor(() => {
      // logger.info('Todo:', 'Job env Interpolate');
    }));

    const jobStepsPipeline = job.steps.map((step, index) => {
      // eslint-disable-next-line no-param-reassign
      step.id = step.id || String(index);
      // eslint-disable-next-line no-param-reassign
      step.number = index;

      return new Executor(async () => {
        console.log('step if:', step.if.evaluate(this));

        console.log(`${this.run.name} - step:`, step.getName(this));
        console.log('step uses:', step.uses);
        console.log('step env:', step.getEnv(this));
        console.log('step with:', step.with.evaluate(this));

        await asyncFunction(250);
        console.log('');
      });
    });

    return Executor.Pipeline(...jobStepsPipeline);
  }

  usesExecutor() {
    let { uses = '' } = this.run.job;
    // 无效的job uses
    if (!/\.(ya?ml)(?:$|@)/.exec(uses)) {
      return;
    }

    const reusable = {
      url: '',
      repository: '',
      filename: '',
      ref: '',
    };

    const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);
    if (matches) {
      const { server_url: serverUrl, sha } = this.context.github;
      const [,url = serverUrl, owner, repo, filename, ref = sha] = matches;
      reusable.url = url;
      reusable.repository = `${owner}/${repo}`;
      reusable.filename = filename;
      reusable.ref = ref;
    }

    // local reusable workflow
    if (uses.startsWith('./')) {
      uses = uses.substring(2);
      if (this.config.skipCheckout) {
        return this.reusableWorkflowExecutor(uses);
      }
      // remote resuable workflow
      const { repository, sha, server_url: serverUrl } = this.context.github;
      reusable.url = serverUrl;
      reusable.repository = repository;
      reusable.filename = uses;
      reusable.ref = sha;
    }

    const repositoryDir = path.join(this.actionCacheDir, reusable.repository, reusable.ref);
    const url = new URL(reusable.repository, reusable.url);

    if (this.token) {
      url.username = 'token';
      url.password = this.token;
    }
    const workflowpath = path.join(repositoryDir, reusable.filename);
    return Git.CloneExecutor(url.toString(), repositoryDir, reusable.ref).next(this.reusableWorkflowExecutor(workflowpath));
  }

  private reusableWorkflowExecutor(workflowPath: string) {
    return new Executor(async () => {
      const workflowPlanner = await WorkflowPlanner.Collect(workflowPath);
      const plan = workflowPlanner.planEvent('workflow_call');
      await plan.executor(this.config, this).execute();
    });
  }

  get token() {
    return this.context.github.token;
  }

  get actionCacheDir() {
    return this.config.actionCache?.dir || path.join(os.tmpdir(), 'actions');
  }

  clone() {
    // const cloned = structuredClone(this);
    console.log('this', this);
  }

  get env() {
    const { job, workflow } = this.run;

    return { ...this.config.env, ...workflow.env, ...job.env };
  }

  private generateContainerName(id?: string) {
    const { workflow } = this.run;
    const parts = [`WORKFLOW-${workflow.name || workflow.file}`, `JOB-${this.run.name}`];
    if (id) {
      parts.push(`ID-${id}`);
    }
    return createSafeName(...parts);
  }

  private generateNetworkName(id?: string) {
    const { jobId } = this.run;
    if (this.config.containerNetworkMode) {
      return [this.config.containerNetworkMode, false];
    }
    // 如未配置NetworkMode，则手动创建network
    return [`${this.generateContainerName(id)}-${jobId}-network`, true];
  }

  setJobContext(job: Context['job']) {
    //
  }

  output(message: string) {
    // todo something
    process.stdout.write(message + os.EOL);
  }

  get enabled() {
    const { job } = this.run;
    const jobIf = job.if.evaluate(this);

    if (!jobIf) {
      console.error(`Skipping job '${job.name}' due to '${job.if}'`);
      return false;
    }

    return true;
  }
}

export default Runner;
