/**
 * Docker Container
 *
 * sobird<i@sobird.me> at 2024/06/24 15:21:27 created.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Writable } from 'node:stream';
import tty from 'node:tty';

import {
  Container, ContainerCreateOptions, Network, NetworkCreateOptions, NetworkInspectInfo, AuthConfig,
} from 'dockerode';
import ignore from 'ignore';
import log4js from 'log4js';
import * as tar from 'tar';

import Executor, { Conditional } from '@/pkg/common/executor';
import docker from '@/pkg/docker';

import AbstractContainer, { FileEntry, ExecCreateInputs } from './container';

const logger = log4js.getLogger();

interface ContainerCreateInputs extends ContainerCreateOptions {
  Image: string;
  authconfig?: AuthConfig;
}

class Docker extends AbstractContainer {
  static docker = docker;

  container?: Container;

  network?: Network;

  // uid: number = 0;

  // gid: number = 0;

  constructor(
    public containerCreateInputs: ContainerCreateInputs,
    public networkCreateInputs: NetworkCreateOptions,
  ) {
    super();
  }

  pull(force: boolean = false) {
    return new Executor(async () => {
      const {
        containerCreateInputs: {
          Image, platform, authconfig,
        },
      } = this;

      const stream = await docker.pullImage(Image, {
        force,
        platform,
        authconfig,
      });

      if (!stream) {
        return;
      }

      // stream.on('data', (chunk) => {
      //   console.log('chunk', chunk.toJSON());
      // });
      // stream.pipe(process.stdout);

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        }, (event) => {
          console.log('event', event);
        });
      });
    });
  }

  create() {
    return Executor.Pipeline(this.findContainer()).finally(this.createContainer());
  }

  start() {
    return Executor.Pipeline(
      this.findContainer(),
      this.pull(),
      this.createContainer(),
      this.startContainer(),
      // this.tryReadUID(),
      // this.tryReadGID(),
      new Executor(() => {
        //
      }),
    );
  }

  stop() {
    return Executor.Pipeline(this.findContainer()).finally(this.stopContainer());
  }

  remove() {
    return Executor.Pipeline(this.findContainer()).finally(this.removeContainer());
  }

  put(destination: string, source: string, useGitIgnore: boolean = true) {
    return new Executor(async () => {
      const { container } = this;

      if (!container) {
        return;
      }
      const { containerCreateInputs: { WorkingDir = '' } } = this;
      const dest = path.resolve(WorkingDir, destination);

      const info = path.parse(source);
      const sourceStat = fs.statSync(source);
      if (sourceStat.isDirectory()) {
        info.dir = source;
        info.base = '.';
      }

      const options: Parameters<typeof tar.create>[0] = {
        cwd: info.dir,
        prefix: dest,
        // uid: this.uid,
        // gid: this.gid,
        portable: true,
      };

      const ignorefile = path.join(source, '.gitignore');
      if (useGitIgnore && fs.existsSync(ignorefile)) {
        const ig = ignore().add(fs.readFileSync(ignorefile).toString());
        options.filter = (src) => {
          const relPath = path.relative(source, path.join(source, src));
          if (relPath) {
            return !ig.ignores(relPath);
          }
          return true;
        };
      }

      const pack = tar.create(options, [info.base]);

      try {
        logger.debug("Extracting content from '%s' to '%s'", source, '');
        await container.putArchive((pack as unknown as NodeJS.ReadableStream), {
          path: '/',
        });
      } catch (err) {
        logger.error('Failed to copy dir to container: %s', (err as Error).message);
      }
    });
  }

  putContent(destination: string, ...files: FileEntry[]) {
    return new Executor(async () => {
      const { container } = this;

      if (!container) {
        return;
      }

      const { containerCreateInputs: { WorkingDir = '' } } = this;

      const dest = path.resolve(WorkingDir, destination);

      const pack = new tar.Pack({ prefix: dest, portable: true });
      for (const file of files) {
        const content = Buffer.from(file.body);

        const header = new tar.Header({
          path: file.name,
          mode: file.mode || 0o644,
          // uid: this.uid,
          // gid: this.gid,
          size: content.byteLength,
          mtime: new Date(),
        });
        header.encode();

        const entry = new tar.ReadEntry(header);
        entry.end(content);
        pack.add(entry);
      }
      pack.end();

      try {
        logger.debug("Extracting content to '%s'", dest);
        await container.putArchive((pack as unknown as NodeJS.ReadableStream), {
          path: '/',
        });
      } catch (err) {
        logger.error('Failed to copy content to container: %s', (err as Error).message);
      }
    });
  }

  async putArchive(destination: string, readStream: NodeJS.ReadableStream) {
    const { container } = this;

    if (!container) {
      return;
    }

    const { containerCreateInputs: { WorkingDir = '' } } = this;
    const dest = path.resolve(WorkingDir, destination);

    const pack = new tar.Pack({});
    const header = new tar.Header({
      path: dest,
      mode: 0o777,
      // uid: this.uid,
      // gid: this.gid,
      type: 'Directory',
    });
    header.encode();
    const entry = new tar.ReadEntry(header);
    entry.end();
    pack.add(entry);
    pack.end();

    container.putArchive(pack as unknown as NodeJS.ReadableStream, {
      path: '/',
    }).catch((err) => {
      logger.error('Failed to mkdir to copy content to container: %s', (err as Error).message);
    });

    try {
      return await container.putArchive(readStream as unknown as NodeJS.ReadableStream, {
        path: dest,
      });
    } catch (err) {
      logger.error('Failed to copy content to container: %s', (err as Error).message);
    }
  }

  async getArchive(source: string) {
    const { container } = this;

    if (!container) {
      return;
    }
    const { containerCreateInputs: { WorkingDir = '' } } = this;
    const dest = path.resolve(WorkingDir, source);

    return container.getArchive({
      path: dest,
    });
  }

  findNetwork(name: string) {
    return new Executor(async () => {
      const { networkCreateInputs } = this;
      const networkName = name || networkCreateInputs.Name;

      const networks = await docker.listNetworks();
      const networkInspectInfo = networks.find((item) => {
        return item.Name === networkName;
      });
      if (!networkInspectInfo?.Id) {
        delete this.network;
        return;
      }

      this.network = docker.getNetwork(networkInspectInfo.Id);
    }).if(new Conditional(() => {
      return !this.network;
    }));
  }

  createNetwork(name: string) {
    return new Executor(async () => {
      const { networkCreateInputs: options } = this;
      options.Name = name || options.Name;

      const network = await docker.createNetwork(options);
      this.network = network;
    });
  }

  connectNetwork(containerName: string, aliases: string[]) {
    return new Executor(async () => {
      const { network } = this;
      if (!network) {
        return;
      }
      const { containerCreateInputs } = this;

      network.connect({
        Container: containerName || containerCreateInputs.name,
        EndpointConfig: {
          Aliases: aliases,
        },
      });
    });
  }

  disconnectNetwork() {
    return new Executor(async () => {
      const { network } = this;
      if (!network) {
        return;
      }

      try {
        await network.disconnect();
        logger.debug('Disconnect Network: %s', network.id);
        delete this.container;
      } catch (err) {
        logger.error('Failed to Disconnect Network: %s', (err as Error).message);
      }
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

  findContainer() {
    return new Executor(async () => {
      const { containerCreateInputs } = this;

      const containers = await docker.listContainers({ all: true });

      const containerInfo = containers.find((item) => {
        return item.Names.some((name) => {
          return name.substring(1) === containerCreateInputs.name;
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

  private createContainer() {
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

  private startContainer() {
    return new Executor(async () => {
      const { container } = this;

      if (!container) {
        return;
      }

      try {
        logger.debug('Starting container: %s', container.id);
        await container.start();
        logger.debug('Started container: %s', container.id);
      } catch (err) {
        logger.error('Failed to start container: %s', (err as Error).message);
      }
    });
  }

  private stopContainer() {
    return new Executor(async () => {
      const { container } = this;
      if (!container) {
        return;
      }

      try {
        logger.debug('Stoping container: %s', container.id);
        await container.stop();
        logger.debug('Stoped container: %s', container.id);
        delete this.container;
      } catch (err) {
        logger.error('Failed to stop container: %s', (err as Error).message);
      }
    });
  }

  private removeContainer() {
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
        logger.error('Failed to remove container: %s', (err as Error).message);
      }
    });
  }

  waitContainer() {
    return new Executor(async () => {
      const { container } = this;
      if (!container) {
        return;
      }

      const { StatusCode } = await container.wait({
        condition: 'not-running',
      }) || {};

      logger.debug('Return status: %v', StatusCode);

      if (StatusCode === 0) {
        return;
      }
      throw new Error(`Container exited with status code: ${StatusCode}`);
    });
  }

  exec(command: string[], inputs: ExecCreateInputs = {}) {
    return new Executor(async () => {
      const { container } = this;
      if (!container) {
        return;
      }
      const { containerCreateInputs: { WorkingDir = '' } } = this;
      const workdir = path.resolve(WorkingDir, inputs.workdir || '');

      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        WorkingDir: workdir,
        Env: inputs.env,
        User: inputs.user,
      });

      const stream = await exec.start({});

      // stream.on('data', (chunk) => {
      //   console.log('chunk', chunk.toString());
      // });

      const out = new Writable({
        write: (chunk, enc, next) => {
          console.log('chunk', chunk.toString());

          next();
        },
      });
      stream.pipe(out);

      await new Promise((resolve, reject) => {
        stream.on('end', () => {
          resolve(null);
        });
        stream.on('error', (err) => {
          reject(err);
        });
      });
    });
  }

  // tryReadUID() {
  //   return new Executor(async () => {
  //     this.uid = await this.tryReadID('-u');
  //   });
  // }

  // tryReadGID() {
  //   return new Executor(async () => {
  //     this.uid = await this.tryReadID('-g');
  //   });
  // }
}

export default Docker;
