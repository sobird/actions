import log4js, { AppenderModule } from 'log4js';

// log4js.addLayout('reporter', (ee): any => {
//   console.log('first', ee);

//   return ee;
// });

// log4js.configure({
//   appenders: {
//     reporter: {
//       type: {
//         configure() {
//           return (...message) => {
//             console.log('message', message);
//           };
//         },
//       },
//       layout: 'reporter',
//     },
//   },
//   categories: {
//     default: {
//       appenders: ['reporter'],
//       level: 'info',
//     },
//   },
// });

log4js.addLayout('json', (config) => {
  return function (logEvent) {
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
      type: {
        configure(...args) {
          console.log('args', args);
          return (...message) => {
            console.log('message', message);
          };
        },
      },
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
      level: 'debug',
    },
  },
});

const logger = log4js.getLogger();
// logger.addContext('trace', 123);
logger.error('This is a log message using the custom appender.', 'dsds', { name: 'dddd' });
