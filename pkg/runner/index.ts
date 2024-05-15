/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import log4js from 'log4js';

import pkg from '@/package.json' with { type: 'json' };
import type { Client, Config } from '@/pkg';
import ArtifactCache from '@/pkg/artifact/cache';
import { Task } from '@/pkg/client/runner/v1/messages_pb';
import { withTimeout } from '@/utils';

import Executor from '../common/executor';
import Reporter from '../reporter';
import Workflow from '../workflow';
import WorkflowPlanner, { Plan } from '../workflow/planner';

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

  async run(task?: Task) {
    if (!task) {
      return;
    }

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

      // this.mockTask(task, reporter);

      const workflow = Workflow.Load(task.workflowPayload?.toString());

      console.log('workflow', workflow.jobs['Test-Node'].strategy);

      const wp = WorkflowPlanner.Combine(workflow);
      const plan = wp.planJob();

      await this.planExecutor(task.context, plan);
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

  async planExecutor(config: Task['context'], plan: Plan) {
    const stagePipeline: Executor[] = [];

    logger.debug('Plan Stages:', plan.stages);

    plan.stages.forEach((stage) => {
      stagePipeline.push(new Executor(async () => {
        const pipeline: Executor[] = [];

        stage.runs.forEach((run) => {
          const { job } = run;

          job.steps?.forEach(((step) => {
            logger.debug('Job.Steps:', step.name);
          }));

          logger.debug('Job.TimeoutMinutes:', job['timeout-minutes']);

          // const matrices = job.strategy!.select({});
          // logger.debug('Final matrix after applying user inclusions', matrices);

          // const maxParallel = job.strategy ? job.strategy['max-parallel'] : 4;

          // matrices.forEach((matrix, i) => {
          //   // todo
          //   const rc = {
          //     name: '顶顶顶对对对',
          //     jobName: 'jobName',
          //     run,
          //     matrix,
          //   };
          //   rc.jobName = rc.name;
          //   if (matrices.length > 1) {
          //     rc.name = `${rc.name}-${i + 1}`;
          //   }
          //   if (rc.toString().length > maxJobNameLen) {
          //     maxJobNameLen = rc.toString().length;
          //   }

          //   stageExecutor.push(new Executor(() => {
          //     const jobName = rc.toString().padEnd(maxJobNameLen);
          //     console.log('jobName', jobName);
          //   }));
          // });

          pipeline.push(job.executor());
        });

        const ncpu = os.cpus().length;
        logger.debug('Detected CPUs:', ncpu);
        await Executor.parallel(ncpu, ...pipeline).execute();
      }));
    });

    await Executor.pipeline(...stagePipeline).then(new Executor(() => {
      for (const stage of plan.stages) {
        for (const run of stage.runs) {
          // todo
          const jobResult = run.job.result;
          if (jobResult === 'failure') {
            return Promise.reject(new Error(`Job '${run.toString()}' failed`));
          }
        }
      }
    })).execute();
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

  async declare(labels: string[]) {
    return this.client.declare({
      version,
      labels,
    });
  }
}

export default Runner;
