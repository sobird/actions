/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import type { Config } from '@/pkg';
import Context from '@/pkg/runner/context';
import { asyncFunction } from '@/utils';

import Executor from '../common/executor';
import { Run } from '../workflow/plan';

class Runner {
  context: Context;

  caller?: Runner;

  constructor(public run: Run, public config?: Config) {
    this.context = new Context();
  }

  executor() {
    return new Executor(async () => {
      await asyncFunction(2000);
      // todo
      console.log('workflow file:', this.run.workflow.file);
      this.run.workflow.on.push = 123;
      console.log('workflow sha:', this.run.workflow.sha);
      // console.log('workflow jobs:', this.run.workflow.jobs);
    });
  }
}

export default Runner;
