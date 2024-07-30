/* eslint-disable class-methods-use-this */
import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import ActionCommandFile from '@/pkg/runner/action/command/file';
import { withTimeout } from '@/utils';

import Step from './step';

export enum StepActionStage {
  Pre,
  Main,
  Post,
}

abstract class StepAction extends Step {
  #env: Record<string, string> = {};

  public pre() {
    return new Executor(() => {});
  }

  public abstract main(): Executor;
  public post() {
    return new Executor(() => {});
  }

  // executor
  public executor(main: Executor) {
    return new Executor(async (ctx) => {
      console.log('step actions ctx', ctx);
      const { runner } = ctx!;
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

      const timeoutMinutes = Number(this['timeout-minutes'].evaluate(runner)) || 60;

      await withTimeout(main.execute(ctx), timeoutMinutes * 60 * 1000);

      await actionCommandFile.process();

      console.log('runner', runner.prependPath);
    });
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

export default StepAction;
