import Executor from '@/pkg/common/executor';

import StepAction from '.';

class StepActionDocker extends StepAction {
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

export default StepActionDocker;
