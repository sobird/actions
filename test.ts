import fs from 'node:fs';
import readline from 'node:readline';

import * as tar from 'tar';

const fileEntry = await getEntry('package.json');

// const readStream = fs.createReadStream('test.ts');
// const dddd = fs.createWriteStream('test.bak');

// readStream.pipe(dddd);

// console.log('fileEntry', fileEntry);

const rl = readline.createInterface({
  input: fileEntry,
  output: process.stdout,
  // terminal: false,
});

fileEntry.resume();
rl.on('line', (line) => {
  console.log(line);
});

rl.on('close', () => {
  console.log('文件读取完成。');
});

async function getEntry(...filename: string[]): Promise<tar.ReadEntry> {
  const archive = tar.create({ }, filename);

  const extract = tar.t({ portable: true, noResume: true });
  archive.pipe(extract as NodeJS.WritableStream);

  return new Promise((resolve, reject) => {
    extract.on('entry', (entry: tar.ReadEntry) => {
      setTimeout(() => {
        entry.pause();
        resolve(entry);
      }, 100);
    });
    archive.on('error', (err) => {
      reject(err);
    });
  });
}
