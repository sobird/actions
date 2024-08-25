/**
 * Runner Config
 *
 * sobird<i@sobird.me> at 2024/05/07 16:01:08 created.
 */

import { Level } from 'log4js';

import ActionCache from '@/pkg/runner/action/cache/cache';
import Context from '@/pkg/runner/context';

import Container from './container';

/**
 * The configuration interface for the runner.
 */
class Config {
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
  readonly actionCache: ActionCache;

  /**
   * When offline, use caching action contents.
   */
  readonly actionOfflineMode: boolean;

  /**
   * The default actions web site.
   */
  readonly actionInstance: string;

  /**
   * Path to the JSON file to use for event.json in containers.
   */
  readonly eventPath: string;

  /**
   * Remote name in local git repo config.
   */
  readonly remoteName: string;

  /**
   * Reuse containers to maintain state.
   */
  readonly reuseContainers: boolean;

  /**
   * Log the output from docker run.
   */
  readonly logOutput: boolean;

  /**
   * Use json or text logger.
   */
  readonly jsonLogger: boolean;

  /**
   * Switches from the full job name to the job id.
   */
  readonly logPrefixJobID: boolean;

  /**
   * Environment for containers.
   */
  readonly env: Record<string, string>;

  /**
   * Manually passed action inputs.
   */
  readonly inputs: { [key: string]: string };

  /**
   * List of secrets.
   */
  readonly secrets: { [key: string]: string };

  /**
   * List of variables.
   */
  readonly vars: { [key: string]: string };

  /**
   * GitHub token.
   */
  readonly token: string;

  /**
   * Switch hiding output when printing to terminal. Doesn't hide secrets while printing logs
   */
  readonly insecureSecrets: boolean;

  /**
   * List of labels.
   */
  readonly labels: { [key: string]: string };

  /**
   * Platform picker, it will take precedence over Platforms if isn't nil.
   * @returns {string} The selected platform.
   */
  readonly platformPicker: (labels: string[]) => string;

  /**
   * Controls if paths in .gitignore should not be copied into container, default true.
   */
  readonly useGitignore: boolean;

  /**
   * GitHub instance to use, default "github.com".
   */
  readonly serverInstance: string;

  /**
   * artifact server address
   */
  readonly artifactServerAddress: string;

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
   * @default false
   */
  readonly insecureSkipTLS?: boolean;

  container: Container;

  constructor(config: Config) {
    this.context = new Context(config.context ?? {});
    this.workdir = config.workdir ?? '';
    this.bindWorkdir = config.bindWorkdir ?? true;
    this.eventPath = config.eventPath ?? '';
    this.remoteName = config.remoteName ?? '';
    this.reuseContainers = config.reuseContainers ?? false;
    this.logPrefixJobID = config.logPrefixJobID ?? false;
    this.logOutput = config.logOutput ?? true;
    this.jsonLogger = config.jsonLogger ?? false;

    this.env = config.env ?? {};
    this.inputs = config.inputs ?? {};
    this.secrets = config.secrets ?? {};
    this.vars = config.vars ?? {};
    this.token = config.token ?? '';

    this.labels = config.labels ?? {};
    this.platformPicker = config.platformPicker ?? (() => { return ''; });
    this.useGitignore = config.useGitignore ?? true;

    this.skipCheckout = config.skipCheckout || true;
    this.replaceGheActionWithGithubCom = config.replaceGheActionWithGithubCom || [];
    this.replaceGheActionTokenWithGithubCom = config.replaceGheActionTokenWithGithubCom || '';
    this.matrix = config.matrix || {};
    this.insecureSecrets = config.insecureSecrets || false;

    this.artifactServerAddress = config.artifactServerAddress || '';

    this.container = new Container(config.container ?? {});

    // action
    this.actionCache = config.actionCache;
    this.actionOfflineMode = config.actionOfflineMode ?? false;
    this.actionInstance = config.actionInstance ?? 'github.com';

    this.serverInstance = config.serverInstance ?? 'github.com';
  }
}

export default Config;
