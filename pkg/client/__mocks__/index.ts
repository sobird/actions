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
      updateLog: jest.fn(),
    },
  };
});

export default mock;
