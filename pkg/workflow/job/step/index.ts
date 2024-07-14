import Step, { StepProps } from './step';
import StepActionLocal from './step-action';
import StepDockerHub from './step-docker-hub';
import StepActionRemote from './uses-action-remote';

export function StepFactory(step: StepProps) {
  if (step.run === '' && step.uses === '') {
    throw Error('Invalid run/uses syntax for step');
  }

  if (step.run) {
    if (step.uses) {
      throw Error('Invalid run/uses syntax for step');
    }
    // step run script
    return new Step(step);
  } if (step.uses?.startsWith('docker://')) {
    // docker container
    return new StepDockerHub(step);
  } if (step.uses?.startsWith('./')) {
    return new StepActionLocal(step);
  }
  return new StepActionRemote(step);
}

export {
  Step,
  StepProps,
};
