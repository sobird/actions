/**
 *
 * envs
 * DOCKER_HOST,SSH_AUTH_SOCK,DOCKER_PATH_PREFIX,DOCKER_CERT_PATH,DOCKER_CLIENT_TIMEOUT
 *
 * sobird<i@sobird.me> at 2024/04/25 19:09:50 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Dockerode, { ContainerCreateOptions } from 'dockerode';
import log4js from 'log4js';

import Executor from '@/pkg/common/executor';

const logger = log4js.getLogger();

export const dockerSocketLocations = [
  '$HOME/.docker/run/docker.sock',
  '/var/run/docker.sock',
  '/run/podman/podman.sock',
  '//./pipe/docker_engine',
  '$HOME/.colima/docker.sock',
  process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'docker.sock') : '',
  process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'podman', 'podman.sock') : '',
];

const socketPath = process.env.DOCKER_HOST || dockerSocketLocations.find((p) => {
  return fs.existsSync(p);
});

export interface DockerPullImageInputs {
  image: string;
  force?: boolean;
  platform?: string;
  username?: string;
  password?: string;
}

export class Docker extends Dockerode {
  static get instance() {
    return 1212;
  }

  pullExecutor(input: DockerPullImageInputs) {
    return new Executor(async () => {
      logger.debug('\u{0001F433} Docker pull %s', input.image);

      const {
        image, force, platform, ...auth
      } = input;

      const img = this.getImage(image);
      try {
        await img.inspect();
        if (force) {
          await img.remove({ force: true });
        } else {
          return;
        }
      } catch (err) {
        logger.error("Unable to determine if image already exists for image '%s' (%s): %s", input.image, input.platform, (err as Error).message);
      }

      await new Promise((resolve, reject) => {
        logger.debug("Pulling image '%s' (%s)", image, platform);
        this.pull(image, {
          platform,
        }, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          this.modem.followProgress(stream!, (err2, output) => {
            if (err2) {
              reject(err2);
            } else {
              resolve(output);
            }
          });
        }, auth);
      });
    });
  }

  createContainerExecutor(options: ContainerCreateOptions) {
    return new Executor(async () => {
      const container = await this.createContainer(options);

      logger.debug('Created container name=%s id=%s from image %s (platform: %s)', options.name, container.id, options.Image, options.platform);
      logger.debug('ENV ==> %o', options.Env);
    });
  }
}

// Docker Singleton
export default new Docker();

// 获取 Docker Host 路径
export function getDockerHost(configDockerHost?: string) {
  // a `-` means don't mount the docker socket to job containers
  if (configDockerHost && configDockerHost !== '-') {
    return configDockerHost;
  }

  if (process.env.DOCKER_HOST) {
    return process.env.DOCKER_HOST;
  }

  const protocol = /^\\\\.\\pipe\\docker_engine/.test(socketPath!) ? 'npipe://' : 'unix://';
  return protocol + socketPath;
}

// const docker = new Docker();

// docker.pullExecutor({
//   image: 'alpine',
//   force: true,
// }).execute();

// const images = await docker.listImages();
// console.log('images', images.length);

// const container = await docker.createContainer({
//   Image: 'gitea/runner-images:ubuntu-latest',
//   name: 'docker_c_test_name',
//   AttachStdin: false,
//   AttachStdout: true,
//   AttachStderr: true,
//   Tty: true,
//   // Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
//   OpenStdin: false,
//   StdinOnce: false,
// });
// const data = await container.start();
// console.log('data', data.toString());

// const container = docker.getContainer('296e7501a56ca880d738157f2ab8abeb1c0fa8f637bd31145c03c3192e9ba87b');

// 获取日志
// container.logs({
//   follow: true, // 实时获取日志
//   stdout: true, // 获取标准输出日志
//   stderr: true, // 获取标准错误日志
// }, (error, stream) => {
//   if (error) {
//     return console.error(error);
//   }

//   // 流式传输日志
//   let containerLogs = '';
//   stream.setEncoding('utf8');
//   stream.on('data', (chunk) => {
//     containerLogs += chunk;
//   });
//   stream.on('end', () => {
//     console.log('日志结束:\n', containerLogs);
//   });
//   stream.on('error', (error) => {
//     console.error('流式日志出错:', error);
//   });
// });

// container.exec({
//   Cmd: ['sh', '-c', 'ls /'], // 替换为你要执行的命令
//   AttachStdout: true,
//   AttachStderr: true,
//   Tty: true,
// }, (err, exec) => {
//   if (err) {
//     console.error('Error executing command:', err);
//     return;
//   }

//   // exec?.resize({ h: 720, w: 120 }); // 根据需要设置终端大小

//   // 启动 exec 实体
//   const stream1 = exec?.start({}, (err, stream) => {
//     if (err) {
//       console.error('Error starting exec stream:', err);
//       return;
//     }

//     // 监听输出
//     stream?.on('data', (data) => {
//       process.stdout.write(data);
//     });
//     stream?.on('error', (err) => {
//       console.error('Error on exec stream:', err);
//     });
//     stream?.on('end', () => {
//       console.log('Exec stream ended.');
//     });
//   });
// });
// console.log('res', res);

/** returns socket URI or false if not found any */
export function socketLocation() {
  const dockerHost = process.env.DOCKER_HOST;
  if (dockerHost) {
    return dockerHost;
  }

  for (const p of dockerSocketLocations) {
    const expandedPath = p.replace('$HOME', os.homedir());
    const stats = fs.statSync(expandedPath);
    if (stats.isSocket()) {
      return `unix://${path.posix.normalize(expandedPath)}`;
    }
  }
  return '';
}

// 检查daemonPath是否是有效的Docker主机URI

/**
 * This function, `isDockerHostURI`, takes a string argument `daemonPath`. It checks if the
 * daemonPath` is a valid Docker host URI. It does this by checking if the scheme of the URI (the
 * part before "://") contains only alphabetic characters. If it does, the function returns true,
 * indicating that the `daemonPath` is a Docker host URI. If it doesn't, or if the "://" delimiter
 * is not found in the `daemonPath`, the function returns false.
 */
function isDockerHostURI(daemonPath: string) {
  const protoIndex = daemonPath.indexOf('://');
  if (protoIndex !== -1) {
    const scheme = daemonPath.substring(0, protoIndex);
    return /^[A-Za-z]+$/.test(scheme);
  }
  return false;
}

export function getSocketAndHost(containerSocket: string = '') {
  logger.debug('Handling container host and socket');

  let dockerHost = '';

  // Prefer DOCKER_HOST, don't override it
  dockerHost = socketLocation();

  const socketHost = {
    socket: containerSocket,
    host: dockerHost,
  };

  // ** socketHost.Socket cases **
  // Case 1: User does _not_ want to mount a daemon socket (passes a dash)
  // Case 2: User passes a filepath to the socket; is that even valid?
  // Case 3: User passes a valid socket; do nothing
  // Case 4: User omitted the flag; set a sane default

  // ** DOCKER_HOST cases **
  // Case A: DOCKER_HOST is set; use it, i.e. do nothing
  // Case B: DOCKER_HOST is empty; use sane defaults

  // Set host for sanity's sake, when the socket isn't useful
  if (!dockerHost && (socketHost.socket === '-' || !isDockerHostURI(socketHost.socket) || !socketHost.socket)) {
    dockerHost = socketLocation();
    socketHost.host = dockerHost;
  }

  // A - (dash) in socketHost.Socket means don't mount, preserve this value
  // otherwise if socketHost.Socket is a filepath don't use it as socket
  // Exit early if we're in an invalid state (e.g. when no DOCKER_HOST and user supplied "-", a dash or omitted)
  if (!dockerHost && socketHost.socket && !isDockerHostURI(socketHost.socket)) {
    // Cases: 1B, 2B
    // Should we early-exit here, since there is no host nor socket to talk to?
    throw new Error(`DOCKER_HOST was not set, couldn't be found in the usual locations, and the container daemon socket ('${socketHost.socket}') is invalid`);
  }

  // Default to DOCKER_HOST if set
  if (!socketHost.socket && dockerHost) {
    // Cases: 4A
    logger.debug('Defaulting container socket to DOCKER_HOST');
    socketHost.socket = socketHost.host;
  }

  // Set sane default socket location if user omitted it
  if (!socketHost.socket) {
    const defaultSocket = socketLocation();
    // socket is empty if it isn't found, so assignment here is at worst a no-op
    logger.debug("Defaulting container socket to default '%s'", defaultSocket);

    socketHost.socket = defaultSocket;
  }

  // Exit if both the DOCKER_HOST and socket are fulfilled
  if (dockerHost) {
    // Cases: 1A, 2A, 3A, 4A
    if (!isDockerHostURI(socketHost.socket)) {
      // Cases: 1A, 2A
      logger.debug("DOCKER_HOST is set, but socket is invalid '%s'", socketHost.socket);
    }
    return socketHost;
  }

  // Set a sane DOCKER_HOST default if we can
  if (isDockerHostURI(socketHost.socket)) {
    // Cases: 3B
    logger.debug("Setting DOCKER_HOST to container socket '%s'", socketHost.socket);
    socketHost.host = socketHost.socket;
    // Both DOCKER_HOST and container socket are valid; short-circuit exit
    return socketHost;
  }

  // Here there is no DOCKER_HOST _and_ the supplied container socket is not a valid URI (either invalid or a file path)
  // Cases: 2B <- but is already handled at the top
  // I.e. this path should never be taken
  throw new Error(`no DOCKER_HOST and an invalid container socket '${socketHost.socket}'`);
}
