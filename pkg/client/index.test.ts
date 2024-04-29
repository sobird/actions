import { Timestamp } from '@bufbuild/protobuf';
import Client from './index';
import { UpdateLogRequest, LogRow } from './runner/v1/messages_pb';

vi.mock('./index');

const { RunnerServiceClient } = new Client('', '', false);

describe('RunnerServiceClient', () => {
  it('register', async () => {
    // 设置模拟行为
    (RunnerServiceClient.register as any).mockResolvedValue('register');

    // 断言模拟方法的返回值
    expect(RunnerServiceClient.register({}, {})).resolves.toEqual('register');

    // // 断言模拟方法被调用
    expect(RunnerServiceClient.register).toHaveBeenCalled();
  });

  it('updateLog', async () => {
    // 设置模拟行为
    // (RunnerServiceClient.updateLog as any).mockResolvedValue('register');

    const rows: LogRow[] = [
      new LogRow({
        content: 'content1',
        time: Timestamp.fromDate(new Date()),
      }),
    ];

    const request = new UpdateLogRequest({
      taskId: 123n,
      index: 4n,
      rows,
      noMore: false,
    });

    const updateLogResponse = RunnerServiceClient.updateLog(request);

    // 断言模拟方法的返回值
    expect(updateLogResponse).resolves.toEqual({
      ackIndex: request.index + BigInt(request.rows.length),
    });

    // // 断言模拟方法被调用
    expect(RunnerServiceClient.register).toHaveBeenCalled();
  });
});
