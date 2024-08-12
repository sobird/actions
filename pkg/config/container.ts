class Container {
  public workdir: string;

  /**
   * Specifies the network to which the container will connect.
   * Could be host, bridge or the name of a custom network.
   * If it's empty, runner will create a network automatically.
   */
  public network: string;

  /**
   * Whether to use privileged mode or not when launching task containers (privileged mode is required for Docker-in-Docker).
   */
  public privileged: boolean;

  /**
   * Volumes (including bind mounts) can be mounted to containers. Glob syntax is supported, see https://github.com/gobwas/glob
   * You can specify multiple volumes. If the sequence is empty, no volumes can be mounted.
   * For example, if you only allow containers to mount the `data` volume and all the json files in `/src`, you should change the config to:
   * ```yaml
   * valid_volumes:
   *   - data
   *   - /src/*.json
   * ```
   *  If you want to allow any volume, please use the following configuration:
   * ```yaml
   * valid_volumes:
   *   - '**'
   * ```
   */
  public validVolumes: string[] = [];

  /**
   * overrides the docker client host with the specified one.
   *
   * * If it's empty, runner will find an available docker host automatically.
   * * If it's "-", runner will find an available docker host automatically, but the docker host won't be mounted to the job containers and service containers.
   * * If it's not empty or "-", the specified docker host will be used. An error will be returned if it doesn't work.
   */
  public dockerHost: string = '';

  /**
   * Pull docker image(s) even if already present
   */
  public forcePull: boolean;

  /**
   * Rebuild docker image(s) even if already present
   */
  public forceRebuild: boolean;

  /**
   * And other options to be used when the container is started (eg, --add-host=my.gitea.url:host-gateway).
   */
  public options: string;

  constructor(container: Container) {
    this.workdir = container.workdir ?? '/home/runner';
    this.network = container.network ?? '';
    this.privileged = container.privileged ?? false;

    this.dockerHost = container.dockerHost ?? '';
    this.forcePull = container.forcePull ?? true;
    this.forceRebuild = container.forceRebuild ?? false;
    this.options = container.options ?? '';
  }
}

export default Container;
