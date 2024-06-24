/**
 * Docker Container
 *
 * sobird<i@sobird.me> at 2024/06/24 15:21:27 created.
 */

import { Container, ContainerCreateOptions } from 'dockerode';
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

  test?: Container;

  constructor(public inputs: ContainerInputs = {}) {

  }

  find() {
    const { inputs } = this;
    return new Executor(async () => {
      const containers = await docker.listContainers({ all: true });

      const containerInfo = containers.find((item) => {
        return item.Names.some((name) => {
          return name.substring(1) === inputs.name;
        });
      });

      this.container = docker.getContainer(containerInfo?.Id || '');
    }).if(new Conditional(() => {
      return !this.container;
    }));
  }

  create(capAdd: string[], capDrop: string[]) {
    const { inputs } = this;
    return new Executor(async () => {
      //

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

  start() {
    const { container } = this;
    return new Executor(async () => {
      logger.debug('Starting container: %v', container?.id);

      try {
        await container?.start();
      } catch (err) {
        logger.error('failed to start container: %w', err);
      }

      logger.debug('Started container: %v', container?.id);
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
