/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import os from 'node:os';
import path from 'node:path';

import Constants from '@/pkg/common/constants';
import type { Config } from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import lodash, { asyncFunction, createSafeName, assignIgnoreCase } from '@/utils';

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

  constructor(public run: Run, public config: Config) {
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
    const jobExecutor = job.executor(this);

    // console.log('runner executor start:', workflow.jobs);

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

  // get env() {
  //   const { job, workflow } = this.run;

  //   return { ...this.config.env, ...workflow.env, ...job.env };
  // }

  get env() {
    const { job, workflow } = this.run;
    const env = { ...workflow.env.evaluate(this), ...job.env.evaluate(this), ...this.config.env };
    this.context.env = env;
    return env;
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
    if (this.config.container.networkMode) {
      return [this.config.container.networkMode, false];
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

  get assign() {
    return this.container?.isCaseSensitive ? Object.assign : assignIgnoreCase;
  }

  githubEnv() {
    const { context } = this;
    const env: Record<string, string> = {};
    const github = lodash.omit(context.github, ['token', 'secret_source', 'repositoryUrl', 'event', 'action_status', 'action_ref']);
    env.CI = 'true';
    env.GITHUB_ACTIONS = 'true';

    Object.keys(github).forEach((key) => {
      env[`GITHUB_${key.toUpperCase()}`] = github[key];
    });
    return env;
  }
}

export default Runner;
