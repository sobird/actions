import fs from 'node:fs';

import dotenv, { DotenvParseOutput } from 'dotenv';

class Runner {
  /**
   * Where to store the registration result.
   */
  public file: string;

  /**
   * Execute how many tasks concurrently at the same time.
   */
  public capacity: number;

  /**
   * Extra environment variables to run jobs.
   */
  public envs: DotenvParseOutput;

  /**
   * Extra environment variables to run jobs from a file.
   * It will be ignored if it's empty or the file doesn't exist.
   */
  public envFile: string;

  /**
   * The timeout for a job to be finished.
   * Please note that the Gitea instance also has a timeout (3h by default) for the job.
   * So the job could be stopped by the Gitea instance if it's timeout is shorter than this.
   */
  public timeout: number;

  /**
   * The timeout for fetching the job from the Gitea instance.
   */
  public fetchTimeout: number = 5 * 1000;

  /**
   * The interval for fetching the job from the Gitea instance.
   */
  public fetchInterval: number = 2 * 1000;

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

  constructor(runner: Runner) {
    this.file = runner.file ?? '.runner';
    this.capacity = runner.capacity > 0 ? runner.capacity : 1;
    this.envs = runner.envs ?? {};
    this.envFile = runner.envFile ?? '';

    this.timeout = runner.timeout > 0 ? runner.timeout : 3 * 3600 * 1000;
    this.fetchTimeout = runner.fetchTimeout > 0 ? runner.fetchTimeout : 5000;
    this.fetchInterval = runner.fetchInterval > 0 ? runner.fetchInterval : 2000;
    this.insecure = runner.insecure ?? false;
    this.labels = runner.labels ?? [];

    // 从环境变量文件加载环境变量
    if (this.envFile && fs.existsSync(this.envFile)) {
      Object.assign(this.envs, dotenv.config({ path: this.envFile }).parsed);
    }
  }
}

export default Runner;
