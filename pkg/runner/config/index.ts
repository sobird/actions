/**
 * Runner Config
 *
 * sobird<i@sobird.me> at 2024/05/07 16:01:08 created.
 */

import { HostConfig } from 'dockerode';
import { Level } from 'log4js';

import ActionCache from '@/pkg/runner/action/cache';
import Context from '@/pkg/runner/context';
// import Container from './container';

/**
 * The configuration interface for the runner.
 */
interface Config {
  /**
   * The runner context.
   */
  readonly context: Context;

  readonly workspace: string;

  /**
   * path to working directory
   */
  readonly workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  readonly bindWorkdir?: boolean;

  /**
   * Use a custom ActionCache Implementation.
   */
  readonly actionCache?: ActionCache;

  /**
   * The default actions web site.
   */
  readonly actionInstance: string;

  /**
   * Remote name in local git repo config.
   */
  readonly remoteName: string;

  /**
   * Reuse containers to maintain state.
   */
  readonly reuseContainers?: boolean;

  /**
   * Log the output from docker run.
   */
  readonly logOutput: boolean;

  /**
   * Use json or text logger.
   */
  readonly logJson?: boolean;

  /**
   * Switches from the full job name to the job id.
   */
  readonly logPrefixJobID?: boolean;

  /**
   * GitHub token.
   */
  readonly token?: string;

  /**
   * Switch hiding output when printing to terminal. Doesn't hide secrets while printing logs
   */
  readonly insecureSecrets?: boolean;

  /**
   * List of labels.
   */
  readonly platforms: Map<string, string>;

  /**
   * Platform picker, it will take precedence over Platforms if isn't nil.
   * @returns {string} The selected platform.
   */
  readonly platformPicker: (labels: string[]) => string | undefined;

  /**
   * Controls if paths in .gitignore should not be copied into container, default true.
   */
  readonly useGitignore?: boolean;

  /**
   * GitHub instance to use, default "github.com".
   */
  readonly serverInstance: string;

  /**
   * skip local actions/checkout.
   */
  readonly skipCheckout: boolean;

  /**
   * Use actions from GitHub Enterprise instance to GitHub.
   */
  readonly replaceGheActionWithGithubCom: string[];

  /**
   * Token of private action repo on GitHub.
   */
  readonly replaceGheActionTokenWithGithubCom: string;

  /**
   * Matrix config to run.
   */
  readonly matrix: Record<string, unknown[]>;

  /**
   * The level of job logger.
   * @type {LogLevel}
   */
  readonly loggerLevel?: Level;

  /**
   * Only volumes (and bind mounts) in this slice can be mounted on the job container or service containers.
   */
  readonly validVolumes?: string[];

  /**
   * Whether to skip verifying TLS certificate of the Gitea instance.
   */
  readonly insecureSkipTLS?: boolean;

  // container: Container;
  /**
   * Force pulling of the image, even if already present.
   */
  pull: boolean;

  /**
   * Force rebuilding local docker image action.
   */
  rebuild?: boolean;

  /**
   * Use privileged mode.
   */
  containerPrivileged?: boolean;

  /**
   * User namespace to use.
   */
  containerUsernsMode: string;

  /**
   * Desired OS/architecture platform for running containers.
   */
  containerPlatform: string;

  /**
   * Path to Docker daemon socket.
   */
  containerDaemonSocket: string;

  /**
   * List of kernel capabilities to add to the containers.
   */
  containerCapAdd: string[];

  /**
   * List of kernel capabilities to remove from the containers.
   */
  containerCapDrop: string[];

  /**
   * The prefix of container name.
   */
  containerNamePrefix?: string;

  /**
   * The max lifetime of job containers in seconds.
   */
  containerMaxLifetime: number;

  /**
   * The network mode of job containers (the value of --network).
   */
  containerNetworkMode: HostConfig['NetworkMode'];

  /**
   * Controls if the container is automatically removed upon workflow completion.
   */
  containerAutoRemove?: boolean;

  /**
   * Options for the job container.
   */
  containerOptions: string;

  // artifact
  /**
   * artifact server path
   */
  artifactPath: string;

  artifactAddr: string;

  artifactPort: number;

  /**
   * Enable cache server to use actions/cache.
   */
  actionsCache: boolean;

  /**
   * The directory to store the cache data.
   * If it's empty, the cache data will be stored in `$ACTIONS_HOME/cache`.
   */
  actionsCachePath: string;

  /**
   * The host of the cache server.
   *
   * It's not for the address to listen, but the address to connect from job containers.
   * So 0.0.0.0 is a bad choice, leave it empty to detect automatically.
   */
  actionsCacheAddr: string;

  /**
   * The port of the cache server.
   *
   * 0 means to use a random available port.
   */
  actionsCachePort: number;

  /**
   * The external cache server URL. Valid only when actions cache enable is true.
   *
   * If it's specified, actions runner will use this URL as the ACTIONS_CACHE_URL rather than start a server by itself.
   * The URL should generally end with "/".
  */
  actionsCacheExternal: string;
}

export default Config;
