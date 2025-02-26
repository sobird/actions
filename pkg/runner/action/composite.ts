import Executor from '@/pkg/common/executor';

import Action from '.';

class CompositeAction extends Action {
  protected main() {
    return new Executor(async (parent) => {
      if (!parent) {
        return;
      }

      const compositeRunner = parent.clone();
      compositeRunner.context.steps = {};

      const { steps } = this.runs;

      await Executor.Pipeline(...steps.PrePipeline, ...steps.MainPipeline).execute(compositeRunner);

      // set parent job status
      // eslint-disable-next-line no-param-reassign
      parent.context.job.status = compositeRunner.context.job.status;

      // set current step composite outputs
      Object.entries(this.outputs).forEach(([outputId, output]) => {
        parent.setOutput(outputId, output.value.evaluate(compositeRunner));
      });
    });
  }
}

export default CompositeAction;
