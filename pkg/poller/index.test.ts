import { Client, Config } from '@/pkg';

import Poller from './index';

vi.mock('@/pkg/client');
vi.useFakeTimers();

const { RunnerServiceClient }: Client = new (Client as any)();

const config = Config.Load();
config.runner.fetchTimeout = 1000;

const poller = new Poller(RunnerServiceClient, config, '1.0.0');

beforeAll(async () => {
  // 启动 daemon 的命令或函数
});

describe('Test Poller', () => {
  it('poll', async () => {
    await poller.poll();

    await vi.waitFor(
      () => {
        // console.log('poller', poller);
      },
      {
        // timeout: 1000,
        interval: 3000, // default is 50
      },
    );

    // 任务运行完成后要清除
    // expect(poller.tasksVersion).toBe(BigInt(100));
  });
});
