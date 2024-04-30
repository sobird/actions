import util from 'util';

import ip from 'ip';
import log4js, { AppenderModule } from 'log4js';

log4js.addLayout('json', (config) => {
  return function (logEvent) {
    console.log('logEvent', logEvent);
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
    }, 0) + config.separator;
  };
});
log4js.configure({
  appenders: {
    global: {
      type: 'console',
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

log4js.addLayout('json', (config) => {
  return function (logEvent) {
    console.log('logEvent', logEvent);
    // return JSON.stringify({
    //   projectName: 'test',
    //   env: process.env.NODE_ENV || '',
    //   uid: logEvent.context.uid || '', // uid
    //   trace_id: logEvent.context.trace || '', // trace_id
    //   path: logEvent.context.path || '', // request path
    //   cost: logEvent.context.cost || '', // costtime
    //   // 里面有 startTime 等标识日志时间的字段
    //   ...logEvent,
    // }, 0) + config.separator;
  };
});
const logger = log4js.getLogger();
logger.level = 'info';
logger.addContext('trace', 123);

logger.info('This is a log message using the custom appender.', 'dsds', { name: 'dddd' });

console.log('ip', ip.address());

function formatId(id) {
  return util.format('%02x', id % 0xff);
}

const id = 333;
console.log(formatId(id)); // 输出: "0f"
