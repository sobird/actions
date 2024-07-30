import log4js from 'log4js';

import { WithLoggerHook } from '@/pkg/common/logger';

export const logger2 = log4js.getLogger();

const logger = WithLoggerHook({
  fire(event) {
    console.log('event', event);
  },
}, 'Logger');
logger.level = log4js.levels.DEBUG;

logger.addContext('name', 'sobird');

logger.debug('A debug message with custom field', { customField: 'value' });
logger.error('error message');
