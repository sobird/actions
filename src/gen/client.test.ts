import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';

import { createClients } from './client';
import {
  UpdateLogRequestSchema,
  LogRow,
  LogRowSchema,
  RunnerSchema,
  RegisterResponseSchema,
} from './runner/v1/messages_pb';

vi.mock('./client');

const { runnerServiceClient, pingServiceClient } = createClients('http://localhost:3000/', '', false);

describe('PingServiceClient Test', () => {
  it('ping', async () => {
    const data = 'test';
    const res = await pingServiceClient.ping({
      data,
    });

    expect(res.data).toBe(`Hello, ${data}`);
  });
});

describe('RunnerServiceClient', () => {
  it('register', async () => {
    const mockResolvedValue = create(RegisterResponseSchema, {
      runner: create(RunnerSchema, {
        id: 1n,
        uuid: 'b274731d-976d-47f6-b4ca-0b5e358f815d',
        token: '158251cb53728b3d2d9777527b522a78420aed36',
        name: 'test',
        version: '0.0.1',
        labels: ['ubuntu-latest=gitea/runner-images:ubuntu-latest'],
      }),
    });
    vi.spyOn(runnerServiceClient, 'register').mockResolvedValue(mockResolvedValue);

    const { runner } = await runnerServiceClient.register({
      name: 'test',
      token: 'token',
      labels: [],
      version: '0.0.1',
    });

    // 断言模拟方法的返回值
    expect(runner?.token).not.toBeFalsy();

    // 断言模拟方法被调用
    expect(runnerServiceClient.register).toHaveBeenCalled();
  });

  it('updateLog', async () => {
    const rows: LogRow[] = [
      create(LogRowSchema, {
        content: 'content1',
        time: timestampFromDate(new Date()),
      }),
    ];

    const request = create(UpdateLogRequestSchema, {
      taskId: 123n,
      index: 4n,
      rows,
      noMore: false,
    });

    const updateLogResponse = await runnerServiceClient.updateLog(request);

    expect(updateLogResponse.ackIndex).toBe(request.index + BigInt(request.rows.length));

    // 断言模拟方法被调用
    // expect(runnerServiceClient.updateLog).toHaveBeenCalled();
  });
});
