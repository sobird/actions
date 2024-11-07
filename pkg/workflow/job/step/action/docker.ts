import shellQuote, { ParseEntry } from 'shell-quote';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import { ActionProps } from '@/pkg/runner/action';
import DockerAction from '@/pkg/runner/action/factory/docker';
import DockerContainer from '@/pkg/runner/container/docker';

import StepAction from '.';

class StepActionDocker extends StepAction {
  public prepareAction() {
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

  public pre() {
    // console.log('1212', 1212, this.ShouldRunPre.evaluate());

    return new Executor();
  }

  public main() {
    return this.executor(new Executor(async (ctx) => {
      return this.action?.Main;
    }));
  }

  public post() {
    return new Executor((ctx) => {
      const runner = ctx!;
      console.log('this.context.steps', runner.context.steps);
    });
  }

  Container(runner: Runner, image: string, cmd: ParseEntry[], entrypoint: string[]) {
    const { environment } = this;

    const { config } = runner;
    const [binds, mounts] = runner.BindsAndMounts;
    const credentials = runner.Credentials;

    const name = runner.ContainerName(runner.context.github.action);

    return new DockerContainer({
      name,
      image,
      env: environment,
      cmd,
      entrypoint,
      workdir: config.workdir,
      authconfig: {
        ...credentials,
      },
      binds,
      mounts,
      networkMode: `container:${runner.ContainerName()}`,
      privileged: config.containerPrivileged,
      usernsMode: config.containerUsernsMode,
      platform: config.containerPlatform,
      capAdd: config.containerCapAdd,
      capDrop: config.containerCapDrop,
    }, config.workspace);
  }
}

export default StepActionDocker;
