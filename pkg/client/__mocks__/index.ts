import { UpdateLogResponse } from '../runner/v1/messages_pb';

const mock = jest.fn().mockImplementation(() => {
  return {
    PingServiceClient: {
      ping: jest.fn(),
    },
    RunnerServiceClient: {
      register: jest.fn(),
      declare: jest.fn(),
      fetchTask: jest.fn(),
      updateTask: jest.fn(),
      updateLog: jest.fn((request) => {
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
