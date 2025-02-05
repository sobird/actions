/**
 * 轮询器/调度器，轮询服务器实例分配的任务，在这之前需要先向服务器声明runner的labels
 *
 * sobird<i@sobird.me> at 2024/04/25 22:02:36 created.
 */

import { ConnectError } from '@connectrpc/connect';
import log4js from 'log4js';

import type { Client, Config } from '@/pkg';
import { Needs } from '@/pkg/runner/context/needs';
import { withTimeout } from '@/utils';

import { WithLoggerHook } from '../common/logger';
import Reporter from '../reporter';
import { Task } from '../service/runner/v1/messages_pb';
import Workflow from '../workflow';

const logger = log4js.getLogger();

class Poller {
  tasksVersion = BigInt(0);

  runningTasks = new Map();

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public config: InstanceType<typeof Config>,
    public runnerVersion?: string,
  ) {}

  async poll() {
    const { daemon } = this.config;
    const checkInterval = setInterval(async () => {
      if (this.runningTasks.size >= daemon.capacity) {
        return;
      }
      logger.debug('fetching task', this.tasksVersion, this.runningTasks.size, daemon.capacity);
      const task = await this.fetchTask();

      if (this.runningTasks.has(task?.id)) {
        throw new Error(`Task ${task?.id} is already running`);
      }

      try {
        if (task) {
          this.runningTasks.set(task.id, task);
          console.log('11212', 11212);
          await this.assign(task);
          console.log('11212', 11212);
          this.runningTasks.delete(task.id);
        }
      } catch (error) {
        logger.error('failed to run task', error);
        clearInterval(checkInterval);
      }
    }, daemon.fetchInterval);
  }

  async assign(task: Task) {
    const { workflowPayload, secrets, vars } = task;

    const reporter = new Reporter(this.client, task);
    await reporter.runDaemon();
    reporter.log(`Current runner version: ${this.runnerVersion} Received task ${task.id} of job ${task.context?.job}, triggered by event: ${task.context?.event_name}`);

    // SingleWorkflow is a workflow with single job and single matrix
    const singleWorkflow = Workflow.Load(workflowPayload?.toString()!);
    const plan = singleWorkflow.plan();

    const loggerWithReporter = WithLoggerHook(reporter, 'Reporter');
    loggerWithReporter.info('task:', task.id);

    const needs = Object.fromEntries(Object.entries(task.needs).map(([job, need]) => {
      return [job, need];
    })) as unknown as Needs;
    const github = task.context;

    Object.assign(this.config.runner.context.github, github);
    Object.assign(this.config.runner.context.secrets, secrets);
    Object.assign(this.config.runner.context.vars, vars);
    Object.assign(this.config.runner.context.needs, needs);

    const runnerConfig = await this.config.runner.configure();
    await withTimeout(plan.executor(runnerConfig).execute(), this.config.daemon.timeout);
  }

  async fetchTask() {
    const { tasksVersion } = this;
    try {
      const fetchTaskResponse = await withTimeout(this.client.fetchTask({ tasksVersion }), this.config.daemon.fetchTimeout);

      if (fetchTaskResponse.tasksVersion > tasksVersion) {
        this.tasksVersion = fetchTaskResponse.tasksVersion;
      }

      if (fetchTaskResponse.task) {
        return fetchTaskResponse.task;
      }

      this.tasksVersion = BigInt(0);
    } catch (error) {
      logger.error('failed to fetch task', (error as ConnectError).message);
    }
  }
}

export default Poller;
