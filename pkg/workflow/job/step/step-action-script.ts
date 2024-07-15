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

      this.setupEnv(runner);
    });
  }

  public post() {
    return new Executor(() => {});
  }

  setupEnv(runner: Runner) {
    this.mergeEnv(runner);
  }

  mergeEnv(runner: Runner) {
    const { job } = runner.run;
    const { container } = job;
    if (container) {
      runner.assign(this.#env, runner.env, container.env?.evaluate(runner) || {});
    } else {
      runner.assign(this.#env, runner.env);
    }

    Object.assign(this.#env, runner.context.github.Env);
  }
}

export default StepActionScript;
