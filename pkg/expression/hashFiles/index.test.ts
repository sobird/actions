/* eslint-disable @typescript-eslint/naming-convention */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function hashFiles() {
  const env = {
    ...process.env,
    patterns: './package.json',
  };

  const result = spawnSync('node', [`${__dirname}/index.cjs`], { env, stdio: 'pipe' });

  const output = result.stderr.toString();
  const guard = '__OUTPUT__';
  const outstart = output.indexOf(guard);
  if (outstart !== -1) {
    const outstartAdjusted = outstart + guard.length;
    const outend = output.indexOf(guard, outstartAdjusted);
    if (outend !== -1) {
      const hash = output.slice(outstartAdjusted, outend);
      console.log('hash1212', hash);
      // resolve(hash);

      return hash;
    }
  }
}

const hash = hashFiles();
console.log('hash', hash);
