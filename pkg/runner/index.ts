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
    const { job } = run;
    this.context = new Context();

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
    return new Executor(async () => {
      await asyncFunction(500);
      // todo
      console.log('job name', this.run.name);
      console.log('workflow file:', this.run.workflow.file);
      console.log('workflow sha:', this.run.workflow.sha);
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
