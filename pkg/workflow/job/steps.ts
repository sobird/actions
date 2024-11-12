import log4js from 'log4js';

import Executor from '@/pkg/common/executor';
import { createSafeName } from '@/utils';

import { StepProps } from './step';
import StepActionFactory from './step/action/factory';

const logger = log4js.getLogger();

class Steps {
  public PrePipeline: Executor[] = [];

  public MainPipeline: Executor[] = [];

  public PostPipeline: Executor[] = [];

  constructor(private steps: StepProps[] = []) {
    if (!steps || steps.length === 0) {
      // logger.debug('No steps found in composite action');
      return;
    }

    const map = new Map<string, number>();

    steps.forEach((step) => {
      const id = (step.run ? '__run' : step.id) || createSafeName(step.uses || '');
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

      this.PrePipeline.push(stepAction.Pre);
      this.PostPipeline.unshift(stepAction.Post);
      this.MainPipeline.push(stepAction.Main);
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
