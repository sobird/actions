import log4js from 'log4js';

describe('log4js', () => {
// 断言模拟函数被调用
  it('logger.info', () => {
    const logger = log4js.getLogger();
    const mockLoggerInfo = vi.spyOn(logger, 'info');

    logger.info('This is a test log message');

    expect(mockLoggerInfo).toHaveBeenCalled();
  });
});
