/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import os from 'node:os';
import path from 'node:path';

import type { Config } from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
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
    this.context = new Context();
  }

  executor() {
    return new Executor(async () => {
      await asyncFunction(500);
      // todo
      console.log('jobId', this.run.jobId);
      console.log('jobName', this.run.name);
      console.log('workflow file:', this.run.workflow.file);
      this.run.workflow.on.push = 123;
      console.log('workflow sha:', this.run.workflow.sha);
      // console.log('workflow jobs:', this.run.workflow.jobs);
    });
  }

  get token() {
    return this.context.github.token;
  }

  get actionCacheDir() {
    return this.config.actionCache?.dir || path.join(os.tmpdir(), 'actions');
  }

  clone() {
    const cloned = structuredClone(this);
    console.log('this', this);
  }
}

export default Runner;
