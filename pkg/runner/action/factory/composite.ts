import Executor from '@/pkg/common/executor';

import Action from '..';

class CompositeAction extends Action {
  private StepPrePipeline: Executor[];

  private StepMainPipeline: Executor[];

  private StepPostPipeline: Executor[];

  private get PrepareSteps() {
    return new Executor(() => {
      const { steps } = this.runs;
      if (!steps || steps.length === 0) {
        return Executor.Debug('No steps found in composite action');
      }

      this.StepMainPipeline.push(...steps.map((step, index) => {
        // eslint-disable-next-line no-param-reassign
        step.number = index;

        return step.Main;
      }));
    });
  }

  protected main() {
    return new Executor(() => {
      //
    });
  }
}

export default CompositeAction;
