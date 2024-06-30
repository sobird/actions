import fs from 'node:fs';

import { globSync } from 'glob';

function readIgnoreFile(filePath: string) {
  const patterns = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const s = line.trim();
      if (s && !s.startsWith('#')) {
        patterns.push(s);
      }
    }
  } catch (err) {
    // if (err.code !== 'ENOENT') {
    //   throw err;
    // }
  }
  return patterns;
}

const patterns = readIgnoreFile('.gitignore');
console.log('patterns', patterns);

const files = globSync(patterns);
console.log('files', files);
