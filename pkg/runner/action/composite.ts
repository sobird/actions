import Executor from '@/pkg/common/executor';

import Action from '.';

class CompositeAction extends Action {
  protected main() {
    return new Executor(async (runner) => {
      if (!runner) {
        return;
      }

      const { steps } = this.runs;

      await Executor.Pipeline(...steps.PrePipeline, ...steps.MainPipeline).execute(runner);

      const { parent } = runner;

      if (parent) {
        // set parent job status
        // eslint-disable-next-line no-param-reassign
        parent.context.job.status = runner.context.job.status;

        // set current step composite outputs
        Object.entries(this.outputs).forEach(([outputId, output]) => {
          parent.setOutput(outputId, output.value.evaluate(runner));
        });
      }
    });
  }
}

export default CompositeAction;
