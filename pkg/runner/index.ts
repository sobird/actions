import os from 'os';
import path from 'path';
import log4js from 'log4js';
import type { Client, Config } from '@/pkg';
import { version } from '@/package.json' assert { type: 'json' };
import { Task } from '@/pkg/client/runner/v1/messages_pb';

const logger = log4js.getLogger();
logger.level = 'info';

class Runner {
  envs: { [key in string]: string } = {};

  runningTasks = new Map();

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public registration: typeof Config.Registration.prototype,
    public config: Config,
  ) {
    // this.name = registration.Name;
    // this.labels = registration.Labels.map((label) => { return { name: label }; });

    this.setupEnvs();
    this.setupGiteaEnv();
    this.setupCacheEnv();
  }

  async run(task: Task) {
    const taskId = task.id;
    if (this.runningTasks.has(taskId)) {
      throw new Error(`Task ${taskId} is already running`);
    }
    this.runningTasks.set(taskId, {});

    try {
      const timer = setTimeout(() => {
        throw Error('Operation timed out');
      }, this.config.runner.timeout);
      /** @todo */
      // const reporter = new Reporter(this.client, task);
      // await reporter.runDaemon();
      try {
        await this.runTask(task);
      } finally {
        // await reporter.close();
        clearTimeout(timer);
      }
    } catch (err) {
      logger.error('Failed to run task', err);
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  async runTask(task: Task) {
    // ... 实现任务运行逻辑 ...
  }

  private artifactcache() {
    // todo
    console.log('this', this);
    return {} as any;
  }

  private setupEnvs() {
    // 初始化环境变量
    const { envs } = this.config.runner;
    Object.entries(envs).forEach(([key, value]) => {
      this.envs[key] = value;
    });
  }

  private setupGiteaEnv() {
    this.envs.GITEA_ACTIONS = 'true';
    this.envs.GITEA_ACTIONS_RUNNER_VERSION = version;

    this.envs.ACTIONS_RUNTIME_URL = this.pipelineUrl;
    this.envs.ACTIONS_RESULTS_URL = this.registration.address;
  }

  private setupCacheEnv() {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { enabled, external_server } = this.config.cache;
    // 检查缓存是否启用
    if (enabled) {
      if (external_server) {
        // 使用外部缓存服务器
        this.envs.ACTIONS_CACHE_URL = external_server;
      } else {
        /**
         * @todo 启动内部缓存处理器 带实现
         */
        const cacheHandler = this.artifactcache();
        if (cacheHandler) {
          this.envs.ACTIONS_CACHE_URL = cacheHandler.getExternalUrl();
        }
      }
    }
  }

  get pipelineUrl(): string {
    return new URL('/api/actions_pipeline', this.registration.address).toString();
  }

  async declare(labels: string[]) {
    return this.client.declare({
      version: '1.0.0', // 使用适当的版本号
      labels,
    });
  }
}

// 实现 Reporter 类
// class Reporter {
//   constructor(ctx, client, task) {
//     // ... 初始化逻辑 ...
//   }

//   async runDaemon() {
//     // ... 实现守护进程运行逻辑 ...
//   }

//   async close(lastWords) {
//     // ... 实现关闭逻辑 ...
//   }

//   // ... 其他报告器方法 ...
// }

export default Runner;
