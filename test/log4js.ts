import log4js from 'log4js';

import { WithLoggerHook } from '@/pkg/common/logger';

const logger = WithLoggerHook({
  fire(event) {
    console.log('event', event);
  },
}, 'test');
logger.level = log4js.levels.DEBUG;

logger.addContext('name', 'sobird');

logger.debug('A debug message with custom field', { customField: 'value' });
logger.error('error message');
