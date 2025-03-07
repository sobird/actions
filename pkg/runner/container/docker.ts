/* eslint-disable no-param-reassign */
/**
 * Docker Container
 *
 * @deprecated see index.test.ts
 *
 * sobird<i@sobird.me> at 2024/06/24 15:21:27 created.
 */

import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import tty from 'node:tty';

import Dockerode, {
  NetworkInspectInfo, AuthConfig, MountConfig,
} from 'dockerode';
import dotenv from 'dotenv';
import ignore from 'ignore';
import log4js from 'log4js';
// import shellQuote from 'shell-quote';
import * as tar from 'tar';

import Executor, { Conditional } from '@/pkg/common/executor';
import docker from '@/pkg/docker';
import DockerDemuxer from '@/pkg/docker/demuxer';
import Options from '@/pkg/docker/options';
import Runner from '@/pkg/runner';

import Container, { FileEntry, ContainerExecOptions } from '.';
import OutputManager from '../outputManager';

const logger = log4js.getLogger();

export interface DockerContainerOptions {
  /** container name */
  name: string;
  /** Name of the image as it was passed by the operator (e.g. could be symbolic) */
  image: string;
  /** force pull image */
  pull?: boolean;
  /** Current directory (PWD) in the command will be launched */
  workdir: string;
  /** Set platform if server is multi-platform capable */
  platform?: string;
  /** Entrypoint to run when starting the container */
  entrypoint?: string[];
  cmd?: string[];
  env?: NodeJS.ProcessEnv;
  authconfig?: AuthConfig;
  ports?: string[];
  exposedPorts?: { [port: string]: {} };
  portBindings?: any;

  /** Automatically remove the container when it exits */
  autoRemove?: boolean;
  binds?: string[];
  mounts?: MountConfig;

  networkMode?: 'default' | 'host' | 'bridge' | 'container' | 'none' | string;
  capAdd?: string[];
  capDrop?: string[];
  privileged?: boolean;
  usernsMode?: string;
  networkAlias?: string[];
  options: string;

  stdout: OutputManager;
  stderr: OutputManager;
}

const isatty = tty.isatty(process.stdout.fd);
// const isTerminal = process.stdout.isTTY;

class DockerContainer extends Container {
  static docker = docker;

  container?: Dockerode.Container;

  network?: Dockerode.Network;

  OS: string = '';

  Arch: string = '';

  Environment = 'github-hosted';

  declare options: DockerContainerOptions;

  async context() {
    if (!this.container) {
      return {
        id: '',
        network: '',
        ports: {},
      };
    }

    const containerInfo = await this.container?.inspect();
    const { Ports, Networks } = containerInfo.NetworkSettings;

    const networks = Object.entries(Networks);
    const [[network]] = networks;

    return {
      id: this.container?.id || '',
      network: network || '',
      ports: Object.fromEntries(Object.entries(Ports).map(([containerPort, HostInfos]) => {
        const [HostInfo] = HostInfos;
        return [parseInt(containerPort, 10), HostInfo.HostPort];
      })),
    };
  }

  pullImage(force?: boolean) {
    return new Executor(async () => {
      const {
        image, platform, authconfig, pull,
      } = this.options;

      const stream = await docker.pullImage(image, {
        force: force ?? pull,
        platform,
        authconfig,
      });

      if (!stream) {
        return;
      }

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        }, (event) => {
          console.log(`${event.id ? `${event.id}: ` : ''}${event.status}`);
        });
      });
    });
  }

  create() {
    return Executor.Pipeline(this.findContainer()).finally(this.createContainer());
  }

  start(attach: boolean = false) {
    return Executor.Pipeline(
      this.findContainer(),
      this.pullImage(),
      this.createContainer(),
      this.attachContainer().ifBool(attach),
      this.startContainer(),
      this.info(),
    ).finally(this.putHashFileExecutor);
  }

  stop() {
    return this.findContainer().finally(this.stopContainer());
  }

  remove() {
    return this.findContainer().finally(this.removeContainer());
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

      const options: tar.TarOptionsWithAliasesAsyncNoFile = {
        cwd: info.dir,
        prefix: dest,
        portable: true,
      };

      const ignorefile = path.join(source, '.gitignore');
      if (useGitIgnore && fs.existsSync(ignorefile)) {
        const ig = ignore({
          ignorecase: false,
        }).add(fs.readFileSync(ignorefile).toString());
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
        logger.debug('\u{1F433}', `Upload file from '${source}' to '${dest}'`);
        return await container.putArchive((pack as unknown as NodeJS.ReadableStream), {
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
          // ctime: new Date(),
          // atime: new Date(),
        });
        header.encode();

        const entry = new tar.ReadEntry(header);
        entry.end(content);
        pack.add(entry);

        logger.debug('\u{1F433}', `Extracting content to '${path.join(dest, file.name)}'`);
      }
      pack.end();

      try {
        await container.putArchive((pack as unknown as NodeJS.ReadableStream), {
          path: '/',
        });
      } catch (err) {
        logger.error('Failed to copy content to container: %s', (err as Error).message);
      }
    });
  }

  putArchive(destination: string, archive: NodeJS.ReadableStream) {
    return new Executor(async () => {
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
        const stream = await container.putArchive(archive, {
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
    });
  }

  async getArchive(destination: string) {
    const { container } = this;

    const dest = this.resolve(destination);

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
    return Executor.Pipeline(
      this.findNetwork(name),
      new Executor(async () => {
        const { network } = this;
        if (network) {
          logger.debug('\u{1F433}', `Network ${name} exists`);
          return;
        }

        // Only create the network if it doesn't exist
        this.network = await docker.createNetwork({
          Name: name,
        });
      }),
    );
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
        logger.debug('\u{1F433}', `Disconnect Network: ${network.id}`);
        delete this.container;
      } catch (err) {
        logger.error('\u{1F433}', `Failed to Disconnect Network: ${(err as Error).message}`);
      }
    });
  }

  removeNetwork(name: string) {
    return Executor.Pipeline(
      this.findNetwork(name),
      new Executor(async () => {
        const { network } = this;
        if (!network) {
          return;
        }

        const networkInspectInfo: NetworkInspectInfo = await network.inspect();

        if (Object.keys(networkInspectInfo?.Containers || {}).length === 0) {
          await network.remove();
          delete this.network;
        } else {
          logger.debug('\u{1F433}', `Refusing to remove network ${name} because it still has active endpoints`);
        }
      }),
    );
  }

  private findContainer() {
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

  private createContainer() {
    return new Executor(async () => {
      const { options } = this;

      const Env = Object.entries(options.env || {}).map(([key, value]) => { return `${key}=${value}`; });

      // const Mounts: MountConfig = Object.entries(options.mounts || {}).map(([Source, Target]) => {
      //   return {
      //     Type: 'volume',
      //     Source,
      //     Target,
      //   };
      // });

      // const NetworkMode = options.networkMode || 'default';
      // const isNetworkMode = ['default', 'host', 'bridge', 'container', 'none'].includes(NetworkMode);
      // let endpointsConfig: EndpointsConfig = {};
      // if (!isNetworkMode && options.networkMode !== 'host' && (options.networkAlias || []).length > 0) {
      //   const endpointSettings: EndpointSettings = {
      //     Aliases: options.networkAlias,
      //   };

      //   endpointsConfig = {
      //     [NetworkMode]: endpointSettings,
      //   };
      // }

      const dockerodeOptions = new Options(options.options).dockerodeOptions({
        name: options.name,
        image: options.image,
        workdir: this.resolve(options.workdir),
        entrypoint: options.entrypoint,
        platform: options.platform,
        tty: isatty,
        cmd: options.cmd,
        env: Env,
        publish: options.ports,
        rm: Boolean(options.autoRemove),
        network: options.networkMode,
        networkAlias: options.networkAlias,
        mount: options.mounts,
        capAdd: options.capAdd,
        capDrop: options.capDrop,
        privileged: Boolean(options.privileged),
        userns: options.usernsMode,
        volume: options.binds,
      });

      const container = await docker.createContainer(dockerodeOptions);

      logger.debug('\u{1F433}', `Created container name=${options.name} id=${container.id} from image ${options.image} (platform: ${options.platform || ''})`);

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
        logger.debug('\u{1F433}', `Starting container: ${container.id}`);
        await container.start();
        logger.debug('\u{1F433}', `Started container: ${container.id}`);
      } catch (err) {
        logger.warn('\u{1F433}', `Failed to start container: ${(err as Error).message}`);
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
        logger.debug('\u{1F433}', `Stoping container: ${container.id}`);
        await container.stop();
        logger.debug('\u{1F433}', `Stoped container: ${container.id}`);
        delete this.container;
      } catch (err) {
        logger.error('\u{1F433}', `Failed to stop container: ${(err as Error).message}`);
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
        await container.remove({ volumes: true, force: true });
        logger.debug('\u{1F433}', `Removed container: ${container.id}`);
        delete this.container;
      } catch (error) {
        logger.error('\u{1F433}', `Failed to remove container: ${(error as Error).message}`);
      }
    });
  }

  attachContainer() {
    return new Executor(async () => {
      const { container } = this;
      if (!container) {
        return;
      }

      try {
        const output = await container.attach({ stream: true, stdout: true, stderr: true });
        // todo stdCopy

        output.pipe(process.stdout);
      } catch (error) {
        logger.error('\u{1F433}', `Failed to attach to container: ${(error as Error).message}`);
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

      logger.debug('\u{1F433}', `Return status: ${StatusCode}`);

      if (StatusCode === 0) {
        return;
      }
      throw new Error(`Container exited with status code: ${StatusCode}`);
    });
  }

  removeVolume(name: string) {
    return new Executor(async () => {
      try {
        const volume = docker.getVolume(name);
        await volume.remove();
        logger.debug('\u{1F433}', `Removed volume: ${name}`);
      } catch (err) {
        //
      }
    }).if(new Conditional(() => {
      return !this.container;
    }));
  }

  exec(command: string[], { cwd = '', env, user }: ContainerExecOptions = {}) {
    return new Executor(async () => {
      const { container } = this;
      if (!container) {
        return;
      }

      // todo

      const WorkingDir = this.resolve(this.options.workdir, cwd);
      const Env = Object.entries(env || {}).map(([key, value]) => { return `${key}=${value}`; });

      const exec = await container.exec({
        WorkingDir,
        Cmd: command,
        Env,
        Tty: isatty,
        User: user,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = (await exec.start({
        hijack: true,
        stdin: true,
        // Detach: true,
        // https://github.com/apocas/dockerode/issues/736
        Tty: isatty,
      }));

      if (isatty) {
        readline.createInterface({
          input: stream,
        }).on('line', async (line) => {
          this.options.stdout?.onDataReceived(line);
        });
      } else {
        const child = stream.pipe(new DockerDemuxer());
        readline.createInterface({
          input: child.stdout,
        }).on('line', async (line) => {
          this.options.stdout?.onDataReceived(line);
        });

        readline.createInterface({
          input: child.stderr,
        }).on('line', async (line) => {
          this.options.stderr?.onDataReceived(line);
        });
      }

      await new Promise((resolve, reject) => {
        stream.on('end', async () => {
          const inspect = await exec.inspect();

          switch (inspect.ExitCode) {
            case 0:
              resolve(null);
              break;
            case 127:
              reject(Error(`Process completed with exit code ${inspect.ExitCode}.`));
              break;
            default:
              reject(Error(`Process completed with exit code ${inspect.ExitCode}.`));
          }
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
      this.OS = Container.OS(OSType);
      this.Arch = Container.Arch(Architecture);
    });
  }

  async imageEnv() {
    const { image } = this.options;
    const img = docker.getImage(image);
    const imageInspectInfo = await img.inspect();

    return dotenv.parse(imageInspectInfo.Config.Env.join('\n'));
  }

  spawnSync(command: string, args: string[], options: ContainerExecOptions = {}) {
    const { container } = this;
    const {
      cwd, env, privileged, user,
    } = options;

    const dockerArgs = ['exec'];
    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        dockerArgs.push('-e', `${key}=${value}`);
      });
    }

    if (cwd) {
      dockerArgs.push('-w', cwd);
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

  resolve(...paths: string[]) {
    const dir = DockerContainer.Normalize(path.join(...paths));
    return path.posix.resolve(this.workspace, dir);
  }

  // static Resolve(...paths: string[]) {
  //   const normalizedPath = path.join(...paths).replace(/\\/g, '/');
  //   if (normalizedPath.startsWith('/mnt/')) {
  //     return normalizedPath;
  //   }

  //   const absPath = path.resolve(...paths);
  //   const windowsPathRegex = /^([a-zA-Z]):(\\.*)$/;
  //   const windowsPathComponents = windowsPathRegex.exec(absPath);

  //   if (windowsPathComponents === null) {
  //     return absPath;
  //   }

  //   // win32
  //   const driveLetter = windowsPathComponents[1].toLowerCase();
  //   const translatedPath = windowsPathComponents[2].replace(/\\/g, '/');
  //   const result = `/mnt/${driveLetter}${translatedPath}`;

  //   return result;
  // }

  static Setup(runner: Runner) {
    return new Executor(() => {
      const { config } = runner;
      const image = runner.PlatformImage;
      const credentials = runner.Credentials;
      const outputManager = new OutputManager(runner);

      logger.debug('\u{1F338}', `Start image=${image}`);

      const name = runner.ContainerName();
      // specify the network to which the container will connect when `docker create` stage. (like execute command line: docker create --network <networkName> <image>)
      // if using service containers, will create a new network for the containers.
      // and it will be removed after at last.
      const [networkName, createAndDeleteNetwork] = runner.ContainerNetworkName();
      const mounts = runner.Mounts;

      let containerNetworkMode = config.containerNetworkMode || 'host';
      if (runner.ContainerImage) {
        containerNetworkMode = networkName;
      }

      containerNetworkMode = networkName;

      runner.services = Object.fromEntries(Object.entries(runner.run.job.services || {}).map(([serviceId, service]) => {
        const serviceEnv = service.env?.evaluate(runner);
        const serviceCredentials = service.credentials?.evaluate(runner);
        const serviceName = runner.ContainerName(serviceId);
        const serviceMounts = runner.ServiceMounts(service.volumes);
        // const { exposedPorts, portBindings } = service.parsePorts();

        const serviceContainer = new DockerContainer({
          name: serviceName,
          image: service.image.evaluate(runner),
          pull: config.pull,
          workdir: config.workdir,
          authconfig: {
            ...serviceCredentials,
          },
          // binds: serviceBinds,
          mounts: serviceMounts,
          env: serviceEnv,
          networkMode: networkName,
          networkAlias: [serviceId],
          autoRemove: config.containerAutoRemove,
          privileged: config.containerPrivileged,
          usernsMode: config.containerUsernsMode,
          platform: config.containerPlatform,
          capAdd: config.containerCapAdd,
          capDrop: config.containerCapDrop,
          // portBindings,
          // exposedPorts,
          ports: service.ports,
          stdout: outputManager,
          stderr: outputManager,
          options: service.options,
        }, config.workspace);

        return [serviceId, serviceContainer];
      }));

      const containerOptions = runner.run.job.container.options || config.containerOptions;
      const dockerContainer = new DockerContainer({
        name,
        image,
        pull: config.pull,
        workdir: config.workdir,
        entrypoint: ['tail', '-f', '/dev/null'],
        // entrypoint: ['/bin/sleep', `${config.containerMaxLifetime}`],
        cmd: [],
        authconfig: {
          ...credentials,
        },
        // binds,
        mounts,
        env: {
          LANG: 'C.UTF-8',
        },
        networkMode: containerNetworkMode,
        networkAlias: [runner.name],
        autoRemove: config.containerAutoRemove,
        privileged: config.containerPrivileged,
        usernsMode: config.containerUsernsMode,
        platform: config.containerPlatform,
        capAdd: config.containerCapAdd,
        capDrop: config.containerCapDrop,
        // portBindings: {},
        // exposedPorts: {},
        stdout: outputManager,
        stderr: outputManager,

        options: containerOptions,
      }, config.workspace);
      runner.container = dockerContainer;

      const reuseContainer = new Conditional(() => {
        return Boolean(config.reuse);
      });

      runner.cleanContainerExecutor = Executor.Pipeline(
        dockerContainer.remove().ifNot(reuseContainer),
        dockerContainer.removeVolume(runner.ContainerName()).ifNot(reuseContainer),
        dockerContainer.removeVolume(`${runner.ContainerName()}-env`).ifNot(reuseContainer),
        new Executor(async () => {
          if (Object.keys(runner.services).length > 0) {
            logger.info('\u{1F433}', `Cleaning up services for job ${runner.name}`);
            await runner.stopServices().execute();
          }

          if (createAndDeleteNetwork) {
            // clean network if it has been created by actions
            // if using service containers
            // it means that the network to which containers are connecting is created by `act_runner`,
            // so, we should remove the network at last.
            logger.info('\u{1F433}', `Cleaning up network for Job: ${runner.name}, and network name is: ${networkName}`);
            await dockerContainer.removeNetwork(networkName).execute();
          }
        }),
      );

      return Executor.Pipeline(
        // runner.pullServicesImage(),
        dockerContainer.createNetwork(networkName).if(new Conditional(() => { return createAndDeleteNetwork; })),
        runner.startServices(),
        dockerContainer.start(),
      );
    });
  }
}

export default DockerContainer;
