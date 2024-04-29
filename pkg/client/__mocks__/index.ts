import { UpdateLogResponse, DeclareResponse, Runner } from '../runner/v1/messages_pb';

const mock = vi.fn().mockImplementation(() => {
  return {
    PingServiceClient: {
      ping: vi.fn(),
    },
    RunnerServiceClient: {
      register: vi.fn(),
      declare: vi.fn().mockResolvedValue(new DeclareResponse({
        runner: new Runner(),
      })),
      fetchTask: vi.fn(),
      updateTask: vi.fn(),
      updateLog: vi.fn((request) => {
        return new Promise((resolve) => {
          resolve(new UpdateLogResponse({
            ackIndex: request.index + BigInt(request.rows.length),
          }));
        });
      }),
    },
  };
});

export default mock;
