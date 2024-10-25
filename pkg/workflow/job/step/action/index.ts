/* eslint-disable class-methods-use-this */
import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Action from '@/pkg/runner/action';
import ActionCommandFile from '@/pkg/runner/action/command/file';
import Step from '@/pkg/workflow/job/step';
import { withTimeout } from '@/utils';

abstract class StepAction extends Step {
  environment: Record<string, string> = {};

  action?: Action;

  public prepareAction() { return new Executor(); }

  public pre() { return new Executor(); }

  public abstract main(): Executor;

  public post() { return new Executor(); }

  protected executor(main: Executor) {
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

      // init action environment
      runner.Assign(
        this.environment,
        runner.Env,
        runner.context.github.Env,
        runner.context.runner.Env,
        this.Env(runner),
      );

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

  static SymlinkJoin(filename: string, sym: string, parent: string) {
    const dir = path.dirname(filename);
    const dest = path.join(dir, sym);
    const prefix = path.normalize(parent) + path.sep;

    if (dest.startsWith(prefix) || prefix === './') {
      return dest;
    }

    throw new Error(`symlink tries to access file '${dest}' outside of '${parent}`);
  }
}

export default StepAction;
