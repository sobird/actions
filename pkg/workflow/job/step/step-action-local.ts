/**
 * step local action
 *
 * sobird<i@sobird.me> at 2024/10/15 22:13:49 created.
 */

import Executor from '@/pkg/common/executor';
import Action from '@/pkg/runner/action';

import StepAction from './step-action';

class StepActionLocal extends StepAction {
  action?: Action;

  public pre() {
    return new Executor(async () => {
      this.action = await Action.Scan(this.uses || '');
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
