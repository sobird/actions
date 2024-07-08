import os from 'node:os';
import util from 'node:util';

process.stdout.on('data', (data) => {
  console.log('first', data);
});

const message = util.format('Hello, %s! You are %d years old.', 'Alice', 30);
console.log(message); // 输出: Hello, Alice! You are 30 years old.

process.stdout.write(message + os.EOL);
