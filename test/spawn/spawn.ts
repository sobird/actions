import { spawn } from 'child_process';
import fs from 'fs';

const child = spawn('ls', [], {
  stdio: ['ignore', fs.createWriteStream('output.txt'), fs.createWriteStream('error.txt')],
});
