import { HostConfig } from 'dockerode';

class Container {
  /**
   * Force pulling of the image, even if already present.
   */
  readonly forcePull: boolean;

  /**
     * Force rebuilding local docker image action.
     */
  readonly forceRebuild: boolean;

  /**
   * Use privileged mode.
   */
  privileged?: boolean;

  /**
   * User namespace to use.
   */
  usernsMode: string;

  /**
   * Desired OS/architecture platform for running containers.
   */
  platform: string;

  /**
   * Path to Docker daemon socket.
   */
  daemonSocket: string;

  /**
   * Options for the job container.
   */
  options: string;

  /**
   * List of kernel capabilities to add to the containers.
   */
  capAdd: string[];

  /**
   * List of kernel capabilities to remove from the containers.
   */
  capDrop: string[];

  /**
   * The prefix of container name.
   */
  namePrefix: string;

  /**
   * The max lifetime of job containers in seconds.
   */
  maxLifetime: number;

  /**
   * The network mode of job containers (the value of --network).
   */
  networkMode: HostConfig['NetworkMode'];

  /**
   * Controls if the container is automatically removed upon workflow completion.
   */
  autoRemove: boolean;

  constructor(container: Container) {
    this.forcePull = container.forcePull ?? false;
    this.forceRebuild = container.forceRebuild ?? false;

    this.privileged = container.privileged ?? false;
    this.usernsMode = container.usernsMode ?? '';
    this.platform = container.platform ?? '';
    this.daemonSocket = container.daemonSocket ?? '';
    this.options = container.options ?? '';

    this.capAdd = container.capAdd;
    this.capDrop = container.capDrop ?? [];
    this.namePrefix = container.namePrefix ?? 'ACTIONS';
    this.maxLifetime = container.maxLifetime;
    this.networkMode = container.networkMode;
    this.autoRemove = container.autoRemove ?? true;
  }
}

export default Container;
