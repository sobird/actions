/**
 * Docker Container
 *
 * sobird<i@sobird.me> at 2024/06/24 15:21:27 created.
 */

import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import tty from 'node:tty';

import Dockerode, {
  NetworkInspectInfo, AuthConfig, MountConfig, EndpointSettings, EndpointsConfig,
} from 'dockerode';
import dotenv from 'dotenv';
import ignore from 'ignore';
import log4js from 'log4js';
import * as tar from 'tar';

import Executor, { Conditional } from '@/pkg/common/executor';
import docker from '@/pkg/docker';

import Container, { FileEntry, ContainerExecOptions } from '.';

const logger = log4js.getLogger();

export interface DockerContainerOptions {
  /** container name */
  name?: string;
  /** Name of the image as it was passed by the operator (e.g. could be symbolic) */
  image: string;
  /** Current directory (PWD) in the command will be launched */
  workdir: string;
  platform?: string;
  /** Entrypoint to run when starting the container */
  entrypoint?: string[];
  authconfig?: AuthConfig;
  cmd?: string[];
  env?: NodeJS.ProcessEnv;
  exposedPorts?: { [port: string]: {} };

  stdout?: string;
  stderr?: string;

  // HostConfig
  autoRemove?: boolean;
  binds?: string[];
  networkMode?: 'default' | 'host' | 'bridge' | 'container' | 'none' | string;
  portBindings?: any;
  mounts?: Record<string, string>;
  capAdd?: string[];
  capDrop?: string[];
  privileged?: boolean;
  usernsMode?: string;
  NetworkAliases?: string[];
}

const hashFilesDir = 'bin/hashFiles';
const isatty = tty.isatty(process.stdout.fd);
class DockerContainer extends Container {
  static docker = docker;

  container?: Dockerode.Container;

  network?: Dockerode.Network;

  os: string = '';

  arch: string = '';

  constructor(public options: DockerContainerOptions) {
    super();
  }

  pull(force: boolean = false) {
    return new Executor(async () => {
      const { image, platform, authconfig } = this.options;

      const stream = await docker.pullImage(image, {
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
      this.info(),
      new Executor(() => {
        //
      }),
    ).finally(this.put(hashFilesDir, 'pkg/expression/hashFiles/index.cjs'));
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
      const dest = this.resolve(destination);

      const info = path.parse(source);
      const sourceStat = fs.statSync(source);
      if (sourceStat.isDirectory()) {
        info.dir = source;
        info.base = '.';
      }

      const options: Parameters<typeof tar.create>[0] = {
        cwd: info.dir,
        prefix: dest,
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

      const dest = this.resolve(destination);

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

    const dest = this.resolve(destination);

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
      const stream = await container.putArchive(readStream as unknown as NodeJS.ReadableStream, {
        path: dest,
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('error', (err) => {
          reject(err);
        });
        stream.on('finish', () => {
          resolve();
        });
      });
    } catch (err) {
      logger.error('Failed to copy content to container: %s', (err as Error).message);
    }
  }

  async getArchive(source: string) {
    const { container } = this;

    const dest = this.resolve(source);

    return container!.getArchive({
      path: dest,
    });
  }

  findNetwork(name: string) {
    return new Executor(async () => {
      const networkName = name;

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
      const network = await docker.createNetwork({
        Name: name,
      });
      this.network = network;
    });
  }

  connectNetwork(containerName: string, aliases: string[]) {
    return new Executor(async () => {
      const { network } = this;
      if (!network) {
        return;
      }
      const { name } = this.options;

      network.connect({
        Container: containerName || name,
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
      const { name: containerName } = this.options;

      const containers = await docker.listContainers({ all: true });

      const containerInfo = containers.find((item) => {
        return item.Names.some((name) => {
          return name.substring(1) === containerName;
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

  // todo update options
  private createContainer() {
    return new Executor(async () => {
      const { options } = this;

      const Env = Object.entries(options.env || {}).map(([key, value]) => { return `${key}=${value}`; });

      const Mounts: MountConfig = Object.entries(options.mounts || {}).map(([Source, Target]) => {
        return {
          Type: 'volume',
          Source,
          Target,
        };
      });

      const NetworkMode = options.networkMode || 'default';
      const isNetworkMode = ['default', 'host', 'bridge', 'container', 'none'].includes(NetworkMode);
      let endpointsConfig: EndpointsConfig = {};
      if (!isNetworkMode && options.networkMode !== 'host' && (options.NetworkAliases || []).length > 0) {
        const endpointSettings: EndpointSettings = {
          Aliases: options.NetworkAliases,
        };

        endpointsConfig = {
          [NetworkMode]: endpointSettings,
        };
      }

      const container = await docker.createContainer({
        name: options.name,
        Image: options.image,
        WorkingDir: options.workdir,
        Entrypoint: options.entrypoint,
        platform: options.platform,
        Tty: isatty,
        Cmd: options.cmd,
        Env,
        ExposedPorts: options.exposedPorts,
        HostConfig: {
          AutoRemove: options.autoRemove,
          Binds: options.binds,
          NetworkMode,
          PortBindings: options.portBindings,
          Mounts,
          CapAdd: options.capAdd,
          CapDrop: options.capDrop,
          Privileged: options.privileged,
          UsernsMode: options.usernsMode,
        },
        NetworkingConfig: {
          EndpointsConfig: endpointsConfig,
        },
      });

      logger.debug('Created container name=%s id=%s from image %s (platform: %s)', options.name, container.id, options.image, options.platform);
      logger.debug('ENV ==> %o', Env);

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

  exec(command: string[], inputs: ContainerExecOptions = {}) {
    return new Executor(async () => {
      const { container } = this;
      if (!container) {
        return;
      }
      const WorkingDir = this.resolve(inputs.workdir || '');

      const Env = Object.entries(inputs.env || {}).map(([key, value]) => { return `${key}=${value}`; });

      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        WorkingDir,
        Env,
        User: inputs.user,
      });

      const stream = await exec.start({});

      // stream.on('data', (chunk) => {
      //   console.log('chunk', chunk.toString());
      // });

      const out = new Writable({
        write: (chunk, enc, next) => {
          // console.log('chunk', chunk.toString());

          next();
        },
      });
      stream.pipe(out);

      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        console.log(`Line from file: ${line}`);
      });

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

  get defaultPathVariable() {
    const { container } = this;
    if (!container) {
      return '';
    }

    const buffer = cp.execSync(`docker exec ${container.id} printenv ${this.pathVariableName}`);
    return buffer.toString().trim();
  }

  info() {
    return new Executor(async () => {
      const { OSType, Architecture } = await docker.info();
      this.os = Container.Os(OSType);
      this.arch = Container.Arch(Architecture);
    });
  }

  async extractFromImageEnv() {
    const { image } = this.options;
    const img = docker.getImage(image);
    const imageInspectInfo = await img.inspect();

    const env = dotenv.parse(imageInspectInfo.Config.Env.join('\n'));
    console.log('env', env);
  }

  spawnSync(command: string, args: string[], options: ContainerExecOptions = {}) {
    const { container } = this;
    // if (!container) {
    //   return;
    // }
    const {
      env, workdir, privileged, user,
    } = options;
    const dockerArgs = ['exec'];
    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        dockerArgs.push('-e', `${key}=${value}`);
      });
    }

    if (workdir) {
      dockerArgs.push('-w', workdir);
    }

    if (privileged) {
      dockerArgs.push('--privileged');
    }

    if (user) {
      dockerArgs.push('-u', user);
    }

    dockerArgs.push(container!.id);
    dockerArgs.push(command);
    dockerArgs.push(...args);

    return cp.spawnSync('docker', dockerArgs, { encoding: 'utf8' });
  }

  hashFiles(...patterns: string[]) {
    const followSymlink = patterns[0] === '--follow-symbolic-links';
    if (followSymlink) {
      patterns.shift();
    }

    const env = {
      patterns: patterns.join('\n'),
    };

    const { workdir } = this.options;
    const hashFilesScript = this.resolve(hashFilesDir, 'index.cjs');

    const { stderr } = this.spawnSync('node', [hashFilesScript], { env, workdir });

    const matches = stderr.match(/__OUTPUT__([a-fA-F0-9]*)__OUTPUT__/g);
    if (matches && matches.length > 0) {
      return matches[0].slice(10, -10);
    }

    return '';
  }

  resolve(...paths: string[]) {
    if (process.platform === 'win32' && paths.includes('/')) {
      throw Error('You cannot specify linux style local paths (/mnt/etc) on Windows as it does not understand them.');
    }

    const { workdir = '/' } = this.options;

    const absPath = path.resolve(workdir, ...paths);
    const windowsPathRegex = /^([a-zA-Z]):(\\.+)$/;
    const windowsPathComponents = windowsPathRegex.exec(absPath);

    if (windowsPathComponents === null) {
      return absPath;
    }

    // win32
    const driveLetter = windowsPathComponents[1].toLowerCase();
    const translatedPath = windowsPathComponents[2].replace(/\\/g, '/');
    const result = `/mnt/${driveLetter}${translatedPath}`;

    if (path.isAbsolute(path.join(...paths))) {
      return result;
    }

    return translatedPath;
  }
}

export default DockerContainer;
