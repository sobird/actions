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

import Dockerode, { ContainerCreateOptions, AuthConfig } from 'dockerode';
import log4js from 'log4js';

import Executor from '@/pkg/common/executor';

const logger = log4js.getLogger();

export interface PullImageInputs {
  force?: boolean;
  platform?: string;
  authconfig?: AuthConfig;
}

export class Docker extends Dockerode {
  async pullImage(repoTag: string, inputs: PullImageInputs = {}) {
    logger.debug('\u{1F433} Docker pull %s', repoTag, inputs.platform ? `(${inputs.platform})` : '');

    const { force, ...options } = inputs;

    const image = this.getImage(repoTag);
    try {
      await image.inspect();
      if (force) {
        await image.remove({ force: true });
      } else {
        return;
      }
    } catch (err) {
      logger.error("Unable to determine if image already exists for image '%s' (%s): %s", repoTag, inputs.platform, (err as Error).message);
    }

    logger.debug(`Pulling image '${repoTag}'${inputs.platform ? `(${inputs.platform})` : ''}`);
    return super.pull(repoTag, options);
  }

  createContainerExecutor(options: ContainerCreateOptions) {
    return new Executor(async () => {
      const container = await this.createContainer(options);

      logger.debug('Created container name=%s id=%s from image %s (platform: %s)', options.name, container.id, options.Image, options.platform);
      logger.debug('ENV ==>', options.Env);
    });
  }

  static SocketLocations = [
    `${os.homedir()}/.docker/run/docker.sock`,
    '/var/run/docker.sock',
    '/run/podman/podman.sock',
    '//./pipe/docker_engine',
    `${os.homedir()}/.colima/docker.sock`,
    process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'docker.sock') : '',
    process.env.XDG_RUNTIME_DIR ? path.join(process.env.XDG_RUNTIME_DIR, 'podman', 'podman.sock') : '',
  ];

  static Host() {
    if (process.env.DOCKER_HOST) {
      return process.env.DOCKER_HOST;
    }

    const socketPath = Docker.SocketLocations.find((p) => {
      return fs.existsSync(p);
    });

    return socketPath ? (socketPath.startsWith('//./') ? 'npipe://' : 'unix://') + socketPath : '';
  }

  // 检查socketPath是否是有效的Docker主机URI

  /**
 * This function, `isHostURI`, takes a string argument `socketPath`. It checks if the
 * socketPath` is a valid Docker host URI. It does this by checking if the scheme of the URI (the
 * part before "://") contains only alphabetic characters. If it does, the function returns true,
 * indicating that the `socketPath` is a Docker host URI. If it doesn't, or if the "://" delimiter
 * is not found in the `socketPath`, the function returns false.
 */
  static isHostURI(socketPath: string) {
    const index = socketPath.indexOf('://');
    if (index !== -1) {
      const scheme = socketPath.substring(0, index);
      return /^[A-Za-z]+$/.test(scheme);
    }
    return false;
  }

  static SocketAndHost(containerSocket: string = '') {
    logger.debug('Handling container host and socket');

    let dockerHost = '';

    // Prefer DOCKER_HOST, don't override it
    dockerHost = Docker.Host();

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
    if (!dockerHost && (socketHost.socket === '-' || !Docker.isHostURI(socketHost.socket) || !socketHost.socket)) {
      dockerHost = Docker.Host();
      socketHost.host = dockerHost;
    }

    // A - (dash) in socketHost.Socket means don't mount, preserve this value
    // otherwise if socketHost.Socket is a filepath don't use it as socket
    // Exit early if we're in an invalid state (e.g. when no DOCKER_HOST and user supplied "-", a dash or omitted)
    if (!dockerHost && socketHost.socket && !Docker.isHostURI(socketHost.socket)) {
      // Cases: 1B, 2B
      // Should we early-exit here, since there is no host nor socket to talk to?
      logger.error(`DOCKER_HOST was not set, couldn't be found in the usual locations, and the container daemon socket ('${socketHost.socket}') is invalid`);
    }

    // Default to DOCKER_HOST if set
    if (!socketHost.socket && dockerHost) {
      // Cases: 4A
      logger.debug('Defaulting container socket to DOCKER_HOST');
      socketHost.socket = socketHost.host;
    }

    // Set sane default socket location if user omitted it
    if (!socketHost.socket) {
      const defaultSocket = Docker.Host();
      // socket is empty if it isn't found, so assignment here is at worst a no-op
      logger.debug("Defaulting container socket to default '%s'", defaultSocket);
      socketHost.socket = defaultSocket;
    }

    // Exit if both the DOCKER_HOST and socket are fulfilled
    if (dockerHost) {
      // Cases: 1A, 2A, 3A, 4A
      if (!Docker.isHostURI(socketHost.socket)) {
        // Cases: 1A, 2A
        logger.debug("DOCKER_HOST is set, but socket is invalid '%s'", socketHost.socket);
      }
      return socketHost;
    }

    // Set a sane DOCKER_HOST default if we can
    if (Docker.isHostURI(socketHost.socket)) {
      // Cases: 3B
      logger.debug("Setting DOCKER_HOST to container socket '%s'", socketHost.socket);
      socketHost.host = socketHost.socket;
      // Both DOCKER_HOST and container socket are valid; short-circuit exit
      return socketHost;
    }

    // Here there is no DOCKER_HOST _and_ the supplied container socket is not a valid URI (either invalid or a file path)
    // Cases: 2B <- but is already handled at the top
    // I.e. this path should never be taken
    logger.error(`no DOCKER_HOST and an invalid container socket '${socketHost.socket}'`);
    socketHost.socket = '';
    return socketHost;
  }

  static SocketMountPath(socketPath: string) {
    const protoIndex = socketPath.indexOf('://');
    if (protoIndex !== -1) {
      const scheme = socketPath.substring(0, protoIndex);
      if (scheme.toLowerCase() === 'npipe') {
        // Linux container mount on Windows, use the default socket path of the VM / WSL2
        return '/var/run/docker.sock';
      } if (scheme.toLowerCase() === 'unix') {
        return socketPath.substring(protoIndex + 3);
      } if (/[^a-zA-Z]/.test(scheme)) {
        // Unknown protocol, use default
        return '/var/run/docker.sock';
      }
    }
    return socketPath;
  }
}

// Docker Singleton
export default new Docker();
