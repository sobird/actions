import Step, { type StepProps } from './step';
// import StepActionLocal from './step-action';
import StepActionDocker from './step-action-docker';
import StepActionLocal from './step-action-local';
import StepActionRemote from './step-action-remote';
import StepActionScript from './step-action-script';

function StepFactory(step: StepProps) {
  if (step.run === '' && step.uses === '') {
    throw Error('Invalid run/uses syntax for step');
  }

  if (step.run) {
    if (step.uses) {
      throw Error('Invalid run/uses syntax for step');
    }
    // step run script
    return new StepActionScript(step);
  } if (step.uses?.startsWith('docker://')) {
    // docker container
    return new StepActionDocker(step);
  } if (step.uses?.startsWith('./')) {
    return new StepActionLocal(step);
  }
  return new StepActionRemote(step);
}

export {
  Step,
  StepProps,
  StepFactory,
};
