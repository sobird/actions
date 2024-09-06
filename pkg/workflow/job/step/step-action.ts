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
      const runner = ctx!;

      const { id } = this;
      const { context, IntraActionState } = runner;
      // set current step
      context.github.action = id;
      IntraActionState[id] = {};
      context.StepResult = {
        outcome: 'success',
        conclusion: 'success',
        outputs: {},
      };

      const actionCommandFile = new ActionCommandFile(runner);

      await actionCommandFile.initialize(this.uuid);

      this.setupEnv(runner);

      try {
        const enabled = this.if.evaluate(runner);

        if (!enabled) {
          context.StepResult = {
            outcome: 'skipped',
            conclusion: 'skipped',
          };
          return;
        }
      } catch (err) {
        context.StepResult = {
          outcome: 'failure',
          conclusion: 'failure',
        };
        throw err;
      }

      const timeoutMinutes = Number(this['timeout-minutes'].evaluate(runner)) || 60;
      await withTimeout(main.execute(runner), timeoutMinutes * 60 * 1000);

      await actionCommandFile.process();
    });
  }

  setupEnv(runner: Runner) {
    this.mergeEnv(runner);
    // step env
    runner.Assign(this.#env, this.getEnv(runner));
  }

  mergeEnv(runner: Runner) {
    const { job } = runner.run;
    const { container } = job;
    if (container) {
      runner.Assign(this.#env, runner.Env, container.env?.evaluate(runner) || {});
    } else {
      runner.Assign(this.#env, runner.Env);
    }

    Object.assign(this.#env, runner.context.github.Env);
  }
}

export default StepAction;
