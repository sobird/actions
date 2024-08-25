/**
 * Runner Configurator
 *
 * sobird<i@sobird.me> at 2024/08/13 20:25:25 created.
 */

import fs from 'node:fs';

import dotenv, { DotenvParseOutput } from 'dotenv';
import log4js from 'log4js';

import { Options } from '@/cmd/run';
import ActionCache from '@/pkg/runner/action/cache/cache';
import Config from '@/pkg/runner/config';
import { readConfSync, generateId, readJsonSync } from '@/utils';

const logger = log4js.getLogger();

class Runner implements Options {
  /**
   * Working directory
   */
  public workdir: string;

  /**
   * Bind the workdir to the job container.
   */
  public bindWorkdir: boolean;

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

  constructor(runner: Runner) {
    this.workdir = runner.workdir;
    this.bindWorkdir = runner.bindWorkdir;

    this.env = runner.env ?? {};
    this.envFile = runner.envFile ?? '';
    this.vars = runner.env ?? {};
    this.varsFile = runner.varsFile;

    this.insecure = runner.insecure ?? false;
    this.labels = runner.labels ?? [];
    this.cacheServer = runner.cacheServer ?? true;
    this.cacheServerPath = runner.cacheServerPath ?? '';
    this.cacheServerAddr = runner.cacheServerAddr ?? '';
    this.cacheServerPort = runner.cacheServerPort ?? '';
    this.externalServer = runner.externalServer ?? '';

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

    logger.debug('Loading secrets from %s', options.secretsFile);
    Object.assign(options.secrets, readConfSync(options.secretsFile));

    logger.debug('Loading action inputs from %s', options.inputsFile);
    Object.assign(options.inputs, readConfSync(options.inputsFile));

    const actionCache = '';

    return {
      workdir: this.workdir,
      bindWorkdir: this.bindWorkdir,
      actionCache,
    };
  }
}

export default Runner;
