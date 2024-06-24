/**
 * Docker Container
 *
 * sobird<i@sobird.me> at 2024/06/24 15:21:27 created.
 */

import {
  Container, ContainerCreateOptions, Network, NetworkCreateOptions, NetworkInspectInfo,
} from 'dockerode';
import log4js from 'log4js';

import Executor, { Conditional } from '@/pkg/common/executor';
import docker from '@/pkg/docker';

const logger = log4js.getLogger();

interface ContainerInputs extends ContainerCreateOptions {
  // image: string;
  // username?: string;
  // password?: string;
  // entrypoint?: string[];
  // cmd?: string[];
  // workingDir?: string;
  // env?: string[];
  // binds?: string[];
  // mounts?: { [key: string]: string };
  // name?: string;
  // stdout?: Writable;
  // stderr?: Writable;
  // networkMode?: string;
  // privileged?: boolean;
  // usernsMode?: string;
  // platform?: string;
  // options?: string;
  // networkAliases?: string[];
  // exposedPorts?: { [key: string]: any };
  // portBindings?: { [key: string]: any };

  // autoRemove?: boolean;
  // validVolumes?: string[];
}

// const containers1 = await docker.listContainers({ all: true });
// console.log('containers1', containers1);

class Docker {
  container?: Container;

  network?: Network;

  constructor(public inputs: ContainerInputs = {}) {

  }

  pull(force: boolean = false) {
    const { inputs } = this;
    return docker.pullExecutor({
      image: inputs.Image,
      force,
    });
  }

  create(capAdd: string[], capDrop: string[]) {
    return Executor.Pipeline(this.findExecutor()).finally(this.createExecutor(capAdd, capDrop));
  }

  start() {
    return Executor.Pipeline(this.findExecutor()).finally(this.startExecutor());
  }

  stop() {
    return Executor.Pipeline(this.findExecutor()).finally(this.stopExecutor());
  }

  remove() {
    return Executor.Pipeline(this.findExecutor()).finally(this.removeExecutor());
  }

  findNetwork(name: string) {
    return new Executor(async () => {
      const networks = await docker.listNetworks();
      const networkInspectInfo = networks.find((item) => {
        return item.Name === name;
      });
      if (!networkInspectInfo?.Id) {
        delete this.network;
        return;
      }
      logger.debug('Network %s exists', name);
      this.network = docker.getNetwork(networkInspectInfo.Id);
    });
  }

  createNetwork(name: string) {
    return new Executor(async () => {
      const network = await docker.createNetwork({
        Name: name,
        Driver: 'bridge', // docker 默认模式
      });
      this.network = network;
    });
  }

  removeNetwork(name: string) {
    const { network } = this;
    return new Executor(async () => {
      if (!network) {
        return;
      }
      const networkInspectInfo: NetworkInspectInfo = await network.inspect();
      if (Object.keys(networkInspectInfo?.Containers || {}).length === 0) {
        await network.remove();
        delete this.network;
      } else {
        logger.debug('Refusing to remove network %v because it still has active endpoints', name);
      }
    });
  }

  private createExecutor(capAdd: string[], capDrop: string[]) {
    const { inputs } = this;
    return new Executor(async () => {
      if (!inputs.HostConfig) {
        inputs.HostConfig = {};
      }

      inputs.HostConfig.CapAdd = capAdd;
      inputs.HostConfig.CapDrop = capDrop;

      const container = await docker.createContainer(inputs);

      logger.debug('Created container name=%s id=%s from image %s (platform: %s)', inputs.name, container.id, inputs.Image, inputs.platform);
      logger.debug('ENV ==> %o', inputs.Env);

      this.container = container;
    }).if(new Conditional(() => {
      return !this.container;
    }));
  }

  private startExecutor() {
    const { container } = this;
    return new Executor(async () => {
      if (!container) {
        return;
      }

      logger.debug('Starting container: %v', container.id);

      try {
        await container.start();
        logger.debug('Started container: %v', container.id);
      } catch (err) {
        logger.error('failed to start container: %s', (err as Error).message);
      }
    });
  }

  private findExecutor() {
    const { inputs } = this;
    return new Executor(async () => {
      const containers = await docker.listContainers({ all: true });

      const containerInfo = containers.find((item) => {
        return item.Names.some((name) => {
          return name.substring(1) === inputs.name;
        });
      });

      if (!containerInfo?.Id) {
        delete this.container;
        return;
      }

      this.container = docker.getContainer(containerInfo?.Id);
    }).if(new Conditional(() => {
      return !this.container;
    }));
  }

  private stopExecutor() {
    const { container } = this;
    return new Executor(async () => {
      if (!container) {
        return;
      }

      try {
        await container.stop();

        logger.debug('Stoped container: %s', container.id);
        delete this.container;
      } catch (err) {
        logger.error('failed to stop container: %w', err);
      }
    });
  }

  private removeExecutor() {
    const { container } = this;
    return new Executor(async () => {
      if (!container) {
        return;
      }

      try {
        await container.remove({
          v: true,
          force: true,
        });

        logger.debug('Removed container: %s', container.id);
        delete this.container;
      } catch (err) {
        logger.error('failed to remove container: %w', err);
      }
    });
  }

  wait() {
    const { container } = this;
    return new Executor(async () => {
      const { StatusCode } = await container?.wait({
        condition: 'not-running',
      }) || {};

      logger.debug('Return status: %v', StatusCode);

      if (StatusCode === 0) {
        return;
      }
      throw new Error(`Container exited with status code: ${StatusCode}`);
    });
  }
}

export default Docker;
