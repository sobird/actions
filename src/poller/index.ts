// oxlint-disable no-await-in-loop
/**
 * 轮询器/调度器，轮询服务器实例分配的任务，在这之前需要先向服务器声明runner的labels
 *
 * sobird<i@sobird.me> at 2024/04/25 22:02:36 created.
 */

import { ConnectError } from '@connectrpc/connect';
import { Semaphore } from 'async-mutex';

import logger from '@/common/logger';
import type { Config } from '@/config';
import type { Client } from '@/index';
import { withTimeout } from '@/utils';
import { sleep } from '@/utils';

import { Task } from '../gen/runner/v1/messages_pb';
import { type Runner } from './runner';

class Poller {
  private tasksVersion = BigInt(0);
  private runningTasks = new Map();
  private semaphore: Semaphore;

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public config: Config,
    public runner: Runner,
    public version?: string,
  ) {
    this.semaphore = new Semaphore(this.config.daemon.capacity);
  }

  async poll() {
    const { daemon } = this.config;

    while (true) {
      try {
        await this.semaphore.runExclusive(async () => {
          await sleep(daemon.fetchInterval);

          const task = await this.fetchTask();
          if (!task) return;

          if (this.runningTasks.has(task.id)) {
            logger.warn(`Task ${task.id} is already running, skipping.`);
            return;
          }

          try {
            this.runningTasks.set(task.id, task);
            await this.assign(task);
          } catch (taskError) {
            logger.error(`Failed to run task ${task.id}:`, taskError);
          } finally {
            this.runningTasks.delete(task.id);
          }
        });
      } catch (error) {
        logger.error('Unexpected error in poll loop:', error);
        await sleep(1000);
      }
    }
  }

  async assign(task: Task) {
    await this.runner.run(task);
  }

  async fetchTask() {
    const { tasksVersion } = this;
    try {
      const fetchTaskResponse = await withTimeout(
        (signal) => this.client.fetchTask({ tasksVersion }, { signal }),
        this.config.daemon.fetchTimeout,
      );

      if (!fetchTaskResponse) {
        return;
      }

      if (fetchTaskResponse.tasksVersion > tasksVersion) {
        this.tasksVersion = fetchTaskResponse.tasksVersion;
      }

      if (!fetchTaskResponse.task) {
        return;
      }

      this.tasksVersion = BigInt(0);

      return fetchTaskResponse.task;
    } catch (error) {
      logger.error('Failed to fetch task', (error as ConnectError).message);
    }
  }
}

export * from './runner';

export default Poller;
