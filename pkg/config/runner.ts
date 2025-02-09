/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Runner Configurator
 *
 * sobird<i@sobird.me> at 2024/08/13 20:25:25 created.
 */

import os from 'node:os';
import path from 'node:path';

import ip from 'ip';
import log4js from 'log4js';

import Artifact from '@/pkg/artifact';
import ArtifactCache from '@/pkg/artifact/cache';
import { Options } from '@/pkg/cmd/run';
import Constants from '@/pkg/common/constants';
import Git from '@/pkg/common/git';
import { Docker } from '@/pkg/docker';
import Labels from '@/pkg/labels';
import ActionCache from '@/pkg/runner/action/cache';
import ActionCacheOffline from '@/pkg/runner/action/cache/offline';
import ActionCacheRepository from '@/pkg/runner/action/cache/repository';
import Config from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import {
  readConfSync, generateId, readJsonSync, lodash,
} from '@/utils';

import Container from './container';

const logger = log4js.getLogger();

const ACTIONS_HOME = path.join(os.homedir(), '.actions');

class Runner implements Omit<Options, ''> {
  /**
   * path to workflow file(s)
   */
  public workflows: string;

  public recursive: boolean;

  public context: Context;

  public workspace: string;

  /**
   * Working directory
   */
  public workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  public bindWorkdir: true;

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
  public env: Record<string, string>;

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
  public actionsCache: boolean;

  /**
   * The directory to store the cache data.
   * If it's empty, the cache data will be stored in $ACTIONS_HOME/cache.
   */
  public actionsCachePath: string;

  /**
   * The host of the cache server.
   *
   * It's not for the address to listen, but the address to connect from job containers.
   * So 0.0.0.0 is a bad choice, leave it empty to detect automatically.
   */
  public actionsCacheAddr: string;

  /**
   * The port of the cache server.
   *
   * 0 means to use a random available port.
   */
  public actionsCachePort: number;

  /**
   * The external cache server URL. Valid only when enable is true.
   *
   * If it's specified, runner will use this URL as the ACTIONS_CACHE_URL rather than start a server by itself.
   * The URL should generally end with "/".
   */
  public actionsCacheExternal: string;

  // actions repository local cache

  /**
   * enable using the new cache action for storing actions locally
   */
  public cacheActions?: true;

  /**
   * replaces the specified repository and ref with a local folder
   * (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols)
   */
  public repositories: Record<string, string>;

  /**
   * if action contents exists, it will not be fetch and pull again.
   * If turn on this, will turn off force pull
   */
  public actionsOffline?: true;

  /**
   * defines the dir where the actions get cached and host workspaces created.
   */
  public actionsPath: string;

  /**
   * defines the default url of action instance', 'https://github.com
   */
  public actionsInstance: string;

  /**
   * defines the path where the artifact server stores uploads and retrieves downloads from.
   * If not specified the artifact server will not start
   */
  public artifactPath: string;

  /**
   * defines the address where the artifact server listens
   */
  public artifactAddr: string;

  /**
   * defines the port where the artifact server listens (will only bind to localhost)
   */
  public artifactPort: number;

  public skipCheckout: boolean;

  public useGitignore: true;

  public serverInstance: string;

  public matrix: Record<string, unknown[]>;

  public image: string;

  public replaceGheActionWithGithubCom: string[];

  public replaceGheActionTokenWithGithubCom: string;

  /**
   * NOT RECOMMENDED! Doesn't hide secrets while printing logs
   */
  public insecureSecrets?: true;

  // log
  /**
   * logging of output from steps
   */
  public logOutput: boolean;

  /**
   * output logs in json format
   */
  public logJson?: true;

  /**
   * output the job id within non-json logs instead of the entire name
   */
  public logPrefixJobId?: true;

  // container
  public container: Container;

  /**
   * Connect a container to a network
   */
  public containerNetwork: string;

  /**
   * Set platform if server is multi-platform capable
   */
  public containerPlatform: string;

  /**
   * path to Docker daemon socket which will be mounted to containers
   */
  public containerDaemonSocket: string;

  /**
   * pull docker image(s) even if already present
   */
  public pull: true;

  /**
   * rebuild local action docker image(s) even if already present
   */
  public rebuild: true;

  public reuse: true;

  public containerNamePrefix?: string;

  /**
   * Give extended privileges to this container
   */
  public containerPrivileged?: true;

  /**
   * Automatically remove the container when it exits
   */
  public containerAutoRemove?: true;

  /**
   * User namespace to use
   */
  public containerUsernsMode: string;

  /**
   * Add Linux capabilities
   */
  public containerCapAdd: string[];

  /**
   * Drop Linux capabilities
   */
  public containerCapDrop: string[];

  public containerMaxLifetime: number;

  public containerOptions: string;

  constructor(runner: Runner) {
    this.workflows = runner.workflows;
    this.recursive = runner.recursive;
    this.context = new Context(runner.context);
    this.workspace = runner.workspace || '/home/runner';
    this.workdir = runner.workdir || '';
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
    this.actionsCache = runner.actionsCache ?? true;
    this.actionsCachePath = runner.actionsCachePath || path.join(ACTIONS_HOME, 'artifact', 'cache');
    this.actionsCacheAddr = runner.actionsCacheAddr || ip.address();
    this.actionsCachePort = runner.actionsCachePort ?? 0;
    this.actionsCacheExternal = runner.actionsCacheExternal ?? '';

    // action cache
    this.cacheActions = runner.cacheActions;
    this.repositories = runner.repositories;
    this.actionsOffline = runner.actionsOffline;
    this.actionsPath = runner.actionsPath || path.join(ACTIONS_HOME, 'actions');
    this.actionsInstance = runner.actionsInstance || 'github.com';

    // Artifact Server
    this.artifactPath = runner.artifactPath;
    this.artifactAddr = runner.artifactAddr || ip.address();
    this.artifactPort = runner.artifactPort;

    this.skipCheckout = runner.skipCheckout;
    this.image = runner.image;
    this.matrix = runner.matrix;
    this.insecureSecrets = runner.insecureSecrets;
    this.useGitignore = runner.useGitignore;
    this.serverInstance = runner.serverInstance;
    this.replaceGheActionWithGithubCom = runner.replaceGheActionWithGithubCom;
    this.replaceGheActionTokenWithGithubCom = runner.replaceGheActionTokenWithGithubCom;

    // log
    this.logOutput = runner.logOutput;
    this.logJson = runner.logJson;
    this.logPrefixJobId = runner.logPrefixJobId;

    // container
    this.container = new Container(runner.container ?? {});
    this.pull = runner.pull;
    this.rebuild = runner.rebuild;
    this.reuse = runner.reuse;
    this.containerNamePrefix = runner.containerNamePrefix;
    this.containerNetwork = runner.containerNetwork;
    this.containerPlatform = runner.containerPlatform;
    this.containerDaemonSocket = runner.containerDaemonSocket;
    this.containerPrivileged = runner.containerPrivileged;
    this.containerAutoRemove = runner.containerAutoRemove;
    this.containerUsernsMode = runner.containerUsernsMode;
    this.containerCapAdd = runner.containerCapAdd;
    this.containerCapDrop = runner.containerCapDrop;
    this.containerMaxLifetime = runner.containerMaxLifetime || 3600;
    this.containerOptions = runner.containerOptions;
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
    Object.assign(this.context.secrets, { GITHUB_TOKEN: options.token });

    return this;
  }

  async configure(): Promise<Config> {
    try {
      const { socket, host } = Docker.SocketAndHost(this.containerDaemonSocket);
      process.env.DOCKER_HOST = host;
      this.containerDaemonSocket = socket;
      logger.info("Using docker host '%s', and daemon socket '%s'", host, socket);
    } catch (error) {
      logger.warn("Couldn't get a valid docker connection: %s", (error as Error).message);
    }

    if (process.platform === 'darwin' && process.arch === 'arm64' && !this.containerPlatform) {
      logger.warn(" \u26d4 You are using Apple M-series chip and you have not specified container architecture, you might encounter issues while running act. If so, try running it with '--container-architecture linux/amd64'. \u26d4");
    }

    logger.debug('Loading environment from %s', this.envFile);

    Object.assign(this.env, readConfSync(this.envFile));
    Object.assign(this.context.env, this.env);

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

    // Cache Actions
    let actionCache;
    if (this.cacheActions) {
      actionCache = this.actionsOffline ? new ActionCacheOffline(this.actionsPath) : new ActionCache(this.actionsPath);
    }

    if (this.repositories) {
      actionCache = new ActionCacheRepository(this.actionsPath, this.repositories);
    }

    // labels
    const { platforms } = new Labels(this.labels);

    // this.context.secrets.GITHUB_TOKEN = this.token;

    const config: Config = {
      context: this.context,
      workspace: this.workspace,
      workdir: path.resolve(this.workdir),
      bindWorkdir: this.bindWorkdir,
      actionCache,
      platforms,

      actionsCache: this.actionsCache,
      actionsCachePath: this.actionsCachePath,
      actionsCacheAddr: this.actionsCacheAddr,
      actionsCachePort: this.actionsCachePort,
      actionsCacheExternal: this.actionsCacheExternal,

      actionsInstance: this.actionsInstance,
      serverInstance: this.serverInstance,
      artifactPath: this.artifactPath,
      artifactAddr: this.artifactAddr,
      artifactPort: this.artifactPort,
      remoteName: this.remoteName,
      reuseContainers: this.reuse,
      logJson: this.logJson,
      logOutput: this.logOutput,
      logPrefixJobID: this.logPrefixJobId,
      insecureSecrets: this.insecureSecrets,
      platformPicker: () => { return this.image; },
      useGitignore: this.useGitignore,
      skipCheckout: this.skipCheckout,
      matrix: this.matrix,
      // container
      pull: this.pull,
      rebuild: this.rebuild,
      containerUsernsMode: this.containerUsernsMode,
      containerPlatform: this.containerPlatform,
      containerDaemonSocket: this.containerDaemonSocket,
      containerCapAdd: this.containerCapAdd,
      containerCapDrop: this.containerCapDrop,
      containerNamePrefix: this.containerNamePrefix,
      containerMaxLifetime: this.containerMaxLifetime,
      containerNetworkMode: this.containerNetwork,
      containerAutoRemove: this.containerAutoRemove,
      containerOptions: this.containerOptions,
      replaceGheActionWithGithubCom: this.replaceGheActionWithGithubCom,
      replaceGheActionTokenWithGithubCom: this.replaceGheActionTokenWithGithubCom,
    };

    await this.actionsRuntime();

    return config;
  }

  // actions runtime public server
  async actionsRuntime() {
    const {
      artifactPath,
      artifactAddr,
      artifactPort,

      actionsCache,
      actionsCachePath,
      actionsCacheAddr,
      actionsCachePort,
      actionsCacheExternal,
    } = this;

    // Start Artifact Server
    const ACTIONS_RUNTIME_URL = Constants.Actions.RuntimeUrl;
    const ACTIONS_RUNTIME_TOKEN = Constants.Actions.RuntimeToken;
    if (artifactPath && !this.context.env[ACTIONS_RUNTIME_URL]) {
      const artifact = new Artifact(artifactPath, artifactAddr, artifactPort);
      const actionsRuntimeUrl = await artifact.serve();
      logger.info('Artifact Server address:', actionsRuntimeUrl);
      this.context.env[ACTIONS_RUNTIME_URL] = actionsRuntimeUrl;

      let actionsRuntimeToken = process.env[ACTIONS_RUNTIME_TOKEN];
      if (!actionsRuntimeToken) {
        actionsRuntimeToken = 'token';
      }
      this.context.env[ACTIONS_RUNTIME_TOKEN] = actionsRuntimeToken;
    }

    // Start Actions Cache Server
    const ACTIONS_CACHE_URL = Constants.Actions.CacheUrl;
    if (actionsCache && !this.context.env[ACTIONS_CACHE_URL]) {
      if (actionsCacheExternal) {
        this.context.env[ACTIONS_CACHE_URL] = actionsCacheExternal;
      } else {
        const artifactCache = new ArtifactCache(actionsCachePath);
        const actionsCacheURL = await artifactCache.serve(actionsCachePort, actionsCacheAddr);
        logger.info('Actions Cache Server address:', actionsCacheURL);
        this.context.env[ACTIONS_CACHE_URL] = actionsCacheURL;
      }
    }
  }
}

export default Runner;
