import Executor from '@/common/executor';
import { withCompositeLogger } from '@/runner/logger';

import Action from '.';

class CompositeAction extends Action {
  protected main() {
    return new Executor(async (runner) => {
      if (!runner) {
        return;
      }

      const { steps } = this.runs;

      // The composite's own result, read by its embedded steps' status functions through
      // `github.action_status`. It starts over here rather than inheriting the job's: a
      // composite runs its steps even when the job has already failed, and a nested one
      // starts fresh as well.
      runner.context.github.action_status = 'success';

      await withCompositeLogger(async () => {
        return Executor.Pipeline(...steps.PrePipeline, ...steps.MainPipeline).execute(runner);
      });

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
