/**
 * 轮询器/调度器，轮询服务器实例分配的任务，在这之前需要先向服务器声明runner的labels
 *
 * sobird<i@sobird.me> at 2024/04/25 22:02:36 created.
 */

import { ConnectError } from '@connectrpc/connect';
import log4js from 'log4js';

import type { Client, Config, Runner } from '@/pkg';
import { withTimeout } from '@/utils';

import { FetchTaskRequest } from '../client/runner/v1/messages_pb';

const logger = log4js.getLogger();

class Poller {
  tasksVersion = BigInt(0);

  runningTask = 0;

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public runner: typeof Runner.prototype,
    public config: typeof Config.prototype,
  ) {}

  async poll() {
    const checkInterval = setInterval(async () => {
      if (this.runningTask >= this.config.runner.capacity) {
        return;
      }
      logger.debug('fetching task', this.tasksVersion, this.runningTask, this.config.runner.capacity);
      const task = await this.fetchTask();

      try {
        if (task) {
          this.runningTask += 1;
          await this.runner.run(task);
          this.runningTask -= 1;
        }
      } catch (error) {
        console.error('failed to run task', error);
        clearInterval(checkInterval);
      }
    }, this.config.runner.fetchInterval);
  }

  /**
   * 获取任务
   *
   * @returns Task
   */
  async fetchTask() {
    const { tasksVersion } = this;
    try {
      const fetchTaskResponse = await withTimeout(this.client.fetchTask(new FetchTaskRequest({ tasksVersion })), this.config.runner.fetchTimeout);

      // console.log('fetchTaskResponse', fetchTaskResponse.task?.needs, fetchTaskResponse.task?.workflowPayload?.toString());

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
