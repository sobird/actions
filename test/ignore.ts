import fs from 'node:fs';
import path from 'node:path';

import ignore from 'ignore';

const ig = ignore().add(fs.readFileSync('.gitignore').toString());
console.log('ignores', ig.ignores('.github/actions/hello-world-javascript-action/node_modules/@actions'));

const ff = ig.createFilter();
console.log('ig', ff('logs1/test'));

const relPath = path.relative('/Users/sobird/mix/', '/Users/sobird/mix/package.json');
console.log('relPath', relPath, path.join('/Users/sobird/mix/', './package.json'));
