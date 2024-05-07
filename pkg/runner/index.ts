/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import log4js from 'log4js';

import pkg from '@/package.json' assert { type: 'json' };
import type { Client, Config } from '@/pkg';
import ArtifactCache from '@/pkg/artifact/cache';
import { Task } from '@/pkg/client/runner/v1/messages_pb';
import { withTimeout } from '@/utils';

import Reporter from '../reporter';

const logger = log4js.getLogger();
logger.level = 'debug';

const { version } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    const reporter = new Reporter(this.client, task);

    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      reporter.close('runner closed');
    });

    try {
      await reporter.runDaemon();
      await withTimeout(this.runTask(task, reporter), this.config.runner.timeout);
    } catch (error) {
      reporter.close((error as Error).message);
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

      this.mockTask(task, reporter);
    } catch (error) {
      // todo
    }
  }

  async mockTask(task: Task, reporter: Reporter) {
    //

    reporter.resetSteps(5);

    const taskContext = task.context?.fields;
    // @todo
    // console.log('event', taskContext?.event.toJson());

    logger.info(`task ${task.id} repo is ${taskContext?.repository.toJsonString()} ${taskContext?.gitea_default_actions_url.toJsonString()} address`);

    reporter.log('workflow prepared');

    const outputs = new Map();
    outputs.set('test', 'test outputs');
    reporter.setOutputs(outputs);

    setInterval(() => {
      const jsonStr = fs.readFileSync(path.resolve(__dirname, 'mock_fire.json'), 'utf-8');

      try {
        const mock_fire = JSON.parse(jsonStr);
        if (mock_fire.if) {
          // console.log('mock_fire', mock_fire.entry);
          mock_fire.entry.startTime = new Date();
          reporter.fire(mock_fire.entry);
        }
      } catch (err) {
        logger.error((err as Error).message);
      }
    }, 2000);
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
          const artifactCache = new ArtifactCache(
            this.config.cache.dir,
            this.config.cache.host,
            this.config.cache.port,
          );
          this.envs.ACTIONS_CACHE_URL = await artifactCache.serve();
        } catch (err) {
          logger.error('cannot init cache server, it will be disabled:', (err as Error).message);
        }
      }
    }
  }

  get pipelineUrl(): string {
    return new URL('/api/actions_pipeline', this.config.registration!.address).toString();
  }

  async declare(labels: string[]) {
    return this.client.declare({
      version,
      labels,
    });
  }
}

export default Runner;
