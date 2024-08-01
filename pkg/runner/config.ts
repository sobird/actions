/**
 * Runner Config
 *
 * sobird<i@sobird.me> at 2024/05/07 16:01:08 created.
 */

import { HostConfig } from 'dockerode';
import { Level } from 'log4js';

import ActionCache from '@/pkg/runner/action/cache';
import Context from '@/pkg/runner/context';

/**
 * The configuration interface for the runner.
 */
class Config {
  /**
   * The preset runner context.
   */
  readonly context: Context;

  readonly workspace: string;

  /**
   * Bind the workspace to the job container.
   */
  readonly bind: boolean;

  /**
   * Use a custom ActionCache Implementation.
   */
  actionCache: ActionCache;

  /**
   * When offline, use caching action contents.
   */
  actionOfflineMode: boolean;

  /**
   * Path to the JSON file to use for event.json in containers.
   */
  eventPath: string;

  /**
   * Remote name in local git repo config.
   */
  remoteName: string;

  /**
   * Reuse containers to maintain state.
   */
  reuseContainers: boolean;

  /**
   * Force pulling of the image, even if already present.
   */
  forcePull: boolean;

  /**
   * Force rebuilding local docker image action.
   */
  forceRebuild: boolean;

  /**
   * Log the output from docker run.
   */
  logOutput: boolean;

  /**
   * Use json or text logger.
   */
  jsonLogger: boolean;

  /**
   * Switches from the full job name to the job id.
   */
  logPrefixJobID: boolean;

  /**
   * Environment for containers.
   */
  env: Record<string, string>;

  /**
   * Manually passed action inputs.
   */
  inputs: { [key: string]: string };

  /**
   * List of secrets.
   */
  secrets: { [key: string]: string };

  /**
   * List of variables.
   */
  vars: { [key: string]: string };

  /**
   * GitHub token.
   */
  token: string;

  /**
   * Switch hiding output when printing to terminal. Doesn't hide secrets while printing logs
   */
  insecureSecrets: boolean;

  /**
   * List of platforms.
   */
  platforms?: { [key: string]: string };

  /**
   * Platform picker, it will take precedence over Platforms if isn't nil.
   * @returns {string} The selected platform.
   */
  platformPicker?: (labels: string[]) => string;

  /**
   * Controls if paths in .gitignore should not be copied into container, default true.
   */
  useGitIgnore: boolean;

  /**
   * GitHub instance to use, default "github.com".
   */
  githubInstance: string;

  /**
   * artifact server address
   */
  artifactServerAddress: string;

  /**
   * skip local actions/checkout.
   */
  skipCheckout: boolean;

  /**
   * Use actions from GitHub Enterprise instance to GitHub.
   */
  replaceGheActionWithGithubCom: string[];

  /**
   * Token of private action repo on GitHub.
   */
  replaceGheActionTokenWithGithubCom: string;

  /**
   * Matrix config to run.
   */
  matrix: Record<string, unknown[]>;

  /**
   * The default actions web site.
   */
  defaultActionInstance: string;

  /**
   * The level of job logger.
   * @type {LogLevel}
   */
  loggerLevel?: Level;

  /**
   * Only volumes (and bind mounts) in this slice can be mounted on the job container or service containers.
   */
  validVolumes?: string[];

  /**
   * Whether to skip verifying TLS certificate of the Gitea instance.
   * @default false
   */
  insecureSkipTLS?: boolean;

  container: {
    /**
     * Use privileged mode.
     */
    privileged: boolean;

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
  };

  constructor(config: Config) {
    this.context = new Context(config.context ?? {});
    this.workspace = config.workspace ?? '';
    this.bind = config.bind ?? true;
    this.eventPath = config.eventPath ?? '';
    this.remoteName = config.remoteName ?? '';
    this.reuseContainers = config.reuseContainers ?? false;
    this.forcePull = config.forcePull ?? false;
    this.forceRebuild = config.forceRebuild ?? false;
    this.logPrefixJobID = config.logPrefixJobID ?? false;
    this.logOutput = config.logOutput ?? true;
    this.jsonLogger = config.jsonLogger ?? false;

    this.env = config.env ?? {};
    this.inputs = config.inputs ?? {};
    this.secrets = config.secrets ?? {};
    this.vars = config.vars ?? {};
    this.token = config.token ?? '';

    this.platforms = config.platforms ?? {};
    this.platformPicker = config.platformPicker ?? (() => { return ''; });
    this.useGitIgnore = config.useGitIgnore ?? true;

    this.skipCheckout = config.skipCheckout || true;
    this.replaceGheActionWithGithubCom = config.replaceGheActionWithGithubCom || [];
    this.replaceGheActionTokenWithGithubCom = config.replaceGheActionTokenWithGithubCom || '';
    this.matrix = config.matrix || {};
    this.insecureSecrets = config.insecureSecrets || false;

    this.artifactServerAddress = config.artifactServerAddress || '';
  }
}

export default Config;
