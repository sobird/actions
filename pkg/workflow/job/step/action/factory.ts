import { StepProps } from '@/pkg/workflow/job/step';

import StepActionDocker from './docker';
import StepActionLocal from './local';
import StepActionRemote from './remote';
import StepActionScript from './script';

class StepActionFactory {
  static create(step: StepProps) {
    if (!step.run && !step.uses) {
      throw Error('every step must define a `uses` or `run` key');
    }

    if (step.run && step.uses) {
      throw Error('a step cannot have both the `uses` and `run` keys');
    }

    if (step.uses) {
      if (step.uses.startsWith('docker://')) {
        return new StepActionDocker(step);
      } if (step.uses.startsWith('./') || step.uses.startsWith('.\\')) {
        return new StepActionLocal(step);
      }
      return new StepActionRemote(step);
    }

    return new StepActionScript(step);
  }
}

export default StepActionFactory;
