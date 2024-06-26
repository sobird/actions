import { exec } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function hashFiles() {
  const env = {
    ...process.env,
    patterns: './package.json',
  };

  const command = `node ${__dirname}/index.cjs`;

  return new Promise((resolve) => {
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) throw error;
      const output = `${stdout}\n${stderr}`;
      const guard = '__OUTPUT__';
      const outstart = output.indexOf(guard);
      if (outstart !== -1) {
        const outstartAdjusted = outstart + guard.length;
        const outend = output.indexOf(guard, outstartAdjusted);
        if (outend !== -1) {
          const hash = output.slice(outstartAdjusted, outend);
          console.log('hash', hash);
          resolve(hash);
        }
      }
    });
  });
}

const hash = await hashFiles();
console.log('hash', hash);
