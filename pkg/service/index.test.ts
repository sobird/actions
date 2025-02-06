import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';

import Client from './index';
import {
  UpdateLogRequestSchema, LogRow, LogRowSchema, RunnerSchema, RegisterResponseSchema,
} from './runner/v1/messages_pb';

// vi.mock('./index');

const { RunnerServiceClient, PingServiceClient } = new Client('http://localhost:3000/', '', false);

describe('PingServiceClient Test', () => {
  it('ping', async () => {
    const data = 'test';
    const res = await PingServiceClient.ping({
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
        labels: [
          'ubuntu-latest=gitea/runner-images:ubuntu-latest',
        ],
      }),
    });
    vi.spyOn(RunnerServiceClient, 'register').mockResolvedValue(mockResolvedValue);

    const { runner } = await RunnerServiceClient.register({
      name: 'test',
      token: 'token',
      labels: [],
      version: '0.0.1',
    });

    console.log('runner', runner);

    // 断言模拟方法的返回值
    // expect(RunnerServiceClient.register({}, {})).resolves.toEqual('register');

    // 断言模拟方法被调用
    expect(RunnerServiceClient.register).toHaveBeenCalled();
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

    const updateLogResponse = await RunnerServiceClient.updateLog(request);

    expect(updateLogResponse.ackIndex).toBe(request.index + BigInt(request.rows.length));

    // 断言模拟方法被调用
    // expect(RunnerServiceClient.updateLog).toHaveBeenCalled();
  });
});
