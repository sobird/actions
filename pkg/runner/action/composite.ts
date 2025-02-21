import Executor from '@/pkg/common/executor';

import Action from '.';

class CompositeAction extends Action {
  protected main() {
    return new Executor(async (runner) => {
      if (!runner) {
        return;
      }

      const compositeRunner = runner.clone();
      compositeRunner.context.steps = {};

      const { steps } = this.runs;

      await Executor.Pipeline(...steps.PrePipeline, ...steps.MainPipeline).execute(compositeRunner);

      // set composite outputs
      Object.entries(this.outputs).forEach(([outputId, output]) => {
        runner.setOutput(outputId, output.value.evaluate(compositeRunner));
      });
    });
  }
}

export default CompositeAction;
