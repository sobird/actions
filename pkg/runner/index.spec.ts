import { Config } from '@/pkg';
import { Task } from '@/pkg/client/runner/v1/messages_pb';

import { fetchTaskResponse } from './__mocks__/fetchTaskResponse';
import Runner from './index';
import Client from '../client';

vi.mock('../client');

const { RunnerServiceClient } = new Client('', '', false);
const runner = new Runner(RunnerServiceClient, Config.loadDefault());

describe('Runner', () => {
  it('run', async () => {
    await runner.run(fetchTaskResponse.task);
    // 任务运行完成后要清除
    expect(runner.runningTasks.size).toBe(0);
  });

  it('declare', async () => {
    await runner.declare([]);
    expect(RunnerServiceClient.declare).toHaveBeenCalled();
  });
});
