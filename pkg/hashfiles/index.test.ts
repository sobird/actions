/* eslint-disable @typescript-eslint/naming-convention */
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function hashFiles(...patterns: string[]) {
  const followSymlink = patterns[0] === '--follow-symbolic-links';
  if (followSymlink) {
    patterns.shift();
  }

  const env = {
    ...process.env,
    patterns: patterns.join('\n'),
  };

  const result = spawnSync('node', [`${__dirname}/dist/index.js`], { env, stdio: 'pipe' });

  const output = result.stderr.toString();
  const guard = '__OUTPUT__';
  const outstart = output.indexOf(guard);
  if (outstart !== -1) {
    const outstartAdjusted = outstart + guard.length;
    const outend = output.indexOf(guard, outstartAdjusted);
    if (outend !== -1) {
      const hash = output.slice(outstartAdjusted, outend);
      return hash;
    }
  }

  return '';
}

it.skip('Test hashFiles', () => {
  const hash = hashFiles('**/pnpm-lock.yaml');
  expect(hash.length).toBe(64);
});
