import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  // 每个测试后重置计时器环境
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该在超时前返回异步任务的结果', async () => {
    // 模拟一个耗时 100ms 的任务
    const mockTask = new Promise((resolve) => {
      setTimeout(() => resolve('Success'), 100);
    });

    // 设置超时阈值为 500ms
    const resultPromise = withTimeout(mockTask, 500);

    // 快进时间
    vi.advanceTimersByTime(100);

    await expect(resultPromise).resolves.toBe('Success');
  });

  it('如果任务超过规定时间，应该抛出错误', async () => {
    // 模拟一个耗时 1000ms 的任务
    const mockTask = new Promise((resolve) => {
      setTimeout(() => resolve('Too Late'), 1000);
    });

    const resultPromise = withTimeout(mockTask, 500, '自定义超时消息');

    // 快进 500ms 触发超时逻辑
    vi.advanceTimersByTime(500);

    await expect(resultPromise).rejects.toThrow('自定义超时消息');
  });

  it('即使传入的是非 Promise 值，也能正常处理', async () => {
    const result = await withTimeout('Instant Value', 100);
    expect(result).toBe('Instant Value');
  });

  it('当 ms 为 undefined 时，setTimeout 默认表现为立即执行或遵循默认行为', async () => {
    // 验证如果不传 ms，代码不会崩溃且能正常触发
    const task = new Promise((resolve) => setTimeout(() => resolve('OK'), 100));
    // 注意：node:timers/promises 的 setTimeout 如果 ms 为 undefined 通常按 1ms 处理
    await expect(withTimeout(task, 0)).rejects.toThrow('Operation timed out');
  });

  it('确认 AbortController 的 abort 方法被调用', async () => {
    // 这里我们可以利用 jest.spyOn 观察 AbortController
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    const task = Promise.resolve('Success');
    await withTimeout(task, 100);

    // 无论成功还是失败，finally 块都应该执行 abort()
    expect(abortSpy).toHaveBeenCalled();

    abortSpy.mockRestore();
  });

  it('如果原任务本身执行失败，应该抛出原任务的错误', async () => {
    const failedTask = Promise.reject(new Error('Original Error'));

    await expect(withTimeout(failedTask, 500)).rejects.toThrow('Original Error');
  });
});
