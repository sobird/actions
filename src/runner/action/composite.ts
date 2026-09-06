import Executor from "@/common/executor";
import { withCompositeLogger } from "@/runner/logger";

import Action from ".";

class CompositeAction extends Action {
  protected main() {
    return new Executor(async (runner) => {
      if (!runner) {
        return;
      }

      const { steps } = this.runs;

      // 对齐 act execAsComposite：进入 composite 作用域后再跑内部步骤
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
