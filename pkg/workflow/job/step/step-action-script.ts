import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import ActionCommandFile from '@/pkg/runner/action/command/file';
import { Step } from '@/pkg/runner/context/steps';

import StepAction from './step-action';

class StepActionScript extends StepAction {
  #env: Record<string, string> = {};

  public pre() {
    return new Executor(() => {});
  }

  public main(runner: Runner) {
    return new Executor(async () => {
      const { id } = this;
      const { context, IntraActionState } = runner;
      // set current step
      context.github.action = id;
      IntraActionState[id] = {};
      context.updateStepResult(id, {
        outcome: 'success',
        conclusion: 'success',
        outputs: {},
      });

      const actionCommandFile = new ActionCommandFile(runner);

      await actionCommandFile.initialize(this.uuid);

      this.setupEnv(runner);

      // todo job status and step conclusion
      const enabled = this.if.evaluate(runner);
      console.log('enabled', enabled);

      console.log('step env', this.#env);
      console.log('github env', runner.context.env);

      if (!enabled) {
        context.updateStepResult(id, {
          outcome: 'skipped',
          conclusion: 'skipped',
        });
        // todo: log result
      }

      const stepName = this.getName(runner);
      console.log('stepName:', stepName, IntraActionState);

      // Prepare and clean Runner File Commands
      const outputFileCommand = `set_output_${this.uuid}`;
      console.log('outputFileCommand', outputFileCommand, runner.directory('Actions'));

      await actionCommandFile.process();

      console.log('runner', runner.prependPath);
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
