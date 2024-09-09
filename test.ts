import path from 'node:path';

const p = path.posix.resolve('C:\\Users\\Example\\Documents');
console.log('path.posix.delimiter', path.delimiter, path.win32.delimiter, path.win32.sep);
