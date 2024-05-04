/**
 * executor test
 *
 * sobird<i@sobird.me> at 2024/05/04 23:43:52 created.
 */

import Executor, { Conditional } from './executor';

function asyncFunction() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('两秒后执行');
    }, 1000);
  });
}

describe('Test Static Method', () => {
  it('Empty Pipeline', async () => {
    const emptyWorkflow = Executor.pipeline();
    await expect(emptyWorkflow.execute()).resolves.not.toThrow();
  });

  it('Error Executor', async () => {
    const emptyWorkflow = Executor.error('error 123');
    await expect(emptyWorkflow.execute()).rejects.toBe('error 123');
  });

  it('multiple success case', async () => {
    let runcount = 0;
    const successWorkflow = Executor.pipeline(new Executor(() => {
      runcount += 1;
    }), new Executor(() => {
      runcount += 1;
    }));

    await expect(successWorkflow.execute()).resolves.not.toThrow();
    expect(runcount).toBe(2);
  });
});

describe('Test Conditional Executor', () => {
  it('Conditional Executor: return true case', async () => {
    let trueCount = 0;
    let falseCount = 0;
    const conditionalExecutor = Executor.conditional(new Conditional(() => {
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
    const conditionalExecutor = Executor.conditional(new Conditional(() => {
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
    const conditionalExecutor = Executor.conditional(new Conditional(() => {
      return !!'false';
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

      await asyncFunction();
      activeCount -= 1;
    });

    await Executor.parallel(2, executor, executor, executor, executor).execute();
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

      await asyncFunction();
      activeCount -= 1;
    });

    await Executor.parallel(0, executor, executor, executor).execute();
    expect(count).toBe(3);
    expect(maxCount).toBe(1);
  });
});
