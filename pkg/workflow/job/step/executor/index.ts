import Executor from '@/pkg/common/executor';

abstract class StepExecutor {
  //
  // abstract pre(): Executor;

  // abstract main(): Executor;

  // abstract post(): Executor;

  setup() {
    return new Executor(() => {
      console.log('setup', this);
    });
  }
}

export default StepExecutor;
