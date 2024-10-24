import Executor from '@/pkg/common/executor';
import ActionCommandFile from '@/pkg/runner/action/command/file';
import Step from '@/pkg/workflow/job/step/step';
import { withTimeout } from '@/utils';

import Action from '../action';

class ActionStep {
  environment: Record<string, string> = {};

  action?: Action;

  constructor(public step: Step) {}

  public prepareAction() {
    //
  }

  protected executor(main: Executor) {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      const { step } = this;

      const { id } = step;
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

      await actionCommandFile.initialize(step.uuid);

      // init action environment
      runner.Assign(
        this.environment,
        runner.Env,
        runner.context.github.Env,
        runner.context.runner.Env,
        step.Env(runner),
      );

      try {
        const enabled = step.if.evaluate(runner);

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

      const timeoutMinutes = Number(step['timeout-minutes'].evaluate(runner)) || 60;
      await withTimeout(main.execute(runner), timeoutMinutes * 60 * 1000);

      await actionCommandFile.process();
    });
  }
}

export default ActionStep;
