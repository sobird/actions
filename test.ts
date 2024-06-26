import glob from '@actions/glob';

import functions from '@/pkg/expression/functions';

const hash1 = await glob.hashFiles('package.json');

const hash2 = await functions.hashFiles('package.json');

console.log('hash', hash1, hash2);
