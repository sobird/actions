/**
 * 轮询器/调度器，轮询服务器实例分配的任务，在这之前需要先向服务器声明runner的labels
 *
 * sobird<i@sobird.me> at 2024/04/25 22:02:36 created.
 */

import { ConnectError } from '@connectrpc/connect';
import log4js from 'log4js';

import type { Client, Config } from '@/pkg';
import { withTimeout } from '@/utils';

import { FetchTaskRequest, Task } from '../client/runner/v1/messages_pb';
import Reporter from '../reporter';
import Workflow from '../workflow';

const logger = log4js.getLogger();

class Poller {
  tasksVersion = BigInt(0);

  runningTasks = new Map();

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public config: typeof Config.prototype,
    public runnerVersion?: string,
  ) {}

  async poll() {
    const checkInterval = setInterval(async () => {
      if (this.runningTasks.size >= this.config.runner.capacity) {
        return;
      }
      logger.debug('fetching task', this.tasksVersion, this.runningTasks, this.config.runner.capacity);
      const task = await this.fetchTask();

      if (this.runningTasks.has(task?.id)) {
        throw new Error(`Task ${task?.id} is already running`);
      }

      try {
        if (task) {
          this.runningTasks.set(task.id, task);
          await this.assign(task);
          this.runningTasks.delete(task.id);
        }
      } catch (error) {
        console.error('failed to run task', error);
        clearInterval(checkInterval);
      }
    }, this.config.runner.fetchInterval);
  }

  async assign(task: Task) {
    const reporter = new Reporter(this.client, task);
    reporter.log(`Current runner version: ${this.runnerVersion} Received task ${task.id} of job ${task.context?.fields.job?.toJsonString()}, triggered by event: ${task.context?.fields.event_name?.toJsonString()}`);
    // @todo: context,secrets,needs,vars
    // SingleWorkflow is a workflow with single job and single matrix
    const singleWorkflow = Workflow.Load(task.workflowPayload?.toString()!);
    const plan = singleWorkflow.plan();

    await plan.executor().execute();
  }

  /**
   * 获取任务
   */
  async fetchTask() {
    const { tasksVersion } = this;
    try {
      const fetchTaskResponse = await withTimeout(this.client.fetchTask(new FetchTaskRequest({ tasksVersion })), this.config.runner.fetchTimeout);

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
