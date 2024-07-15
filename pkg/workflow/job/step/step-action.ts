import Executor from '@/pkg/common/executor';

import Step from './step';

abstract class StepAction extends Step {
  public abstract pre(): Executor;
  public abstract main(): Executor;
  public abstract post(): Executor;
}

export default StepAction;
