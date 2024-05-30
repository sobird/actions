/**
 * config.ts
 *
 * sobird<i@sobird.me> at 2024/05/07 16:01:08 created.
 */

import { HostConfig } from 'dockerode';
import { Level } from 'log4js';

import { Github } from '@/pkg/runner/context/github';

import ActionCache from './action/cache';

/**
 * The configuration interface for the runner.
 */
export interface Config {
  /**
   * The user that triggered the event.
   */
  actor: string;

  /**
   * Path to the working directory.
   */
  workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  bindWorkdir: boolean;

  /**
   * Use a custom ActionCache Implementation.
   */
  actionCache: ActionCache;

  /**
   * Path used for caching action contents.
   */
  actionCacheDir: string;

  /**
   * When offline, use caching action contents.
   */
  actionOfflineMode: boolean;

  /**
   * Name of the event to run.
   */
  eventName: string;

  /**
   * The content of JSON file to use for event.json in containers, overrides EventPath.
   */
  eventJSON: string;

  /**
   * Path to the JSON file to use for event.json in containers.
   */
  eventPath: string;

  /**
   * Remote name in local git repo config.
   */
  remoteName: string;

  /**
   * Name of the main branch for this repository.
   */
  defaultBranch: string;

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
  env: { [key: string]: string };

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
   * Switch hiding output when printing to terminal.
   */
  insecureSecrets: boolean;

  /**
   * List of platforms.
   */
  platforms: { [key: string]: string };

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
  containerArchitecture: string;

  /**
   * Path to Docker daemon socket.
   */
  containerDaemonSocket: string;

  /**
   * Options for the job container.
   */
  containerOptions: string;

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
  containerNamePrefix: string;

  /**
   * The max lifetime of job containers in milliseconds.
   */
  containerMaxLifetime: number;

  /**
   * The network mode of job containers (the value of --network).
   * @type {NetworkMode}
   */
  containerNetworkMode: HostConfig['NetworkMode'];

  /**
    * Controls if the container is automatically removed upon workflow completion.
    */
  autoRemove: boolean;

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
  matrix: { [key: string]: { [key: string]: boolean } };

  /**
   * The preset github context, overrides some fields like DefaultBranch, Env, Secrets etc.
   * @type {GithubContext}
   */
  presetGitHubContext?: Github;

  /**
   * The default actions web site.
   */
  defaultActionInstance: string;

  /**
   * Platform picker, it will take precedence over Platforms if isn't nil.
   * @returns {string} The selected platform.
   */
  platformPicker?: (labels: string[]) => string;

  /**
   * The level of job logger.
   * @type {LogLevel}
   */
  jobLoggerLevel?: Level;

  /**
   * Only volumes (and bind mounts) in this slice can be mounted on the job container or service containers.
   */
  validVolumes?: string[];

  /**
   * Whether to skip verifying TLS certificate of the Gitea instance.
   * @default false
   */
  insecureSkipTLS?: boolean;
}
