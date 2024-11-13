import Executor from '@/pkg/common/executor';

import Action from '..';

class CompositeAction extends Action {
  protected main() {
    return new Executor((ctx) => {
      const runner = ctx!;

      // console.log('context', runner.context.inputs);
      // runner.context.inputs['who-to-greet'] = 'who-to-greet sss';
      // console.log('composite env:', runner.stepAction?.environment);

      return Executor.Pipeline(...this.runs.steps.MainPipeline);
    });
  }
}

export default CompositeAction;
