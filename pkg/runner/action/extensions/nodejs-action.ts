/**
 * action javascript
 *
 * sobird<i@sobird.me> at 2024/10/16 21:08:02 created.
 */

import path from 'node:path';

import Executor, { Conditional } from '@/pkg/common/executor';

import Action from '../action';

class NodeJSAction extends Action {
  // constructor(action: NodeJSAction) {
  //   super(action);
  //   this.runs = action.runs;
  // }

  hasPre() {
    return new Conditional((runner) => {
      return !!this.runs['pre-if'].evaluate(runner!);
    });
  }

  pre() {
    return new Executor(async (runner) => {
      const { container } = runner!;
      // step action env
      const env = await container?.applyPath(runner!.prependPath, {});

      this.composeInputs(runner!, env);

      console.log('env ', env);

      const runsPreFile = path.join(this.Dir, this.runs.pre);

      console.log('preFile', runsPreFile);

      const ddd = container?.exec(['node', runsPreFile], { env });
      await ddd?.execute(runner);
    });
  }

  main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      // step action env
      const env = await runner.container?.applyPath(runner.prependPath, {});

      return runner.container?.exec(['node', path.join(this.Dir, this.runs.main)], { env });
    });
  }

  post() {
    //
  }
}

export default NodeJSAction;
