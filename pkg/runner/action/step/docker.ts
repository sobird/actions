import Executor from '@/pkg/common/executor';

import ActionStep from '.';

class ActionStepDocker extends ActionStep {
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

export default ActionStepDocker;
