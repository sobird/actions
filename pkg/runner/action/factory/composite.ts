import Executor from '@/pkg/common/executor';

import Action from '..';

class CompositeAction extends Action {
  protected main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const compositeRunner = runner.clone();
      compositeRunner.context.steps = {};

      await Executor.Pipeline(...this.runs.steps.MainPipeline).execute(compositeRunner);

      // console.log('compositeRunner', compositeRunner.context);
      // console.log('compositeRunner', runner.context);
    });
  }
}

export default CompositeAction;
