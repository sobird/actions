import log4js, { AppenderModule } from 'log4js';

export function WithLoggerHook(hook: any, category: string) {
  log4js.configure({
    appenders: {
      console: {
        type: 'console',
      },
      hook: {
        type: {
          configure() {
            return (loggingEvent) => {
              console.log('loggingEvent', loggingEvent);
            };
          },
        },
      },
    },
    categories: {
      default: {
        appenders: ['console'],
        level: 'debug',
      },
      [category]: {
        appenders: ['console', 'hook'],
        level: 'info',
      },
    },
  });

  return log4js.getLogger(category);
}

const logger = WithLoggerHook('', 'Reporter');
logger.addContext('abc', 123);
logger.info('dddd');
