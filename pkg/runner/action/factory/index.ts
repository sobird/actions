import { ActionProps } from '..';
import CompositeAction from './composite';
import DockerAction from './docker';
import NodeJSAction from './nodejs';

class ActionFactory {
  static create(action: ActionProps) {
    const { runs } = action;
    const { using, image, main } = action.runs;
    if (using) {
      if (using === 'docker') {
        if (!image) {
          throw new Error(`You are using a Container Action but an image is not provided in ${action.Dir}.`);
        } else {
          return new DockerAction(action);
        }
      }

      if (using === 'node12' || using === 'node16' || using === 'node20') {
        if (!main) {
          throw new Error(`You are using a JavaScript Action but there is not an entry JavaScript file provided in ${action.Dir}.`);
        } else {
          return new NodeJSAction(action);
        }
      } else if (using === 'composite') {
        if (!runs.steps) {
          throw new Error(`You are using a composite action but there are no steps provided in ${action.Dir}.`);
        } else {
          return new CompositeAction(action);
        }
      }
    }

    throw new Error("Missing 'using' value. 'using' requires 'composite', 'docker', 'node12', 'node16' or 'node20'.");
  }
}

export default ActionFactory;
