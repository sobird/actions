import log4js from 'log4js';

describe('log4js', () => {
// 断言模拟函数被调用
  it('logger.log', () => {
    // myFunction();

    const rest = (log4js as any)('This is a test log message');
    console.log('getLoggingEvent', rest);

    // expect(mockLogger).toHaveBeenCalled();

    // expect(() => {
    //   throw Error('eee');
    // }).toThrow();
  });
});
