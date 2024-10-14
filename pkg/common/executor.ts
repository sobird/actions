/* eslint-disable max-classes-per-file */
/**
 * 执行器
 *
 * sobird<i@sobird.me> at 2024/05/04 21:32:57 created.
 */
import { Mutex } from 'async-mutex';
import log4js from 'log4js';

import Runner from '@/pkg/runner';

const mutex = new Mutex();

const logger = log4js.getLogger();
logger.level = 'debug';

export class Conditional {
  constructor(public fn: (ctx?: object) => Promise<boolean> | boolean) {}

  evaluate(ctx?: object) {
    return this.fn(ctx);
  }

  not() {
    return new Conditional(async (ctx) => { return !await this.evaluate(ctx); });
  }
}

class Executor {
  constructor(
    public fn: (ctx?: Runner) => Promise<void> | void | InstanceType<typeof Executor> | Promise<InstanceType<typeof Executor>> = () => {},
  ) {}

  async execute(ctx?: Runner) {
    const result = await this.fn(ctx);
    if (result instanceof Executor) {
      await result.execute(ctx);
    }
    return result;
  }

  // Executor 的 Then 方法用于链式调用执行器
  next(next: Executor) {
    return Executor.Pipeline(this, next);
  }

  // Executor 的 If 方法用于在条件满足时执行执行器
  if(conditional: Conditional) {
    return new Executor(async (ctx) => {
      if (await conditional.evaluate(ctx)) {
        await this.execute(ctx);
      }
    });
  }

  // Executor 的 IfNot 方法用于在条件不满足时执行执行器
  ifNot(conditional: Conditional) {
    return this.if(conditional.not());
  }

  // Executor 的 IfBool 方法用于在布尔条件为真时执行执行器
  ifBool(conditional: boolean) {
    return this.if(new Conditional(() => { return conditional; }));
  }

  // Executor 的 Finally 方法用于在执行器执行后运行另一个执行器
  finally(finallyExecutor: Executor) {
    return new Executor(async (ctx) => {
      try {
        await this.execute(ctx);
      } finally {
        await finallyExecutor.execute(ctx);
      }
    });
  }

  /** 创建一个记录信息日志的执行器 */
  static Info(info: string) {
    return new Executor(() => {
      logger.info(info);
    });
  }

  /** 创建一个记录调试日志的执行器 */
  static Debug(info: string) {
    return new Executor(() => {
      logger.debug(info);
    });
  }

  /** 创建一个按顺序执行多个执行器的执行器 */
  static Pipeline(...executors: Executor[]) {
    return new Executor(async (ctx) => {
      for await (const executor of executors) {
        await executor.execute(ctx);
      }
    });
  }

  /** 于条件创建一个执行器 */
  static Conditional(conditional: Conditional, trueExecutor: Executor, falseExecutor?: Executor) {
    return new Executor(async (ctx) => {
      if (await conditional.evaluate(ctx)) {
        await trueExecutor.execute(ctx);
      } else {
        await falseExecutor?.execute(ctx);
      }
    });
  }

  /** 创建一个总是返回错误的执行器 */
  static Error(err: unknown) {
    return new Executor(() => { throw err; });
  }

  /** 创建一个并行执行多个执行器的执行器 */
  // todo executors.length === 0 时的容错处理
  static Parallel(size: number, ...executors: Executor[]) {
    let parallel = Math.max(1, size);
    parallel = Math.min(parallel, executors.length);
    if (parallel === 0) {
      return new Executor(() => {});
    }
    return new Executor(async (ctx) => {
      const results: unknown[] = await new Promise((resolve) => {
        const records: unknown[] = [];
        let index = 0;
        let count = 0;

        const thread = async () => {
          const i = index;
          const executor = executors[i];
          index += 1;

          try {
            const res = await executor.execute(ctx);
            records[i] = res;
          } catch (err) {
            records[i] = err;
          } finally {
            count += 1;
            if (index < executors.length) {
              thread();
            }
            if (count === executors.length) {
              resolve(records);
            }
          }
        };

        Array(parallel).fill(0).forEach(() => {
          thread();
        });
      });

      for (const result of results) {
        if (result instanceof Error) {
          throw result;
        }
      }
    });
  }

  // 创建一个互斥的执行器
  static Mutex(executor: Executor) {
    return new Executor(async (ctx) => {
      const release = await mutex.acquire();
      try {
        await executor.execute(ctx);
      } catch (err) {
        // todo
      } finally {
        release();
      }
    });
  }
}

export default Executor;
