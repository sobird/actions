import Executor from '@/pkg/common/executor';

import StepAction from './step-action';

class StepActionScript extends StepAction {
  public pre() {
    return new Executor(() => {});
  }

  public main() {
    return new Executor(() => {});
  }

  public post() {
    return new Executor(() => {});
  }
}

export default StepActionScript;
