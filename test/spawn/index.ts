// index.js

import { spawn } from 'child_process';

// console.log('__dirname', __dirname);

const child = spawn('node', ['test/spawn/child.ts']);

child.stdout.on('data', (chunk: Buffer) => {
  console.log('chunk', chunk.toString());
});

// child.on('exit', () => {
//   console.log('exit');
//   // console.log('data', data);
//   process.exit(0);
// });
