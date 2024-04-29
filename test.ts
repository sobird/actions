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

const workflow = `name: Gitea Actions Test
"on": [push]
jobs:
    Explore-Gitea-Actions:
        name: Explore-Gitea-Actions
        runs-on: ubuntu-latest
        steps:
            - run: echo "  The job was automatically triggered by a \${{ github.event_name }} event."
            - run: echo "  This job is now running on a \${{ runner.os }} server hosted by Gitea!"
            - run: echo "  The name of your branch is \${{ github.ref }} and your repository is \${{ github.repository }}."
            - name: Check out repository code
              uses: actions/checkout@v3
            - run: echo "  The \${{ github.repository }} repository has been cloned to the runner."
            - run: echo " ️ The workflow is now ready to test your code on the runner."
            - name: List files in the repository
              run: |
                ls \${{ github.workspace }}
            - run: echo "  This job's status is \${{ job.status }}."`;

const buffer = Buffer.from(workflow);

console.log(buffer.toString());
