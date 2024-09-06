import * as tar from 'tar';

import { readEntry } from './utils/tar';

const pack = tar.create({ portable: true, cwd: './test' }, ['']);

const gg = await readEntry(pack);
console.log('gg', gg);
