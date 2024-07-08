import os from 'node:os';
import util from 'node:util';

process.stdout.on('drain', (data) => {
  console.log('first', data);
});

const message = util.format('Hello, %s! You are %d years old.', 'Alice', 30);

process.stdin.write(message + os.EOL);
process.stdout.write(message + os.EOL);
