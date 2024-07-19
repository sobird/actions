import { createSafeName } from '@/utils';

import { StepFactory } from './step';
import { StepProps } from './step/step';

export function createSteps(steps: StepProps[] = []) {
  const map = new Map<string, number>();

  return steps.map((step) => {
    const id = (step.run ? '__run' : createSafeName(step.uses || '')) || step.id;
    let oN = map.get(id) || 0;
    if (map.has(id)) {
      oN += 1;
      map.set(id, oN);
    } else {
      map.set(id, 0);
    }

    const stepId = oN === 0 ? id : `${id}_${oN}`;
    Object.assign(step, { id: stepId });
    return StepFactory(step);
  });
}
