import log4js from 'log4js';

import { logger2 } from './log4js';

export const logger = log4js.getLogger();

console.log(logger2);
console.log(logger);
