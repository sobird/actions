import { spawn } from 'node:child_process';
import fs from 'node:fs';

const child = spawn('ls', [], {
  stdio: ['ignore', fs.createWriteStream('output.txt'), fs.createWriteStream('error.txt')],
});

child.on('data', (chunk: Buffer) => {
  console.log('chunk', chunk.toString());
});
