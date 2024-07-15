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
      context.updateStepResult(id, {
        outcome: 'success',
        conclusion: 'success',
        outputs: {},
      });

      this.setupEnv(runner);

      // todo job status and step conclusion
      const enabled = this.if.evaluate(runner);
      console.log('enabled', enabled);

      console.log('runner', this.#env);

      if (!enabled) {
        context.updateStepResult(id, {
          outcome: 'skipped',
          conclusion: 'skipped',
        });
        // todo: log result
      }

      const stepName = this.getName(runner);
      console.log('stepName:', stepName);

      // Prepare and clean Runner File Commands
    });
  }

  public post() {
    return new Executor(() => {});
  }

  setupEnv(runner: Runner) {
    this.mergeEnv(runner);
    // step env
    runner.assign(this.#env, this.getEnv(runner));
  }

  mergeEnv(runner: Runner) {
    const { job } = runner.run;
    const { container } = job;
    if (container) {
      runner.assign(this.#env, runner.Env, container.env?.evaluate(runner) || {});
    } else {
      runner.assign(this.#env, runner.Env);
    }

    Object.assign(this.#env, runner.context.github.Env);
  }
}

export default StepActionScript;
