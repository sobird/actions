import Executor from '@/pkg/common/executor';
import { ActionProps } from '@/pkg/runner/action';
import DockerAction from '@/pkg/runner/action/docker';

import StepAction from '.';

class StepActionDocker extends StepAction {
  protected get PrepareAction() {
    return new Executor((runner) => {
      if (!runner) {
        return;
      }
      // docker hub 默认设置with环境变量到容器
      const stepWith = this.with.evaluate(runner) || {};
      const inputs = Object.fromEntries(Object.entries(stepWith).map(([key, value]) => {
        return [key, {
          default: value,
          required: true,
        }];
      }));

      this.action = new DockerAction({
        name: '(Synthetic)',
        description: 'docker hub action',
        inputs,
        runs: {
          using: 'docker',
          image: this.uses.uses,
        },
      } as ActionProps);
    });
  }

  protected main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      this.applyEnv(runner, this.environment);
      return this.action?.Main;
    });
  }
}

export default StepActionDocker;
