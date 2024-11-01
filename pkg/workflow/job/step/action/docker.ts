import shellQuote from 'shell-quote';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import DockerContainer from '@/pkg/runner/container/docker';

import StepAction from '.';

class StepActionDocker extends StepAction {
  public main() {
    return this.executor(new Executor(async (ctx) => {
      const runner = ctx!;
      const image = this.uses.toString().substring('docker://'.length);
      const stepWith = this.with.evaluate(runner);
      const cmd = shellQuote.parse(stepWith?.args || '');

      let entrypoint: string[] = [];

      if (stepWith?.entrypoint) {
        entrypoint = [stepWith.entrypoint];
      }

      console.log('cmd', cmd, entrypoint);

      const container = this.Container(runner, image, cmd, entrypoint);

      return Executor.Pipeline(
        container.remove().ifBool(!runner.config.reuseContainers),
        container.start(true),
      ).finally(
        container.remove().ifBool(!runner.config.reuseContainers),
      );
    }));
  }

  Container(runner: Runner, image: string, cmd: string[], entrypoint: string[]) {
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
