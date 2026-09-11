/**
 * Reporter unit test
 *
 * sobird<i@sobird.me> at 2024/04/26 18:18:27 created.
 */

import Client from '../gen';
import Reporter from './index';

vi.mock('../gen');

import { create } from '@bufbuild/protobuf';

import { type LogEntry } from '@/common/logger';
import { UpdateLogResponseSchema } from '@/gen/runner/v1/messages_pb';

const { RunnerServiceClient } = new Client('', '', false);
const { task } = await RunnerServiceClient.fetchTask({
  tasksVersion: 123n,
});

describe('Reporter', () => {
  // fire
  describe('fire', () => {
    const reporter = new Reporter(RunnerServiceClient, task);
    it('test fire', () => {
      const context = {
        stage: 'Main',
        stepNumber: '2',
        verbatim: true,
      };
      const tests = [
        {
          message: 'regular log line',
        },
        {
          message: '::debug::debug log line',
        },
        {
          message: 'regular log line',
        },
        {
          message: '::debug::debug log line',
        },
        {
          message: '::debug::debug log line',
        },
        {
          message: 'regular log line',
        },
      ];
      const stepNumber = 2;

      reporter.resetSteps(5);

      tests.forEach((item) => {
        expect(() => {
          reporter.fire({
            timestamp: new Date().toDateString(),
            level: 'debug',
            message: item.message,
            ...context,
          });
        }).not.toThrow();
        // 断言模拟方法被调用
        // expect(RunnerServiceClient.updateLog).toHaveBeenCalled();
        // expect(RunnerServiceClient.updateTask).toHaveBeenCalled();
      });

      // @ts-expect-error
      expect(reporter.state.steps[stepNumber].logLength).toBe(BigInt(6));
    });
  });

  describe('setOutputs', () => {
    const reporter = new Reporter(RunnerServiceClient, task);
    it('outputs: key > 255', () => {
      const outputs = new Map();
      const key = Array(64).fill('test').join('');
      outputs.set(key, 'value1');
      reporter.setOutputs(outputs);
      expect((reporter as any).outputs.size).toBe(0);
    });

    it('outputs: value > 1024 * 1024', () => {
      const outputs = new Map();
      const value = Array(1024 * 1024 + 1)
        .fill('1')
        .join('');
      outputs.set('key', value);
      reporter.setOutputs(outputs);
      expect((reporter as any).outputs.size).toBe(0);
    });

    it('outputs: normal', () => {
      const outputs = new Map();
      outputs.set('key', 'value');
      outputs.set('key1', 'value2');
      reporter.setOutputs(outputs);
      expect((reporter as any).outputs.size).toBe(2);
    });
  });

  const reporter = new Reporter(RunnerServiceClient, task);
  const logEntry: LogEntry = {
    timestamp: new Date().toDateString(),
    level: 'debug',
    message: 'test',
  };
  reporter.fire(logEntry);

  it('test reportLog', async () => {
    // 服务端只 ack 部分行时,noMore=true 关闭上报应抛错以触发重试
    vi.mocked(RunnerServiceClient.updateLog).mockResolvedValueOnce(
      create(UpdateLogResponseSchema, { ackIndex: BigInt(0) }),
    );
    await expect(reporter.reportLog(true)).rejects.toThrow('Not all logs are submitted');

    // 服务端全量 ack 时正常返回
    await expect(reporter.reportLog(false)).resolves.not.toThrow();
    expect(RunnerServiceClient.updateLog).toHaveBeenCalled();
  });

  it('test reportState', async () => {
    await expect(reporter.reportState()).resolves.not.toThrow();
    expect(RunnerServiceClient.updateTask).toHaveBeenCalled();
  });

  it('test runDaemon', async () => {
    await expect(reporter.runDaemon()).resolves.not.toThrow();
    expect(RunnerServiceClient.updateTask).toHaveBeenCalled();
    expect(RunnerServiceClient.updateLog).toHaveBeenCalled();
  });
});
