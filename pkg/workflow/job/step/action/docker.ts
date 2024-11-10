import Executor from '@/pkg/common/executor';
import { ActionProps } from '@/pkg/runner/action';
import DockerAction from '@/pkg/runner/action/factory/docker';

import StepAction from '.';

class StepActionDocker extends StepAction {
  protected get PrepareAction() {
    return new Executor(() => {
      this.action = new DockerAction({
        name: '(Synthetic)',
        description: 'docker hub action',
        runs: {
          using: 'docker',
          image: this.uses.uses,
        },
      } as ActionProps);
    });
  }

  protected main() {
    return new Executor(async () => { return this.action?.Main; });
  }
}

export default StepActionDocker;
