import { Client, Config, Runner } from '@/pkg';
import { Task } from '@/pkg/client/runner/v1/messages_pb';

import Poller from './index';

vi.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);
const runner = new Runner(
  RunnerServiceClient,
  Config.loadDefault(),
);
const poller = new Poller(RunnerServiceClient, runner, Config.loadDefault());

describe('Runner', () => {
  it('poll', async () => {
    await poller.poll();
    // 任务运行完成后要清除
    expect(poller.tasksVersion).toBe(BigInt(100));
  });
});
