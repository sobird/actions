/**
 * Runner Configurator
 *
 * sobird<i@sobird.me> at 2024/08/13 20:25:25 created.
 */

import fs from 'node:fs';

import dotenv, { DotenvParseOutput } from 'dotenv';
import log4js from 'log4js';

import { Options } from '@/cmd/run';
import ActionCache from '@/pkg/runner/action/cache';
import ActionCacheOffline from '@/pkg/runner/action/cache/offline';
import ActionCacheRepository from '@/pkg/runner/action/cache/repository';
import Config from '@/pkg/runner/config';
import Context from '@/pkg/runner/context';
import { readConfSync, generateId, readJsonSync } from '@/utils';

const logger = log4js.getLogger();

class Runner implements Options {
  public context: Context;

  /**
   * Working directory
   */
  public workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  public bindWorkdir: boolean;

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

  constructor(runner: Runner) {
    this.context = new Context(runner.context);
    this.workdir = runner.workdir;
    this.bindWorkdir = runner.bindWorkdir;
    this.eventFile = runner.eventFile;

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
    this.cacheServerPath = runner.cacheServerPath ?? '';
    this.cacheServerAddr = runner.cacheServerAddr ?? '';
    this.cacheServerPort = runner.cacheServerPort ?? '';
    this.externalServer = runner.externalServer ?? '';

    // action cache
    this.useActionCache = runner.useActionCache;
    this.repositories = runner.repositories;
    this.actionOfflineMode = runner.actionOfflineMode;
    this.actionCacheDir = runner.actionCacheDir;
    this.actionInstance = runner.actionInstance ?? 'https://github.com';

    // 从环境变量文件加载环境变量
    if (this.envFile && fs.existsSync(this.envFile)) {
      Object.assign(this.env, dotenv.config({ path: this.envFile }).parsed);
    }
  }

  // merge cli options
  options(options: Options) {

  }

  configure():Config {
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

    let actionCache;
    if (this.useActionCache) {
      actionCache = this.actionOfflineMode ? new ActionCacheOffline(this.actionCacheDir) : new ActionCache(this.actionCacheDir);
    }

    if (this.repositories) {
      actionCache = new ActionCacheRepository(this.actionCacheDir, this.repositories);
    }

    const config: Config = {
      context: this.context,
      workdir: this.workdir,
      bindWorkdir: this.bindWorkdir,
      actionCache,
    };

    return config;
  }
}

export default Runner;
