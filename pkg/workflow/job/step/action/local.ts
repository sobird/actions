/**
 * Step Action Local
 *
 * sobird<i@sobird.me> at 2024/10/15 22:13:49 created.
 */

import path from 'node:path';

import Executor from '@/pkg/common/executor';

import StepAction from '.';

class StepActionLocal extends StepAction {
  // `pre` execution is not supported for local action from './.github/actions/hello-world-javascript-action'
  public pre() {
    return new Executor(async (ctx) => {

    });
  }

  public main() {
    return this.executor(new Executor(async (ctx) => {
      const runner = ctx!;
      const actionDir = path.join(runner.config.workdir, this.uses.path);
      await this.LoadAction(actionDir).execute(ctx);

      console.log('this.action', this.action);

      return this.action?.Main;
    }));
  }

  // public post() {
  //   return new Executor(() => {});
  // }
}

export default StepActionLocal;
