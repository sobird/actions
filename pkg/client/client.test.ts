// // Client.test.ts
// import Client from '.';

// // 创建 Client 类的模拟
// const mockClient = {
//   Address: jest.fn(),
//   Declare: jest.fn(),
//   FetchTask: jest.fn(),
//   // ... 其他方法的模拟 ...
// };

// // 模拟 Client 类的默认导出
// jest.mock('./Client', () => {
//   return {
//     default: jest.fn().mockImplementation(() => { return mockClient; }),
//   };
// });

// describe('Client tests', () => {
//   test('Client methods are mocked', async () => {
//     // 设置模拟行为
//     (Client as any).default()().Address.mockReturnValue('mock-address');
//     (Client as any).default()().Declare.mockResolvedValue({ response: {}, error: null });
//     (Client as any).default()().FetchTask.mockResolvedValue({ response: {}, error: null });

//     // 创建 Client 实例
//     const client = new Client();

//     // 断言模拟方法的返回值
//     expect(await client.Address()).toBe('mock-address');
//     expect(await client.Declare({}, {})).resolves.toEqual({ response: {}, error: null });
//     expect(await client.FetchTask({}, {})).resolves.toEqual({ response: {}, error: null });

//     // 断言模拟方法被调用
//     expect((Client as any).default()().Address).toHaveBeenCalled();
//     expect((Client as any).default()().Declare).toHaveBeenCalled();
//     expect((Client as any).default()().FetchTask).toHaveBeenCalled();
//   });
// });
