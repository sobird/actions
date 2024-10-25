// import StepActionLocal from './step-action';
import Step, { type StepProps } from '.';
import StepActionDocker from '../../../runner/action/step/docker';
import StepActionLocal from '../../../runner/action/step/local';
import StepActionRemote from '../../../runner/action/step/remote';
import StepActionScript from '../../../runner/action/step/script';

function StepFactory(step: StepProps) {
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

export {
  Step,
  StepProps,
  StepFactory,
};
