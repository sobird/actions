/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import os from 'node:os';
import path from 'node:path';

import Git from '@/pkg/common/git';
import type { Config } from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import WorkflowPlanner from '@/pkg/workflow/planner';
import { asyncFunction } from '@/utils';

import Executor from '../common/executor';
import { Run } from '../workflow/plan';

class Runner {
  context: Context;

  /**
   * the job calling this runner (caller of a reusable workflow)
   */
  caller?: Runner;

  constructor(public run: Run, public config: Readonly<Config>) {
    const { jobId, job, workflow } = run;
    this.context = new Context(config.context);

    // github context
    this.context.github.job = jobId;
    this.context.github.workflow = workflow.name || workflow.file || '';
    this.context.github.workflow_sha = workflow.sha || '';

    // strategy context
    this.context.strategy['fail-fast'] = job.strategy['fail-fast'];
    this.context.strategy['max-parallel'] = job.strategy['max-parallel'];
    this.context.strategy['job-index'] = job.index;
    this.context.strategy['job-total'] = job.total;

    // matrix context
    const matrix = job.strategy.getMatrices()[0];
    if (matrix) {
      this.context.matrix = matrix as Context['matrix'];
    }
  }

  executor() {
    const { job } = this.run;
    const jobExecutor = this.jobExecutor();

    return new Executor(async () => {
      await asyncFunction(500);
      // todo
      console.log('job name', job['runs-on'], this.context.matrix);
      console.log('workflow file:', this.run.workflow.file);
      console.log('workflow sha:', this.run.workflow.sha);

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
        console.log(`${this.run.name} - step:`, step.getName());
        console.log('step uses:', step.uses);

        await asyncFunction(250);
        console.log('');
      });
    });

    // return Executor.Parallel(1, new Executor(async () => {
    //   const entry = {
    //     data: [this.name],
    //     startTime: new Date(),
    //     context: {
    //       stage: '',
    //       jobResult: '',
    //       stepNumber: 0,
    //       raw_output: true,
    //       stepResult: '',
    //     },
    //   };

    //   reporter.resetSteps(this.steps.length);

    //   reporter.fire(entry);
    //   await asyncFunction(1000);

    //   for (const [index, step] of this.steps.entries()) {
    //     const entry = {
    //       data: [this.name, '-', step.name],
    //       startTime: new Date(),
    //       context: {
    //         stage: 'Main',
    //         jobResult: '',
    //         stepNumber: index,
    //         raw_output: true,
    //         stepResult: '',
    //       },
    //     };

    //     reporter.fire(entry);
    //     reporter.log(this.name, '-', step.name);
    //     // eslint-disable-next-line no-await-in-loop
    //     await asyncFunction(500);
    //     reporter.log(this.name, '-', step.name);
    //     await asyncFunction(500);
    //     console.log('index', index);
    //     reporter.fire({
    //       data: [this.name, '-', step.name],
    //       startTime: new Date(),
    //       context: {
    //         stage: 'Main',
    //         jobResult: '',
    //         stepNumber: index,
    //         raw_output: true,
    //         stepResult: 'success',
    //       },
    //     });
    //     await asyncFunction(500);
    //   }

    //   await asyncFunction(1000);
    //   reporter.fire({
    //     data: [this.name, 'post'],
    //     startTime: new Date(),
    //     context: {
    //       stage: 'Post',
    //       jobResult: 'success',
    //       // stepNumber: index,
    //       raw_output: true,
    //       stepResult: 'success',
    //     },
    //   });
    // }));

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
}

export default Runner;
