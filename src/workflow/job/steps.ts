import Executor from '@/common/executor';
import { withCompositeStepLogger, withStepLogger } from '@/runner/logger';
import { createSafeName } from '@/utils';

import { StepProps } from './step';
// import StepAction from './step/action';
import StepActionFactory from './step/action/factory';

class Steps {
  public PrePipeline: Executor[] = [];

  public MainPipeline: Executor[] = [];

  public PostPipeline: Executor[] = [];

  constructor(
    private steps: StepProps[] = [],
    private composite: boolean = false,
  ) {
    if (!steps || steps.length === 0) {
      // 实例化时无需打印此信息，真正要执行时再打印
      // logger.debug('No steps found in composite action');
      return;
    }

    const map = new Map<string, number>();

    steps.forEach((step, number) => {
      const id = step.run ? step.id || '__run' : step.id || createSafeName(step.uses || '');
      let oN = map.get(id) || 0;
      if (map.has(id)) {
        oN += 1;
        map.set(id, oN);
      } else {
        map.set(id, 0);
      }

      const stepId = oN === 0 ? id : `${id}_${oN}`;
      Object.assign(step, { id: stepId });
      const stepAction = StepActionFactory.create(step);
      stepAction.number = number;

      const scope = (executor: Executor, stage: string) =>
        new Executor((ctx) => {
          if (this.composite) {
            return withCompositeStepLogger(stepId, () => executor.execute(ctx));
          }
          const stepName = ctx ? stepAction.Name(ctx) : stepId;
          return withStepLogger(number, stepId, stepName, stage, () => executor.execute(ctx));
        });

      this.PrePipeline.push(scope(stepAction.Pre, 'Pre'));
      this.PostPipeline.unshift(scope(stepAction.Post, 'Post'));
      this.MainPipeline.push(scope(stepAction.Main, 'Main'));
    });
  }

  run() {
    return Executor.Pipeline(...this.PrePipeline, ...this.MainPipeline, ...this.PostPipeline);
  }

  toJSON() {
    return this.steps;
  }
}

export default Steps;
