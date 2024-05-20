import log4js, { AppenderModule } from 'log4js';

log4js.addLayout('json', (config) => {
  console.log('config', config);
  return (logEvent) => {
    console.log('logEvent', logEvent);
    console.log('config.separator', config.separator);
    // return logEvent;
    return JSON.stringify({
      projectName: 'test',
      env: process.env.NODE_ENV || '',
      uid: logEvent.context.uid || '', // uid
      trace_id: logEvent.context.trace || '', // trace_id
      path: logEvent.context.path || '', // request path
      cost: logEvent.context.cost || '', // costtime
      // 里面有 startTime 等标识日志时间的字段
      ...logEvent,
    }) + config.separator;
  };
});
log4js.configure({
  appenders: {
    global: {
      type: 'dateFile',
      filename: 'logs/global',
      pattern: '.yyyy-MM-dd.log',
      alwaysIncludePattern: true,
      layout: {
        type: 'json',
        separator: '',
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

export const logger = log4js.getLogger();
logger.level = 'info';
logger.addContext('trace', 123);
logger.removeContext('trace');

logger.info('This is a log message using the custom appender.', 'dsds', { name: 'dddd' });
