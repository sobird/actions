import Executor from '@/pkg/common/executor';

import Action from '..';

class CompositeAction extends Action {
  protected main() {
    return Executor.Pipeline(...this.runs.steps.MainPipeline);
  }
}

export default CompositeAction;
