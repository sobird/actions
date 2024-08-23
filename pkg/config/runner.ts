import fs from 'node:fs';

import dotenv, { DotenvParseOutput } from 'dotenv';

class Runner {
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
    this.envs = runner.envs ?? {};
    this.envFile = runner.envFile ?? '';
    this.insecure = runner.insecure ?? false;
    this.labels = runner.labels ?? [];

    // 从环境变量文件加载环境变量
    if (this.envFile && fs.existsSync(this.envFile)) {
      Object.assign(this.envs, dotenv.config({ path: this.envFile }).parsed);
    }
  }
}

export default Runner;
