import type Step from '.';
import StepRun from './run';
import StepActionLocal from './uses-action-local';
import StepActionRemote from './uses-action-remote';
import StepDocker from './uses-docker-hub';

export function StepFactory(step: Step) {
  if (step.run === '' && step.uses === '') {
    throw Error(('Invalid run/uses syntax fot step'));
  }

  if (step.run) {
    if (step.uses) {
      throw Error(('Invalid run/uses syntax fot step'));
    }
    return new StepRun(step);
  } if (step.uses.startsWith('docker://')) {
    return new StepDocker(step);
  } if (step.uses.startsWith('./')) {
    return new StepActionLocal(step);
  }
  return new StepActionRemote(step);
}
