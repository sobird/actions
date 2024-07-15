import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import { Step } from '@/pkg/runner/context/steps';

import StepAction from './step-action';

class StepActionScript extends StepAction {
  #env: Record<string, string> = {};

  public pre() {
    return new Executor(() => {});
  }

  public main(runner: Runner) {
    return new Executor(() => {
      const { id } = this;
      const { context } = runner;
      context.github.action = id;
      context.steps[id] = {
        outcome: 'success',
        conclusion: 'success',
        outputs: {},
      };

      const res = runner.assign({}, { a: 1 });
      console.log('res', res);
    });
  }

  public post() {
    return new Executor(() => {});
  }

  mergeEnv(runner: Runner) {
    const { context } = runner;
    const env = this.getEnv(runner);
    const { job } = runner.run;
    const { container } = job;
    if (container) {
      runner.assign(runner.env, env, container.env?.evaluate(runner) || {});
    } else {
      runner.assign(runner.env, env);
    }
  }
}

export default StepActionScript;
