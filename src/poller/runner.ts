/**
 * Daemon 模式运行 Runner
 *
 * sobird<i@sobird.me> at 2026/08/10 23:28:11 created.
 */
import path from 'node:path';

import { withLoggerHook } from '@/common/logger';
import type { Config } from '@/config';
import { RunnerServiceClient } from '@/gen/index.ts';
import { Task } from '@/gen/runner/v1/messages_pb';
import Labels from '@/labels';
import type RunnerConfig from '@/runner/config';
import Context from '@/runner/context';
import { withTimeout } from '@/utils';

import Reporter from '../reporter';
import Workflow from '../workflow';

export class Runner {
  constructor(
    public client: RunnerServiceClient,
    public config: Config,
    public labels: Labels,
  ) {}

  async run(task: Task) {
    const reporter = new Reporter(this.client, task);
    await reporter.runDaemon(); // 启动 1s 定时上报
    const logger = withLoggerHook(reporter, 'Reporter');

    try {
      logger.info(
        `Received task ${task.id} of job ${task.context?.['job']}, triggered by event: ${task.context?.['event_name']}`,
      );

      const plan = Workflow.Load(task.workflowPayload?.toString() ?? '').plan();
      const runnerConfig = this.configure(task);

      await withTimeout(plan.executor(runnerConfig).execute(), this.config.daemon.timeout, `Task ${task.id} timed out`);
      await reporter.close(); // 成功：终结状态 + noMore 日志
    } catch (error) {
      logger.error('Task failed:', error);
      reporter.log('Task failed:', error instanceof Error ? error.message : String(error));
      await reporter.close('Task failed'); // 失败：标记 FAILURE
      throw error; // 交还 Poller 记录 + 从 runningTasks 移除
    }
  }

  configure(task: Task) {
    const { secrets, vars } = task;

    const needs = Object.fromEntries(
      Object.entries(task.needs).map(([job, need]) => {
        return [job, need];
      }),
    );
    const github = task.context;

    const context = {
      github,
      secrets,
      vars,
      needs,
    };

    const runnerConfig: RunnerConfig = {
      name: '', // @todo
      context: context as unknown as Context,
      workspace: this.config.runner.workspace,
      workdir: path.normalize(task.context?.['repository']?.toString() ?? ''),
      bindWorkdir: false,

      platforms: this.labels.platforms,

      useGitignore: true,
      skipCheckout: false,
      // serverInstance: options.serverInstance,
      actionInstance: 'https://github.com',
      // replaceGheActionWithGithubCom: runner.replaceGheActionWithGithubCom,
      // replaceGheActionTokenWithGithubCom: runner.replaceGheActionTokenWithGithubCom,

      // logger
      // logJson: runner.logJson,
      // logOutput: runner.logOutput,
      // logPrefixJobID: runner.logPrefixJobId,
      // insecureSecrets: this.config.runner.insecureSecrets,

      // cache actions
      // actionCache,

      // artifact server
      // artifactPath: runner.artifactPath,
      // artifactAddr: runner.artifactAddr,
      // artifactPort: runner.artifactPort,

      // artifact cache for actions/cache
      actionsCache: true,
      // actionsCachePath: runner.actionsCachePath,
      // actionsCacheAddr: runner.actionsCacheAddr,
      // actionsCachePort: runner.actionsCachePort,
      // actionsCacheExternal: runner.actionsCacheExternal,

      // container
      // platformPicker: () => {
      //   return options.image;
      // },
      pull: this.config.runner.pull,
      reuse: this.config.runner.reuse,
      rebuild: this.config.runner.rebuild,
      containerNamePrefix: `ACTIONS-TASK-${task.id}`,
      containerUsernsMode: this.config.runner.containerUsernsMode,
      containerPrivileged: this.config.runner.containerPrivileged,
      containerPlatform: this.config.runner.containerPlatform,
      containerCapAdd: this.config.runner.containerCapAdd,
      containerCapDrop: this.config.runner.containerCapDrop,
      containerMaxLifetime: this.config.runner.containerMaxLifetime,
      containerNetworkMode: this.config.runner.containerNetwork,
      containerAutoRemove: this.config.runner.containerAutoRemove,
      containerOptions: this.config.runner.containerOptions,
      containerDaemonSocket: this.config.runner.containerDaemonSocket,
    };

    return runnerConfig;
  }
}
