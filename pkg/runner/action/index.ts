import Action, { ActionProps } from './action';

function ActionFactory(action: ActionProps) {
  const ddd = action.runs.using;
  if (!step.run && !step.uses) {
    throw Error('every step must define a `uses` or `run` key');
  }

  if (step.run && step.uses) {
    throw Error('a step cannot have both the `uses` and `run` keys');
  }

  if (step.run) {
    return new StepActionScript(step);
  }

  if (step.uses) {
    if (step.uses.startsWith('docker://')) {
      return new StepActionDocker(step);
    } if (step.uses.startsWith('./') || step.uses.startsWith('.\\')) {
      return new StepActionLocal(step);
    }
    return new StepActionRemote(step);
  }
}

export {
  ActionFactory,
};

export default Action;
