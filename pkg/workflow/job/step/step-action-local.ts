/**
 * step local action
 *
 * sobird<i@sobird.me> at 2024/10/15 22:13:49 created.
 */

import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Action from '@/pkg/runner/action';

import StepAction from './step-action';

class StepActionLocal extends StepAction {
  action?: Action;

  public pre() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const actionDir = path.join(runner.config.workdir, this.uses || '');
      this.action = await Action.Scan(actionDir);
    });
  }

  public main() {
    return this.executor(new Executor(async () => {
      return this.action?.executor();
    }));
  }

  // public post() {
  //   return new Executor(() => {});
  // }
}

export default StepActionLocal;
