import Action, { ActionProps } from './action';
import ActionJavaScript from './extensions/nodejs-action';

function ActionFactory(action: ActionProps) {
  const { using, image } = action.runs;
  if (using) {
    if (using === 'docker') {
      if (!image) {
        // throw new Error(`You are using a Container Action but an image is not provided in ${fileRelativePath}.`);
      }
    }
  }

  throw new Error("Missing 'using' value. 'using' requires 'composite', 'docker', 'node12', 'node16' or 'node20'.");

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
