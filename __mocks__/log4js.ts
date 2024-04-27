import log4js, { LoggingEvent } from 'log4js';

const { getLogger } = log4js;

let Log: LoggingEvent;

log4js.configure({
  appenders: {
    global: {
      type: {
        configure() {
          return (message) => {
            Log = message;
          };
        },
      },
    },
  },
  categories: {
    default: {
      appenders: ['global'],
      level: 'info',
    },
  },
});

log4js.getLogger = ((category?: string) => {
  const result = getLogger.bind(log4js)(category);
  const { info } = result;
  result.info = (message, ...args: string[]) => {
    info.bind(result)(message, ...args);
    return Log;
  };

  return result;
}) as any;

export default log4js;
