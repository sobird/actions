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

// const containers1 = await docker.listContainers({ all: true });
// console.log('containers1', containers1);

interface ContainerCreateInputs extends ContainerCreateOptions {
  Image: string;
  username?: string;
  password?: string;
}

class Docker {
  static docker = docker;

  container?: Container;

  network?: Network;

  constructor(public containerCreateInputs: ContainerCreateInputs, public networkCreateInputs: NetworkCreateOptions) {}

  pull(force: boolean = false) {
    const { containerCreateInputs } = this;
    return docker.pullExecutor({
      image: containerCreateInputs.Image,
      force,
      platform: containerCreateInputs.platform,
      username: containerCreateInputs.username,
      password: containerCreateInputs.password,
    });
  }

  create(capAdd: string[], capDrop: string[]) {
    return Executor.Pipeline(this.findExecutor()).finally(this.createContainerExecutor(capAdd, capDrop));
  }

  start() {
    return Executor.Pipeline(this.findExecutor(), this.startExecutor());
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
    return new Executor(async () => {
      const { network } = this;
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

  private createContainerExecutor() {
    return new Executor(async () => {
      const { containerCreateInputs: options } = this;

      const container = await docker.createContainer(options);

      logger.debug('Created container name=%s id=%s from image %s (platform: %s)', options.name, container.id, options.Image, options.platform);
      logger.debug('ENV ==> %o', options.Env);

      this.container = container;
    }).if(new Conditional(() => {
      return !this.container;
    }));
  }

  private startExecutor() {
    return new Executor(async () => {
      const { container } = this;

      if (!container) {
        return;
      }

      logger.debug('Starting container: %s', container.id);

      try {
        await container.start();
        logger.debug('Started container: %s', container.id);
      } catch (err) {
        logger.error('Failed to start container: %s', (err as Error).message);
      }
    });
  }

  private findExecutor() {
    return new Executor(async () => {
      const { inputs } = this;

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
    return new Executor(async () => {
      const { container } = this;

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
    return new Executor(async () => {
      const { container } = this;

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
    return new Executor(async () => {
      const { container } = this;

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
