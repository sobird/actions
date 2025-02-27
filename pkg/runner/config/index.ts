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
  // runner name
  readonly name: string;
  /**
   * The runner context.
   */
  readonly context: Context;

  /**
   * The parent directory of a job's working directory.
   */
  readonly workspace: string;

  /**
   * Working directory
   */
  readonly workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  readonly bindWorkdir?: boolean;

  /**
   * List of labels.
   */
  readonly platforms: Map<string, string>;
  /**
   * Remote name in local git repo config.
   */
  readonly remoteName: string;

  /**
   * Controls if paths in .gitignore should not be copied into container, default true.
   */
  readonly useGitignore?: boolean;

  /**
   * skip local actions/checkout.
   */
  readonly skipCheckout: boolean;

  /**
   * GitHub instance to use, default "github.com".
   */
  readonly serverInstance: string;

  /**
   * The default actions web site.
   */
  readonly actionInstance: string;

  /**
   * Use actions from GitHub Enterprise instance to GitHub.
   */
  readonly replaceGheActionWithGithubCom: string[];

  /**
   * Token of private action repo on GitHub.
   */
  readonly replaceGheActionTokenWithGithubCom: string;

  // logger
  /**
   * Use json or text logger.
   */
  readonly logJson?: boolean;

  /**
   * Log the output from docker run.
   */
  readonly logOutput: boolean;

  /**
   * Switches from the full job name to the job id.
   */
  readonly logPrefixJobID?: boolean;

  /**
   * Switch hiding output when printing to terminal. Doesn't hide secrets while printing logs
   */
  readonly insecureSecrets?: boolean;

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

  /**
   * Use a custom ActionCache Implementation.
   */
  readonly actionCache?: ActionCache;

  // artifact
  /**
   * The path where the artifact server stores uploads and retrieves downloads from.
   * If not specified the artifact server will not start
   */
  readonly artifactPath: string;

  /**
   * The address where the artifact server listens
   */
  readonly artifactAddr: string;

  /**
   * The port where the artifact server listens
   * 0 means to use a random available port.
   */
  readonly artifactPort: number;

  /**
   * Enable cache server to use actions/cache.
   */
  readonly actionsCache: boolean;

  /**
   * The directory to store the cache data.
   * If it's empty, the cache data will be stored in `$ACTIONS_HOME/cache`.
   */
  readonly actionsCachePath: string;

  /**
   * The host of the cache server.
   *
   * It's not for the address to listen, but the address to connect from job containers.
   * So 0.0.0.0 is a bad choice, leave it empty to detect automatically.
   */
  readonly actionsCacheAddr: string;

  /**
   * The port of the cache server.
   *
   * 0 means to use a random available port.
   */
  readonly actionsCachePort: number;

  /**
   * The external cache server URL. Valid only when actions cache enable is true.
   *
   * If it's specified, actions runner will use this URL as the ACTIONS_CACHE_URL rather than start a server by itself.
   * The URL should generally end with "/".
  */
  readonly actionsCacheExternal: string;

  // container
  /**
   * Platform picker, it will take precedence over Platforms if isn't nil.
   * @returns {string} The selected platform.
   */
  readonly platformPicker: (labels: string[]) => string | undefined;

  /**
   * Matrix config to run.
   */
  readonly matrix: Record<string, unknown[]>;
  /**
   * Force pulling of the image, even if already present.
   */
  readonly pull: boolean;
  /**
   * Reuse containers to maintain state.
   */
  readonly reuse?: boolean;
  /**
   * Force rebuilding local docker image action.
   */
  readonly rebuild?: boolean;
  /**
   * The prefix of container name.
   */
  readonly containerNamePrefix?: string;
  /**
   * User namespace to use.
   */
  readonly containerUsernsMode: string;
  /**
   * Use privileged mode.
   */
  readonly containerPrivileged?: boolean;
  /**
   * Desired OS/architecture platform for running containers.
   */
  readonly containerPlatform: string;
  /**
   * List of kernel capabilities to add to the containers.
   */
  readonly containerCapAdd: string[];
  /**
   * List of kernel capabilities to remove from the containers.
   */
  readonly containerCapDrop: string[];
  /**
   * The max lifetime of job containers in seconds.
   */
  readonly containerMaxLifetime: number;
  /**
   * The network mode of job containers (the value of --network).
   */
  readonly containerNetworkMode: HostConfig['NetworkMode'];
  /**
   * Controls if the container is automatically removed upon workflow completion.
   */
  readonly containerAutoRemove?: boolean;
  /**
   * Options for the job container.
   */
  readonly containerOptions: string;
  /**
   * Path to Docker daemon socket.
   */
  readonly containerDaemonSocket: string;
}

export default Config;
