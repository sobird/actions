import fs from 'node:fs';
import path from 'node:path';

import { globSync } from 'glob';

export function readIgnoreSync(dir: string, ignoreName: string = '.gitignore') {
  const file = path.join(dir, ignoreName);
  const patterns = [];
  try {
    const content = fs.readFileSync(file, 'utf8');
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
  return globSync(patterns);
}
