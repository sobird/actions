import Executor from '@/pkg/common/executor';

import StepAction from './step-action';

class StepActionScript extends StepAction {
  public main() {
    return this.executor(new Executor(async (ctx) => {
      const { runner } = ctx!;
      console.log('step action script main');

      await runner.container?.exec(['node', '-v'], {}).execute();
    }));
  }
}

export default StepActionScript;
