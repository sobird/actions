import log4js, { LoggingEvent } from 'log4js';

export interface LogEntry extends LoggingEvent {
  context: {
    stage: string;
    raw_output: true;
    jobResult: string;
    stepResult: string;
    stepNumber: number;
  }
}

export interface LoggerHook {
  fire(entry: LogEntry): void;
}

export function WithLoggerHook(hook: LoggerHook, category: string) {
  log4js.configure({
    appenders: {
      console: {
        type: 'console',
      },
      hook: {
        type: {
          configure() {
            return (loggingEvent) => {
              hook.fire(loggingEvent);
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
