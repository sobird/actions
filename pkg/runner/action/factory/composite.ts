import Executor from '@/pkg/common/executor';

import Action from '..';

class CompositeAction extends Action {
  protected main() {
    return new Executor((ctx) => {
      const runner = ctx!;

      console.log('this.env', runner.stepAction?.environment);

      return Executor.Pipeline(...this.runs.steps.MainPipeline);
    });
  }
}

export default CompositeAction;
