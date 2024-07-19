import Executor from '@/pkg/common/executor';

export enum StepActionStage {
  Pre,
  Main,
  Post,
}

abstract class StepAction {
  public abstract pre(): Executor;
  public abstract main(): Executor;
  public abstract post(): Executor;
}

export default StepAction;
