/**
 * executor test
 *
 * sobird<i@sobird.me> at 2024/05/04 23:43:52 created.
 */

import { asyncFunction } from '@/utils';

import Executor, { Conditional } from './executor';

describe('Test Conditional', () => {
  it('evaluate() return true test case', () => {
    const result = new Conditional(() => {
      return true;
    }).evaluate();
    expect(result).toBeTruthy();
  });

  it('evaluate() return true false case', async () => {
    const result = new Conditional(async () => {
      return false;
    }).evaluate();
    expect(await result).toBeFalsy();
  });

  it('not() return true test case', async () => {
    const result = await new Conditional(async () => {
      await asyncFunction();
      return true;
    }).not().evaluate();
    expect(result).toBeFalsy();
  });

  it('not() return false test case', async () => {
    const result = await new Conditional(() => {
      return false;
    }).not().evaluate();
    expect(result).toBeTruthy();
  });
});

describe('Test Static Method', () => {
  it('Empty Pipeline', async () => {
    const emptyWorkflow = Executor.Pipeline();
    await expect(emptyWorkflow.execute()).resolves.not.toThrow();
  });

  it('Error Executor', async () => {
    const emptyWorkflow = Executor.Error('error 123');
    await expect(emptyWorkflow.execute()).rejects.toBe('error 123');
  });

  it('multiple success case', async () => {
    let runcount = 0;
    const successWorkflow = Executor.Pipeline(new Executor(() => {
      runcount += 1;
    }), new Executor(() => {
      runcount += 1;
    }));

    await expect(successWorkflow.execute()).resolves.not.toThrow();
    expect(runcount).toBe(2);
  });
});

describe('Test Member Method', () => {
  it('Then Executor: return true', async () => {
    let trueCount = 0;
    // 链式调佣，支持异步
    await new Executor(() => {
      trueCount += 1;
    }).next(new Executor(async () => {
      await asyncFunction();
      trueCount += 1;
    })).next(new Executor(() => {
      trueCount += 1;
    })).execute();

    expect(trueCount).toBe(3);
  });

  it('If Executor: return true', async () => {
    let trueCount = 0;
    await new Executor(() => {
      trueCount += 1;
    }).if(new Conditional(() => {
      return true;
    })).execute();
    expect(trueCount).toBe(1);
  });

  it('If Executor: return false', async () => {
    let falseCount = 0;
    await new Executor(() => {
      falseCount += 1;
    }).if(new Conditional(async () => {
      return false;
    })).execute();
    expect(falseCount).toBe(0);
  });

  it('Multi If Executor: final return false', async () => {
    let falseCount = 0;
    await new Executor(() => {
      falseCount += 1;
    }).if(new Conditional(async () => {
      return true;
    })).if(new Conditional(async () => {
      return true;
    })).if(new Conditional(async () => {
      return false;
    }))
      .execute();
    expect(falseCount).toBe(0);
  });

  it('IfNot Executor: not true', async () => {
    let falseCount = 0;
    await new Executor(() => {
      falseCount += 1;
    }).ifNot(new Conditional(async () => {
      return true;
    })).execute();
    expect(falseCount).toBe(0);
  });

  it('IfBoolean Executor: true', async () => {
    let count = 0;
    await new Executor(() => {
      count += 1;
    }).ifBool(true).execute();
    expect(count).toBe(1);
  });

  it('IfBoolean Executor: false', async () => {
    let count = 0;
    await new Executor(() => {
      count += 1;
    }).ifBool(false).execute();
    expect(count).toBe(0);
  });
});

describe('Test Conditional Executor', () => {
  it('Conditional Executor: return true case', async () => {
    let trueCount = 0;
    let falseCount = 0;
    const conditionalExecutor = Executor.Conditional(new Conditional(() => {
      return true;
    }), new Executor(() => {
      trueCount += 1;
    }), new Executor(() => {
      falseCount += 1;
    }));
    await expect(conditionalExecutor.execute()).resolves.not.toThrow();
    expect(trueCount).toBe(1);
    expect(falseCount).toBe(0);
  });

  it('Conditional Executor: return false case', async () => {
    let trueCount = 0;
    let falseCount = 0;
    const conditionalExecutor = Executor.Conditional(new Conditional(async () => {
      return false;
    }), new Executor(() => {
      trueCount += 1;
    }), new Executor(() => {
      falseCount += 1;
    }));
    await expect(conditionalExecutor.execute()).resolves.not.toThrow();
    expect(trueCount).toBe(0);
    expect(falseCount).toBe(1);
  });

  it('Conditional Executor: return false string case', async () => {
    let trueCount = 0;
    let falseCount = 0;
    const conditionalExecutor = Executor.Conditional(new Conditional(async () => {
      return Boolean('false');
    }), new Executor(() => {
      trueCount += 1;
    }), new Executor(() => {
      falseCount += 1;
    }));
    await expect(conditionalExecutor.execute()).resolves.not.toThrow();
    expect(trueCount).toBe(1);
    expect(falseCount).toBe(0);
  });
});

describe('Parallel Executor', () => {
  it('should run at most 2 executors in parallel', async () => {
    let count = 0;
    let activeCount = 0;
    let maxCount = 0;
    const executor = new Executor(async () => {
      count += 1;
      activeCount += 1;
      if (activeCount > maxCount) {
        maxCount = activeCount;
      }

      await asyncFunction(100);
      activeCount -= 1;
    });

    await Executor.Parallel(2, executor, executor, executor, executor).execute();
    expect(count).toBe(4);
    expect(maxCount).toBe(2);
  });

  it('should run at most 1 executors in parallel', async () => {
    let count = 0;
    let activeCount = 0;
    let maxCount = 0;
    const executor = new Executor(async () => {
      count += 1;
      activeCount += 1;
      if (activeCount > maxCount) {
        maxCount = activeCount;
      }

      await asyncFunction(100);
      activeCount -= 1;
    });

    await Executor.Parallel(0, executor, executor, executor).execute();
    expect(count).toBe(3);
    expect(maxCount).toBe(1);
  });

  it('should run at empty executors array', async () => {
    const count = 0;
    // const activeCount = 0;
    const maxCount = 0;
    // const executor = new Executor(async () => {
    //   count += 1;
    //   activeCount += 1;
    //   if (activeCount > maxCount) {
    //     maxCount = activeCount;
    //   }

    //   await asyncFunction();
    //   activeCount -= 1;
    // });

    await Executor.Parallel(1).execute();
    expect(count).toBe(0);
    expect(maxCount).toBe(0);
  });
});

describe('Mutex Executor', () => {
  it('should complete executor', async () => {
    let count = 0;
    const executor = new Executor(async () => {
      count += 1;
    });

    const mutexExecutor = Executor.Mutex(executor);
    await mutexExecutor.execute();
    expect(count).toBe(1);
  });

  it('should acquire and release the mutex lock', async () => {
    let count = 0;
    let activeCount = 0;
    let maxCount = 0;
    const executor = new Executor(async () => {
      count += 1;
      activeCount += 1;
      if (activeCount > maxCount) {
        maxCount = activeCount;
      }

      await asyncFunction(100);
      activeCount -= 1;
    });

    const mutexExecutor = Executor.Mutex(executor);

    await Executor.Parallel(3, mutexExecutor, mutexExecutor, mutexExecutor, mutexExecutor).execute();
    expect(count).toBe(4);
    // 即便并行运行mutexExecutor，也会按顺序一个一个执行
    expect(maxCount).toBe(1);
  });
});

describe('Compose Executor', () => {
  it('should complete executor', async () => {
    let count = 0;
    const executor = new Executor(async (ctx, next) => {
      count += 1;
      console.log('pre', count);
      await next?.();
      count += 1;
      console.log('post', count);
    });

    const composeExecutor = Executor.Compose(executor, executor);
    await composeExecutor.execute();
    expect(count).toBe(4);
  });
});
