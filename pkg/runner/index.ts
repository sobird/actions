/**
 * 一个Runner实例仅支持运行一个job
 * represents a job from a workflow that needs to be run
 *
 * @example
 * const runner = new Runner(jobId, workflow, config);
 * runner.execute();
 *
 * sobird<i@sobird.me> at 2024/05/19 6:18:35 created.
 */

import log4js from 'log4js';

import pkg from '@/package.json' with { type: 'json' };
import type { Config } from '@/pkg';

import Executor from '../common/executor';
import Workflow from '../workflow';

const logger = log4js.getLogger();
logger.level = 'debug';

const { version } = pkg;

class Runner {
  envs: { [key in string]: string } = {};

  constructor(public jobId: string, public workflow: Workflow, public config?: Config) {
    // this.setupEnvs();
    // this.setupGiteaEnv();
    // this.setupCacheEnv();
  }

  executor() {
    console.log('jobName:', this.workflow.jobs[this.jobId].name);
    return new Executor(() => {
      // todo
    });
  }

  private setupEnvs() {
    // 初始化环境变量
    const { envs } = this.config.runner;
    Object.entries(envs).forEach(([key, value]) => {
      this.envs[key] = value;
    });
  }

  private setupGiteaEnv() {
    // Set specific environments to distinguish between Gitea and GitHub
    this.envs.GITEA_ACTIONS = 'true';
    this.envs.GITEA_ACTIONS_RUNNER_VERSION = version;

    this.envs.ACTIONS_RUNTIME_URL = this.pipelineUrl;
    this.envs.ACTIONS_RESULTS_URL = this.config.registration!.address;
  }

  private async setupCacheEnv() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { enabled, external_server } = this.config.cache;
    // 检查缓存是否启用
    if (enabled) {
      if (external_server) {
        // 使用外部缓存服务器
        this.envs.ACTIONS_CACHE_URL = external_server;
      } else {
        try {
          // const artifactCache = new ArtifactCache(
          //   this.config.cache.dir,
          //   this.config.cache.host,
          //   this.config.cache.port,
          // );
          // this.envs.ACTIONS_CACHE_URL = await artifactCache.serve();
        } catch (err) {
          logger.error('cannot init cache server, it will be disabled:', (err as Error).message);
        }
      }
    }
  }

  get pipelineUrl(): string {
    return new URL('/api/actions_pipeline', this.config.registration!.address).toString();
  }
}

export default Runner;
