import Client from './index';

jest.mock('./index');

// // 创建 Client 类的模拟
// const mockClient = {
//   Address: jest.fn(),
//   Declare: jest.fn(),
//   FetchTask: jest.fn(),
//   // ... 其他方法的模拟 ...
// };

// // 模拟 Client 类的默认导出
// jest.mock('.', () => {
//   return jest.fn().mockImplementation(() => { return mockClient; });
// });

const { RunnerServiceClient } = new Client('', '', false);

describe('Client', () => {
  test('Client methods are mocked', async () => {
    // 设置模拟行为
    (RunnerServiceClient.register as any).mockResolvedValue('register');

    // 断言模拟方法的返回值
    expect(RunnerServiceClient.register({}, {})).resolves.toEqual('register');

    // // 断言模拟方法被调用
    expect(RunnerServiceClient.register).toHaveBeenCalled();
  });
});
