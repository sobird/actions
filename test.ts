import path from 'node:path';

const p = path.posix.resolve('C:\\Users\\Example\\Documents');
console.log(path.isAbsolute('/source/directory:/destination/directory'));
