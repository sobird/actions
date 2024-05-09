import { Client, Config, Runner } from '@/pkg';

import Poller from './index';
import { fetchTaskResponse } from '../client/__mocks__';

vi.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);
const config = Config.loadDefault();
config.runner.fetchTimeout = 1000;

const runner = new Runner(RunnerServiceClient, config);
const poller = new Poller(RunnerServiceClient, runner, config);

function asyncOperation(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Operation completed after ${ms} ms`);
    }, ms);
  });
}

// mock timeout
vi.spyOn(RunnerServiceClient, 'fetchTask').mockImplementation(async () => {
  await asyncOperation(1200);
  return fetchTaskResponse;
});

beforeAll(async () => {
  // 启动 daemon 的命令或函数

});
describe('Test Poller', () => {
  it('poll', async () => {
    await poller.poll();
    // 任务运行完成后要清除
    expect(poller.tasksVersion).toBe(BigInt(100));
  });
});
