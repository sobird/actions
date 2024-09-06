import path from 'node:path';

console.log('path.', path.posix.join('home/sobird/').trimEnd('/'));
console.log(path.posix.resolve('/foo', 'bar/', 'baz/'));
