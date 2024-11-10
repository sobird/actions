import Executor from '@/pkg/common/executor';

import Action from '..';

class CompositeAction extends Action {
  protected main() {
    return new Executor(() => {
      // console.log('first', this.runs.steps);
      const { steps } = this.runs;
      if (!steps || steps.length === 0) {
        return Executor.Debug('No steps found in composite action');
      }
    });
  }
}

export default CompositeAction;
