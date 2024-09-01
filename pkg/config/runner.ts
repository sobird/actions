/**
 * Runner Configurator
 *
 * sobird<i@sobird.me> at 2024/08/13 20:25:25 created.
 */

import os from 'node:os';
import path from 'node:path';

import dotenv, { DotenvParseOutput } from 'dotenv';
import log4js from 'log4js';

import { Options } from '@/cmd/run';
import Artifact from '@/pkg/artifact';
import ArtifactCache from '@/pkg/artifact/cache';
import Labels from '@/pkg/labels';
import ActionCache from '@/pkg/runner/action/cache';
import ActionCacheOffline from '@/pkg/runner/action/cache/offline';
import ActionCacheRepository from '@/pkg/runner/action/cache/repository';
import Config from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import { readConfSync, generateId, readJsonSync } from '@/utils';

const logger = log4js.getLogger();

const ACTIONS_HOME = path.join(os.homedir(), '.actions');

class Runner implements Options {
  public workflows: string;

  public workflowRecurse: boolean;

  public context: Context;

  /**
   * Working directory
   */
  public workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  public bindWorkdir: boolean;

  public actor: string;

  public remoteName: string;

  public defaultBranch: string;

  /**
   * path to event JSON file
   */
  public eventFile: string;

  /**
   * Extra environment variables to run jobs.
   */
  public env: DotenvParseOutput;

  /**
   * Extra environment variables to run jobs from a file.
   * It will be ignored if it's empty or the file doesn't exist.
   */
  public envFile: string;

  public vars: Record<string, string>;

  public varsFile: string;

  public inputs: Record<string, string>;

  public inputsFile: string;

  public secrets: Record<string, string>;

  public secretsFile: string;

  /**
   * Whether skip verifying the TLS certificate of the Gitea instance.
   */
  public insecure: boolean;

  /**
   * The labels of a runner are used to determine which jobs the runner can run, and how to run them.
   * Like: "macos-arm64=host" or "ubuntu-latest=gitea/runner-images:ubuntu-latest"
   * Find more images provided by Gitea at https://gitea.com/gitea/runner-images .
   * If it's empty when registering, it will ask for inputting labels.
   * If it's empty when execute `daemon`, will use labels in `.runner` file.
   */
  public labels: string[];

  /**
   * Enable cache server to use actions/cache.
   */
  public cacheServer: boolean;

  /**
   * The directory to store the cache data.
   * If it's empty, the cache data will be stored in $ACTIONS_HOME/cache.
   */
  public cacheServerPath: string;

  /**
   * The host of the cache server.
   *
   * It's not for the address to listen, but the address to connect from job containers.
   * So 0.0.0.0 is a bad choice, leave it empty to detect automatically.
   */
  public cacheServerAddr?: string;

  /**
   * The port of the cache server.
   *
   * 0 means to use a random available port.
   */
  public cacheServerPort: number;

  /**
   * The external cache server URL. Valid only when enable is true.
   *
   * If it's specified, runner will use this URL as the ACTIONS_CACHE_URL rather than start a server by itself.
   * The URL should generally end with "/".
   */
  public externalServer: string;

  /**
   * enable using the new Action Cache for storing Actions locally
   */
  public useActionCache?: true;

  /**
   * replaces the specified repository and ref with a local folder
   * (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols)
   */
  public repositories: Record<string, string>;

  /**
   * if action contents exists, it will not be fetch and pull again.
   * If turn on this, will turn off force pull
   */
  public actionOfflineMode?: true;

  /**
   * defines the dir where the actions get cached and host workspaces created.
   */
  public actionCacheDir: string;

  /**
   * defines the default url of action instance', 'https://github.com
   */
  public actionInstance: string;

  /**
   * defines the path where the artifact server stores uploads and retrieves downloads from.
   * If not specified the artifact server will not start
   */
  public artifactServerPath: string;

  /**
   * defines the address where the artifact server listens
   */
  public artifactServerAddr: string;

  /**
   * defines the port where the artifact server listens (will only bind to localhost)
   */
  public artifactServerPort: number;

  public skipCheckout: boolean;

  public matrix: Record<string, unknown[]>;

  public image: string;

  constructor(runner: Runner) {
    this.workflows = runner.workflows;
    this.workflowRecurse = runner.workflowRecurse;
    this.context = new Context(runner.context);
    this.workdir = runner.workdir;
    this.bindWorkdir = runner.bindWorkdir;
    this.eventFile = runner.eventFile;
    this.actor = runner.actor;
    this.remoteName = runner.remoteName;
    this.defaultBranch = runner.defaultBranch;

    this.env = runner.env ?? {};
    this.envFile = runner.envFile ?? '';
    this.vars = runner.env ?? {};
    this.varsFile = runner.varsFile;
    this.inputs = runner.inputs ?? {};
    this.inputsFile = runner.inputsFile;
    this.secrets = runner.secrets ?? {};
    this.secretsFile = runner.secretsFile;

    this.insecure = runner.insecure ?? false;
    this.labels = runner.labels ?? [];
    this.cacheServer = runner.cacheServer ?? true;
    this.cacheServerPath = runner.cacheServerPath || path.join(ACTIONS_HOME, 'artifact', 'cache');
    this.cacheServerAddr = runner.cacheServerAddr || undefined;
    this.cacheServerPort = runner.cacheServerPort ?? 0;
    this.externalServer = runner.externalServer ?? '';

    // action cache
    this.useActionCache = runner.useActionCache;
    this.repositories = runner.repositories;
    this.actionOfflineMode = runner.actionOfflineMode;
    this.actionCacheDir = runner.actionCacheDir;
    this.actionInstance = runner.actionInstance ?? 'https://github.com';

    // Artifact Server
    this.artifactServerPath = runner.artifactServerPath;
    this.artifactServerAddr = runner.artifactServerAddr || undefined;
    this.artifactServerPort = runner.artifactServerPort;

    this.skipCheckout = runner.skipCheckout;
    this.image = runner.image;
    this.matrix = runner.matrix;
  }

  // merge cli options
  options(options: Options) {

  }

  async configure(): Promise<Config> {
    logger.debug('Loading environment from %s', this.envFile);
    Object.assign(this.env, readConfSync(this.envFile));

    logger.debug('Loading vars from %s', this.varsFile);
    Object.assign(this.vars, readConfSync(this.varsFile));

    logger.debug('Loading secrets from %s', this.secretsFile);
    Object.assign(this.secrets, readConfSync(this.secretsFile));

    logger.debug('Loading action inputs from %s', this.inputsFile);
    Object.assign(this.inputs, readConfSync(this.inputsFile));

    logger.debug('Loading github event from %s', this.eventFile);
    Object.assign(this.context.github.event, readConfSync(this.eventFile));

    // ActionCache
    let actionCache;
    if (this.useActionCache) {
      actionCache = this.actionOfflineMode ? new ActionCacheOffline(this.actionCacheDir) : new ActionCache(this.actionCacheDir);
    }

    if (this.repositories) {
      actionCache = new ActionCacheRepository(this.actionCacheDir, this.repositories);
    }

    // Start Artifact Server
    const ACTIONS_RUNTIME_URL = 'ACTIONS_RUNTIME_URL';
    if (this.artifactServerPath && !this.env[ACTIONS_RUNTIME_URL]) {
      const artifact = new Artifact(this.artifactServerPath, this.artifactServerAddr, this.artifactServerPort);
      const actionsRuntimeURL = await artifact.serve();
      logger.debug('Artifact Server address:', actionsRuntimeURL);
      this.env[ACTIONS_RUNTIME_URL] = actionsRuntimeURL;
    }
    // Start Artifact Cache Server
    const ACTIONS_CACHE_URL = 'ACTIONS_CACHE_URL';
    console.log('this.cacheServerPath', this.cacheServerPath);
    if (this.cacheServer && !this.env[ACTIONS_CACHE_URL]) {
      const artifactCache = new ArtifactCache(this.cacheServerPath, this.cacheServerAddr, this.cacheServerPort);
      const artifactCacheServeURL = await artifactCache.serve();
      logger.debug('Artifact Cache Server address:', artifactCacheServeURL);
      this.env[ACTIONS_CACHE_URL] = artifactCacheServeURL;
    }

    // labels
    const { platforms } = new Labels(this.labels);

    const config: Config = {
      context: this.context,
      workdir: this.workdir,
      bindWorkdir: this.bindWorkdir,
      actionCache,
      platforms,
    };

    return config;
  }
}

export default Runner;
