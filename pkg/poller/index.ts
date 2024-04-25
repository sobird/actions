/**
 * 轮询器
 *
 * sobird<i@sobird.me> at 2024/04/25 22:02:36 created.
 */

class Poller {
  constructor(public client, public runner, public config) {
    this.tasksVersion = 0; // Node.js 中使用普通数值即可
  }

  async poll(ctx) {
    const limiter = new RateLimiter({
      max: 1, // 每秒一个请求
      interval: this.config.Runner.FetchInterval * 1000, // 将时间间隔转换为毫秒
    });

    for (let i = 0; i < this.config.Runner.Capacity; i++) {
      await this.pollTask(ctx, limiter);
    }
  }

  async pollTask(ctx, limiter) {
    while (true) {
      await limiter.removeTokens(1, { timeout: this.config.Runner.FetchInterval }); // 等待获取令牌
      if (ctx.canceled) return;

      const task = await this.fetchTask(ctx);
      if (task) {
        await this.runTaskWithRecover(ctx, task);
      }
    }
  }

  async runTaskWithRecover(ctx, task) {
    try {
      await this.runner.run(ctx, task);
    } catch (error) {
      log.error('failed to run task', error);
    }
  }

  async fetchTask(ctx) {
    const v = this.tasksVersion;
    const resp = await this.client.FetchTask({
      TasksVersion: v,
    }, { timeout: this.config.Runner.FetchTimeout });

    if (!resp || !resp.Msg) return null;

    if (resp.Msg.TasksVersion > v) {
      this.tasksVersion = resp.Msg.TasksVersion;
    }

    if (resp.Msg.Task) {
      this.tasksVersion = 0; // 强制下一次请求查询数据库
      return resp.Msg.Task;
    }

    return null;
  }
}

export default Poller;
