/* eslint-disable @typescript-eslint/naming-convention */
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
import Git from '@/pkg/common/git';
import { getSocketAndHost } from '@/pkg/docker';
import Labels from '@/pkg/labels';
import ActionCache from '@/pkg/runner/action/cache';
import ActionCacheOffline from '@/pkg/runner/action/cache/offline';
import ActionCacheRepository from '@/pkg/runner/action/cache/repository';
import Config from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import { Github } from '@/pkg/runner/context/github';
import {
  readConfSync, generateId, readJsonSync, lodash,
} from '@/utils';

import Container from './container';

const logger = log4js.getLogger();

const ACTIONS_HOME = path.join(os.homedir(), '.actions');

class Runner implements Omit<Options, 'workflowRecurse'> {
  public workflows: string;

  // public workflowRecurse: boolean;

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
  public cacheServerAddr: string;

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

  public container: Container;

  constructor(runner: Runner) {
    this.workflows = runner.workflows;
    // this.workflowRecurse = runner.workflowRecurse;
    this.context = new Context(runner.context);
    this.workdir = runner.workdir;
    this.bindWorkdir = runner.bindWorkdir;
    this.eventFile = runner.eventFile;
    this.actor = runner.actor;
    this.remoteName = runner.remoteName;
    this.defaultBranch = runner.defaultBranch;

    this.env = runner.env ?? {};
    this.envFile = runner.envFile ?? '';
    this.vars = runner.vars ?? {};
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
    this.actionInstance = runner.actionInstance || 'https://github.com';

    // Artifact Server
    this.artifactServerPath = runner.artifactServerPath;
    this.artifactServerAddr = runner.artifactServerAddr || undefined;
    this.artifactServerPort = runner.artifactServerPort;

    this.skipCheckout = runner.skipCheckout;
    this.image = runner.image;
    this.matrix = runner.matrix;

    this.container = new Container(runner.container ?? {});
  }

  // merge cli options
  async options(options: Options, eventName?: string) {
    lodash.merge(this, options);

    const git = new Git(options.workdir);
    const author = await git.author();
    const repoInfo = await git.repoInfo();
    const ref = await git.ref() || '';

    const actor = options.actor || author || 'actor';
    const actor_id = generateId(actor);

    const sha = await git.revision();

    const repository_owner = repoInfo.owner || 'owner';
    const repository = `${repository_owner}/${repoInfo.name}`;
    const repository_id = generateId(repository);
    const repository_owner_id = generateId(repository_owner);
    const repositoryUrl = repoInfo.url;

    const userInfo = os.userInfo();

    const github = {
      actor,
      actor_id,
      api_url: 'https://api.github.com/',
      graphql_url: 'https://api.github.com/graphql',
      repository,
      repository_id,
      repository_owner,
      repository_owner_id,
      repositoryUrl,
      retention_days: '0',
      server_url: 'https://github.com',
      event_name: eventName,
      event_path: options.eventFile,
      sha,
      ref,
      triggering_actor: userInfo.username,
      token: options.token,
      workspace: options.workdir,
    };

    Object.assign(this.context.github, github);

    return this;
  }

  async configure(): Promise<Config> {
    try {
      const { socket, host } = getSocketAndHost(this.containerDaemonSocket);
      process.env.DOCKER_HOST = host;
      this.containerDaemonSocket = socket;
      logger.info("Using docker host '%s', and daemon socket '%s'", host, socket);
    } catch (error) {
      logger.warn("Couldn't get a valid docker connection: %s", (error as Error).message);
    }

    if (process.platform === 'darwin' && process.arch === 'arm64' && !this.containerArchitecture) {
      console.warn(" \u26d4 You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. \u26d4");
    }

    logger.debug('Loading environment from %s', this.envFile);
    console.log('this.env', this.env);
    Object.assign(this.env, readConfSync(this.envFile));
    // Object.assign(this.context.env, this.env);

    logger.debug('Loading vars from %s', this.varsFile);
    Object.assign(this.vars, readConfSync(this.varsFile));
    Object.assign(this.context.vars, this.vars);

    logger.debug('Loading secrets from %s', this.secretsFile);
    Object.assign(this.secrets, readConfSync(this.secretsFile));
    Object.assign(this.context.secrets, this.secrets);

    logger.debug('Loading action inputs from %s', this.inputsFile);
    Object.assign(this.inputs, readConfSync(this.inputsFile));
    Object.assign(this.context.inputs, this.inputs);

    logger.debug('Loading github event from %s', this.eventFile);
    const event = readJsonSync(this.eventFile);
    if (!event?.repository?.default_branch) {
      event.repository = event.repository || {};
      event.repository.default_branch = this.defaultBranch;
    }
    Object.assign(this.context.github.event, event);

    // ActionCache
    let actionCache;
    if (this.useActionCache) {
      actionCache = this.actionOfflineMode ? new ActionCacheOffline(this.actionCacheDir) : new ActionCache(this.actionCacheDir);
    }

    if (this.repositories) {
      actionCache = new ActionCacheRepository(this.actionCacheDir, this.repositories);
    }

    // labels
    const { platforms } = new Labels(this.labels);

    // this.context.secrets.GITHUB_TOKEN = this.token;

    const config: Config = {
      context: this.context,
      workdir: this.workdir,
      bindWorkdir: this.bindWorkdir,
      actionCache,
      platforms,
    };

    return config;
  }

  async setActionRuntimeEnv() {
    // Start Artifact Server
    const ACTIONS_RUNTIME_URL = 'ACTIONS_RUNTIME_URL';
    const ACTIONS_RUNTIME_TOKEN = 'ACTIONS_RUNTIME_TOKEN';
    if (this.artifactServerPath && !this.env[ACTIONS_RUNTIME_URL]) {
      const artifact = new Artifact(this.artifactServerPath, this.artifactServerAddr, this.artifactServerPort);
      const actionsRuntimeUrl = await artifact.serve();
      logger.debug('Artifact Server address:', actionsRuntimeUrl);
      this.env[ACTIONS_RUNTIME_URL] = actionsRuntimeUrl;

      let actionsRuntimeToken = process.env[ACTIONS_RUNTIME_TOKEN];
      if (!actionsRuntimeToken) {
        actionsRuntimeToken = 'token';
      }
      this.env[ACTIONS_RUNTIME_TOKEN] = actionsRuntimeToken;
    }

    // Start Artifact Cache Server
    const ACTIONS_CACHE_URL = 'ACTIONS_CACHE_URL';
    if (this.cacheServer && !this.env[ACTIONS_CACHE_URL]) {
      const artifactCache = new ArtifactCache(this.cacheServerPath, this.cacheServerAddr, this.cacheServerPort);
      const artifactCacheServeURL = await artifactCache.serve();
      logger.debug('Artifact Cache Server address:', artifactCacheServeURL);
      this.env[ACTIONS_CACHE_URL] = artifactCacheServeURL;
    }
  }
}

export default Runner;
