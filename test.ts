import fs from 'node:fs';

const stat = fs.statSync('test.ts');
const ss = new fs.Stats();
ss.blksize = 100;

const dd = new fs.Dirent();
console.log('dd', dd);
console.log('fs', ss);
console.log('stat', stat);
