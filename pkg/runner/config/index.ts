/**
 * Runner Config
 *
 * sobird<i@sobird.me> at 2024/05/07 16:01:08 created.
 */

import { Level } from 'log4js';

import ActionCache from '@/pkg/runner/action/cache';
import Context from '@/pkg/runner/context';

import Container from './container';

/**
 * The configuration interface for the runner.
 */
interface Config {
  /**
   * The runner context.
   */
  readonly context: Context;

  /**
   * path to working directory
   */
  readonly workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  readonly bindWorkdir: boolean;

  /**
   * Use a custom ActionCache Implementation.
   */
  readonly actionCache?: ActionCache;

  /**
   * When offline, use caching action contents.
   */
  readonly actionOfflineMode?: boolean;

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

  container: Container;
}

export default Config;
