/**
 * 轮询器
 *
 * sobird<i@sobird.me> at 2024/04/25 22:02:36 created.
 */

import type { Client, Config, Runner } from '@/pkg';
import { FetchTaskRequest, Task } from '../client/runner/v1/messages_pb';

class Poller {
  tasksVersion = BigInt(0);

  constructor(
    public client: typeof Client.prototype.RunnerServiceClient,
    public runner: typeof Runner.prototype,
    public config: typeof Config.prototype,
  ) {}

  async poll() {
    const promises = [];
    for (let i = 0; i < this.config.runner.capacity; i++) {
      const promise = this.pollTask();
      promises.push(promise);
    }

    return Promise.all(promises);
  }

  async pollTask() {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        // if (ctx.canceled) {
        //   clearInterval(checkInterval);
        //   return resolve();
        // }

        try {
          // 模拟限流器等待
          // await this.limiter.acquire();

          const task = await this.fetchTask();

          if (task) {
            this.runTaskWithRecover(task);
          }
        } catch (error) {
          console.error('Error in poll loop:', error);
          clearInterval(checkInterval);
          return reject(error);
        }
      }, 1000); // 每秒检查一次
    });
  }

  async runTaskWithRecover(task: Task) {
    try {
      // 使用try-catch来捕获运行任务时的异常
      await this.runner.run(task);
    } catch (error) {
      // 记录运行任务时发生的任何错误
      console.error('failed to run task', error);
    } finally {
      // 无论是否发生错误，都会执行的代码
      // 可以在这里放置清理逻辑
    }
  }

  /**
   * 获取任务
   *
   * @returns Task
   */
  async fetchTask() {
    const { tasksVersion } = this;
    const timer = setTimeout(() => {
      throw Error('timeout ');
    });
    try {
      const fetchTaskResponse = await this.client.fetchTask(new FetchTaskRequest({
        tasksVersion,
      }));

      if (fetchTaskResponse.tasksVersion > tasksVersion) {
        this.tasksVersion = fetchTaskResponse.tasksVersion;
      }

      if (fetchTaskResponse.task) {
        return fetchTaskResponse.task;
      }
      this.tasksVersion = BigInt(0);
    } finally {
      //
      clearTimeout(timer);
    }
  }
}

export default Poller;
