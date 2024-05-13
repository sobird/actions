import StepExecutor from '.';

class StepExecutorRun extends StepExecutor {
  main() {
    return this.setup();
  }
}

export default StepExecutorRun;
