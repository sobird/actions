// import StepActionLocal from './step-action';
import StepActionDocker from './action/docker';
import StepActionLocal from './action/local';
import StepActionRemote from './action/remote';
import StepActionScript from './action/script';
import Step, { type StepProps } from './step';

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
