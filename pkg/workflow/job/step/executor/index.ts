import Executor from '@/pkg/common/executor';

abstract class StepExecutor {
  // eslint-disable-next-line class-methods-use-this
  public pre() {
    return new Executor(() => {});
  }
  public abstract main(): Executor;
  public abstract post(): Executor;
}

export default StepExecutor;
