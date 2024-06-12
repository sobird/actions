import util from 'node:util';

export const sleep = util.promisify(setTimeout);
