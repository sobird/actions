import log4js from 'log4js';
import type { Client, Config } from '@/pkg';
import pkg from '@/package.json' assert { type: 'json' };
import { Task } from '@/pkg/client/runner/v1/messages_pb';
import Reporter from '../reporter';

const logger = log4js.getLogger();
logger.level = 'debug';

const { version } = pkg;

class Runner {
  envs: { [key in string]: string } = {};

  runningTasks = new Map();

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public config: Config,
  ) {
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

    // 超时设置
    try {
      const timer = setTimeout(() => { throw Error('Operation timed out'); }, this.config.runner.timeout);
      const reporter = new Reporter(this.client, task);
      // setInterval(() => {
      //   reporter.log('hdhdhs dsdsd', reporter.state.id);
      // }, 2000);
      try {
        reporter.runDaemon();
        // 抛出异常
        await this.runTask(task, reporter);
      } catch (err) {
        const lastWords = (err as Error).message;
        reporter.close(lastWords);
      } finally {
        // 清除超时句柄
        clearTimeout(timer);
      }
    } finally {
      // cancel 取消超时
    }
    this.runningTasks.delete(taskId);
  }

  /**
   * 运行任务
   *
   * @todo
   * run task
   *
   * @param task
   * @param reporter
   */
  async runTask(task: Task, reporter: Reporter) {
    try {
      // todo 具体实现
      reporter.log(`version: ${version} Received task ${task.id} of job ${task.context?.fields.job?.toJsonString()}, triggered by event: ${task.context?.fields.event_name?.toJsonString()}`);

      // const [workflow, jobID, err] = this.generateWorkflow(task);
      // if (err) {
      //   return;
      // }
    } catch (error) {
      // todo
    }
  }

  private artifactcache() {
    // todo
    // console.log('artifactcache:', this);
    return this;
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
    this.envs.ACTIONS_RESULTS_URL = this.config.registration!.address;
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
          // this.envs.ACTIONS_CACHE_URL = cacheHandler.getExternalUrl();
        }
      }
    }
  }

  get pipelineUrl(): string {
    return new URL('/api/actions_pipeline', this.config.registration!.address).toString();
  }

  async declare(labels: string[]) {
    return this.client.declare({
      version: '1.0.0', // 使用适当的版本号
      labels,
    });
  }
}

export default Runner;
